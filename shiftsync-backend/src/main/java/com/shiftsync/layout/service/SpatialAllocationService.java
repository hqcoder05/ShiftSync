package com.shiftsync.layout.service;

import com.shiftsync.layout.dto.SpatialAllocationResultDto;
import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpatialAllocationService {

    private final StoreZoneRepository storeZoneRepository;
    private final StoreLayoutRepository storeLayoutRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final com.shiftsync.skill.repository.SkillRepository skillRepository;

    /**
     * Backward-compatible overload without storeId check (resolves storeId from shift).
     */
    @Transactional(rollbackFor = Exception.class)
    public SpatialAllocationResultDto allocateZonesForShift(UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));
        return allocateZonesForShift(shift.getStore().getId(), shiftId);
    }

    /**
     * Thuật toán 3D Greedy Max-Min Dispersion với kiểm tra quyền Store (Chống IDOR),
     * bảo toàn ràng buộc cứng sức chứa (Hard Capacity Constraint),
     * và tính lũy đẳng (Idempotency).
     */
    @Transactional(rollbackFor = Exception.class)
    public SpatialAllocationResultDto allocateZonesForShift(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        // 1. Security / IDOR Prevention: Shift must belong to the requested store
        if (storeId != null && !shift.getStore().getId().equals(storeId)) {
            throw new BusinessException("Shift does not belong to the requested store", HttpStatus.FORBIDDEN);
        }

        List<StoreZone> allZones = storeZoneRepository.findByStoreId(shift.getStore().getId());
        if (allZones.isEmpty()) {
            throw new BusinessException("No 3D zones configured for this store", HttpStatus.BAD_REQUEST);
        }

        // Sort zones deterministically by ID to guarantee 100% deterministic tie-breaking
        allZones.sort(Comparator.comparing(StoreZone::getId));

        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShiftId(shiftId);
        if (assignments.isEmpty()) {
            List<SpatialAllocationResultDto.ZoneOccupancyDetailDto> unoccupied = allZones.stream()
                    .map(z -> mapToZoneDetail(z, 0))
                    .collect(Collectors.toList());

            return SpatialAllocationResultDto.builder()
                    .shiftId(shiftId)
                    .storeId(shift.getStore().getId())
                    .status("NO_STAFF")
                    .message("No employees currently assigned to this shift")
                    .totalAssignedStaff(0)
                    .allocatedStaffCount(0)
                    .unallocatedStaffCount(0)
                    .totalZonesCount(allZones.size())
                    .occupiedZonesCount(0)
                    .unoccupiedZonesCount(allZones.size())
                    .occupiedZones(Collections.emptyList())
                    .unoccupiedZones(unoccupied)
                    .build();
        }

        StoreLayout layout = storeLayoutRepository.findByStoreId(shift.getStore().getId()).orElse(null);
        Double centerX = layout != null ? layout.getLength() / 2 : 0.0;
        Double centerY = layout != null ? layout.getWidth() / 2 : 0.0;
        Double centerZ = layout != null ? layout.getHeight() / 2 : 0.0;

        // Clone the capacities so we can decrement them as we assign
        List<ZoneCandidate> candidates = allZones.stream()
                .map(z -> new ZoneCandidate(z, z.getCapacity()))
                .collect(Collectors.toList());

        List<StoreZone> selectedZones = new ArrayList<>();
        int allocatedCount = 0;
        int unallocatedCount = 0;

        Map<UUID, String> skillNameMap = shift.getRequirements() != null
                ? shift.getRequirements().stream()
                        .filter(r -> r.getSkill() != null)
                        .collect(Collectors.toMap(r -> r.getSkill().getId(), r -> r.getSkill().getName(), (k1, k2) -> k1))
                : Collections.emptyMap();

        for (ShiftAssignment assignment : assignments) {
            StoreZone chosenZone = null;

            // 1. First priority: Allocate to zone corresponding to assigned skill/role
            if (assignment.getRequiredSkillId() != null) {
                String skillName = skillNameMap.get(assignment.getRequiredSkillId());
                if (skillName == null && skillRepository != null) {
                    try {
                        skillName = skillRepository.findById(assignment.getRequiredSkillId())
                                .map(com.shiftsync.skill.entity.Skill::getName)
                                .orElse(null);
                    } catch (Exception ignored) {}
                }
                if (skillName != null) {
                    chosenZone = findMatchingZoneForSkill(skillName, candidates);
                }
            }

            // 2. Second priority / Fallback: Max-Min geometric dispersion across available zones
            if (chosenZone == null) {
                chosenZone = selectBestZoneMaxMinDispersion(candidates, selectedZones, centerX, centerY, centerZ);
            }
            
            if (chosenZone != null) {
                assignment.setZone(chosenZone);
                selectedZones.add(chosenZone);
                allocatedCount++;

                // Decrement available capacity
                final UUID chosenId = chosenZone.getId();
                candidates.stream()
                        .filter(c -> c.zone.getId().equals(chosenId))
                        .findFirst()
                        .ifPresent(c -> c.availableCapacity--);
            } else {
                // Hard constraint: Zone capacity strictly respected, DO NOT silently overbook
                assignment.setZone(null);
                unallocatedCount++;
            }
        }
        
        shiftAssignmentRepository.saveAll(assignments);

        // Build detailed occupancy metrics
        Map<UUID, Long> zoneStaffCountMap = assignments.stream()
                .filter(a -> a.getZone() != null)
                .collect(Collectors.groupingBy(a -> a.getZone().getId(), Collectors.counting()));

        List<SpatialAllocationResultDto.ZoneOccupancyDetailDto> occupiedList = new ArrayList<>();
        List<SpatialAllocationResultDto.ZoneOccupancyDetailDto> unoccupiedList = new ArrayList<>();

        for (StoreZone zone : allZones) {
            int count = zoneStaffCountMap.getOrDefault(zone.getId(), 0L).intValue();
            SpatialAllocationResultDto.ZoneOccupancyDetailDto detail = mapToZoneDetail(zone, count);
            if (count > 0) {
                occupiedList.add(detail);
            } else {
                unoccupiedList.add(detail);
            }
        }

        String status = "SUCCESS";
        String message = String.format("Successfully allocated %d of %d staff across %d active zones", 
                allocatedCount, assignments.size(), occupiedList.size());

        if (unallocatedCount > 0) {
            if (allocatedCount == 0) {
                status = "CAPACITY_EXCEEDED";
                message = "Store zone capacities exhausted; no staff could be accommodated.";
            } else {
                status = "PARTIAL";
                message = String.format("Partially allocated %d staff. %d staff unallocated due to zone capacity limits.", 
                        allocatedCount, unallocatedCount);
            }
        }

        log.info("Spatial allocation for shift {}: status={}, allocated={}, unallocated={}, occupiedZones={}/{}",
                shiftId, status, allocatedCount, unallocatedCount, occupiedList.size(), allZones.size());

        return SpatialAllocationResultDto.builder()
                .shiftId(shiftId)
                .storeId(shift.getStore().getId())
                .status(status)
                .message(message)
                .totalAssignedStaff(assignments.size())
                .allocatedStaffCount(allocatedCount)
                .unallocatedStaffCount(unallocatedCount)
                .totalZonesCount(allZones.size())
                .occupiedZonesCount(occupiedList.size())
                .unoccupiedZonesCount(unoccupiedList.size())
                .occupiedZones(occupiedList)
                .unoccupiedZones(unoccupiedList)
                .build();
    }

    private SpatialAllocationResultDto.ZoneOccupancyDetailDto mapToZoneDetail(StoreZone zone, int count) {
        return SpatialAllocationResultDto.ZoneOccupancyDetailDto.builder()
                .zoneId(zone.getId())
                .zoneName(zone.getName())
                .currentStaffCount(count)
                .capacity(zone.getCapacity())
                .x(zone.getX())
                .y(zone.getY())
                .z(zone.getZ())
                .build();
    }

    /**
     * Greedy Max-Min 3D Euclidean Dispersion.
     * Selects candidate that has available capacity and maximizes the minimum 3D Euclidean distance
     * to already selected zones.
     * Returns null if all zones have reached maximum capacity.
     */
    private StoreZone selectBestZoneMaxMinDispersion(List<ZoneCandidate> candidates, List<StoreZone> alreadySelected, Double centerX, Double centerY, Double centerZ) {
        List<ZoneCandidate> availableCandidates = candidates.stream()
                .filter(c -> c.availableCapacity > 0)
                .collect(Collectors.toList());

        if (availableCandidates.isEmpty()) {
            // Hard constraint: Respect zone capacity, return null instead of overbooking
            return null;
        }

        if (alreadySelected.isEmpty()) {
            // First choice: pick the zone closest to center, with deterministic tie-breaking
            return availableCandidates.stream()
                    .min((c1, c2) -> {
                        int comp = Double.compare(
                                distance(c1.zone, centerX, centerY, centerZ),
                                distance(c2.zone, centerX, centerY, centerZ)
                        );
                        if (comp != 0) return comp;
                        return c1.zone.getId().compareTo(c2.zone.getId());
                    })
                    .map(c -> c.zone)
                    .orElse(availableCandidates.get(0).zone);
        }

        // Greedy Max-Min Dispersion
        // Find candidate that maximizes the minimum distance to already selected zones
        ZoneCandidate bestCandidate = null;
        double maxMinDistance = -1.0;

        for (ZoneCandidate candidate : availableCandidates) {
            double minDistanceToSelected = Double.MAX_VALUE;
            
            for (StoreZone selected : alreadySelected) {
                double dist = distance(candidate.zone, selected.getX(), selected.getY(), selected.getZ());
                if (dist < minDistanceToSelected) {
                    minDistanceToSelected = dist;
                }
            }

            if (minDistanceToSelected > maxMinDistance + 1e-6) {
                maxMinDistance = minDistanceToSelected;
                bestCandidate = candidate;
            } else if (Math.abs(minDistanceToSelected - maxMinDistance) <= 1e-6 && bestCandidate != null) {
                // Deterministic tie-breaker: compare zone UUID
                if (candidate.zone.getId().compareTo(bestCandidate.zone.getId()) < 0) {
                    bestCandidate = candidate;
                }
            } else if (bestCandidate == null) {
                maxMinDistance = minDistanceToSelected;
                bestCandidate = candidate;
            }
        }

        return bestCandidate != null ? bestCandidate.zone : availableCandidates.get(0).zone;
    }

    /**
     * Map assigned skill role to corresponding physical store zone with capacity check.
     */
    private StoreZone findMatchingZoneForSkill(String skillName, List<ZoneCandidate> candidates) {
        if (skillName == null || skillName.isBlank()) return null;
        String s = skillName.toLowerCase().trim();
        for (ZoneCandidate c : candidates) {
            if (c.availableCapacity <= 0) continue;
            String z = c.zone.getName().toLowerCase();
            if (s.contains("barista") || s.contains("pha chế")) {
                if (z.contains("barista") || z.contains("pha chế") || z.contains("counter")) return c.zone;
            } else if (s.contains("cashier") || s.contains("pos") || s.contains("thu ngân")) {
                if (z.contains("pos") || z.contains("cashier") || z.contains("thu ngân")) return c.zone;
            } else if (s.contains("kitchen") || s.contains("bếp") || s.contains("cook") || s.contains("bakery")) {
                if (z.contains("kitchen") || z.contains("bếp") || z.contains("bakery")) return c.zone;
            } else if (s.contains("waiter") || s.contains("phục vụ") || s.contains("server")) {
                if (z.contains("dining") || z.contains("mezzanine") || z.contains("bàn") || z.contains("phục vụ")) return c.zone;
            } else if (s.contains("leader") || s.contains("quản lý") || s.contains("supervisor") || s.contains("trưởng ca")) {
                if (z.contains("leader") || z.contains("pos") || z.contains("counter") || z.contains("dining")) return c.zone;
            } else if (z.contains(s) || s.contains(z)) {
                return c.zone;
            }
        }
        return null;
    }

    private double distance(StoreZone z, Double x, Double y, Double zCoord) {
        double dx = z.getX() - (x != null ? x : 0.0);
        double dy = z.getY() - (y != null ? y : 0.0);
        double dz = z.getZ() - (zCoord != null ? zCoord : 0.0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private static class ZoneCandidate {
        StoreZone zone;
        int availableCapacity;

        ZoneCandidate(StoreZone zone, int availableCapacity) {
            this.zone = zone;
            this.availableCapacity = availableCapacity;
        }
    }
}
