package com.shiftsync.layout.service;

import com.shiftsync.layout.dto.SpatialAllocationResultDto;
import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.layout.repository.WorkstationRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
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
    private final WorkstationRepository workstationRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final StaffSkillRepository staffSkillRepository;
    private final SkillRepository skillRepository;

    @Transactional(rollbackFor = Exception.class)
    public SpatialAllocationResultDto allocateZonesForShift(UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));
        return allocateZonesForShift(shift.getStore().getId(), shiftId);
    }

    @Transactional(rollbackFor = Exception.class)
    public SpatialAllocationResultDto allocateZonesForShift(UUID storeId, UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        if (storeId != null && !shift.getStore().getId().equals(storeId)) {
            throw new BusinessException("Shift does not belong to the requested store", HttpStatus.FORBIDDEN);
        }

        List<StoreZone> allZones = storeZoneRepository.findByStoreId(shift.getStore().getId());
        if (allZones.isEmpty()) {
            throw new BusinessException("No 3D zones configured for this store", HttpStatus.BAD_REQUEST);
        }

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

        List<ZoneCandidate> candidates = allZones.stream()
                .map(z -> new ZoneCandidate(z, z.getCapacity()))
                .collect(Collectors.toList());

        List<StoreZone> selectedZones = new ArrayList<>();
        int allocatedCount = 0;
        int unallocatedCount = 0;

        // Build spatial requirement lookup (from explicit ShiftSkillRequirement)
        Map<UUID, StoreZone> skillTargetZoneMap = new HashMap<>();
        Map<UUID, Workstation> skillTargetWsMap = new HashMap<>();
        if (shift.getRequirements() != null) {
            for (ShiftSkillRequirement req : shift.getRequirements()) {
                if (req.getSkill() != null) {
                    if (req.getZone() != null) {
                        skillTargetZoneMap.put(req.getSkill().getId(), req.getZone());
                    }
                    if (req.getWorkstation() != null) {
                        skillTargetWsMap.put(req.getSkill().getId(), req.getWorkstation());
                        if (req.getWorkstation().getZone() != null && req.getZone() == null) {
                            skillTargetZoneMap.put(req.getSkill().getId(), req.getWorkstation().getZone());
                        }
                    }
                }
            }
        }

        for (ShiftAssignment assignment : assignments) {
            StoreZone chosenZone = null;
            Workstation chosenWs = null;

            // 1. First priority: Explicit requirement target from ShiftSkillRequirement
            if (assignment.getRequiredSkillId() != null) {
                StoreZone targetZone = skillTargetZoneMap.get(assignment.getRequiredSkillId());
                if (targetZone != null) {
                    var match = candidates.stream()
                            .filter(c -> c.zone.getId().equals(targetZone.getId()) && c.availableCapacity > 0)
                            .findFirst()
                            .orElse(null);
                    if (match != null) {
                        chosenZone = match.zone;
                    }
                }
                chosenWs = skillTargetWsMap.get(assignment.getRequiredSkillId());
            }

            // 1b. Semantic skill matching based on staff's skills (e.g. Barista -> Barista Counter, Cashier -> POS)
            if (chosenZone == null && assignment.getStaff() != null) {
                List<StaffSkill> staffSkills = staffSkillRepository.findByStaffId(assignment.getStaff().getId());
                for (StaffSkill ss : staffSkills) {
                    Skill sk = skillRepository.findById(ss.getSkillId()).orElse(null);
                    if (sk != null) {
                        String sName = sk.getName().toLowerCase();
                        var match = candidates.stream()
                                .filter(c -> c.availableCapacity > 0 && isZoneMatchingSkill(c.zone, sName))
                                .findFirst()
                                .orElse(null);
                        if (match != null) {
                            chosenZone = match.zone;
                            if (assignment.getRequiredSkillId() == null) {
                                assignment.setRequiredSkillId(sk.getId());
                            }
                            break;
                        }
                    }
                }
            }

            // 2. Second priority / Fallback: Max-Min geometric dispersion across available zones
            if (chosenZone == null) {
                chosenZone = selectBestZoneMaxMinDispersion(candidates, selectedZones, centerX, centerY, centerZ);
            }
            
            if (chosenZone != null) {
                assignment.setZone(chosenZone);
                if (chosenWs != null) {
                    assignment.setWorkstation(chosenWs);
                }
                selectedZones.add(chosenZone);
                allocatedCount++;

                final UUID chosenId = chosenZone.getId();
                candidates.stream()
                        .filter(c -> c.zone.getId().equals(chosenId))
                        .findFirst()
                        .ifPresent(c -> c.availableCapacity--);
            } else {
                assignment.setZone(null);
                assignment.setWorkstation(null);
                unallocatedCount++;
            }
        }
        
        shiftAssignmentRepository.saveAll(assignments);

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

    private StoreZone selectBestZoneMaxMinDispersion(List<ZoneCandidate> candidates, List<StoreZone> alreadySelected, Double centerX, Double centerY, Double centerZ) {
        List<ZoneCandidate> availableCandidates = candidates.stream()
                .filter(c -> c.availableCapacity > 0)
                .collect(Collectors.toList());

        if (availableCandidates.isEmpty()) {
            return null;
        }

        if (alreadySelected.isEmpty()) {
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

    private double distance(StoreZone z, Double x, Double y, Double zCoord) {
        double dx = z.getX() - (x != null ? x : 0.0);
        double dy = z.getY() - (y != null ? y : 0.0);
        double dz = z.getZ() - (zCoord != null ? zCoord : 0.0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private boolean isZoneMatchingSkill(StoreZone zone, String skillName) {
        String zName = (zone.getName() != null ? zone.getName() : "").toLowerCase();
        String zCode = (zone.getCode() != null ? zone.getCode() : "").toLowerCase();
        String zType = (zone.getZoneType() != null ? zone.getZoneType().name() : "").toLowerCase();

        if (skillName.contains("barista") || skillName.contains("pha chế") || skillName.contains("cà phê")) {
            return zName.contains("barista") || zName.contains("pha chế") || zCode.contains("barista") || zType.contains("counter");
        }
        if (skillName.contains("cashier") || skillName.contains("thu ngân") || skillName.contains("pos") || skillName.contains("checkout")) {
            return zName.contains("cashier") || zName.contains("thu ngân") || zName.contains("pos") || zCode.contains("pos") || zType.contains("counter");
        }
        if (skillName.contains("kitchen") || skillName.contains("bếp") || skillName.contains("bánh") || skillName.contains("bakery")) {
            return zName.contains("kitchen") || zName.contains("bếp") || zName.contains("bakery");
        }
        if (skillName.contains("waiter") || skillName.contains("phục vụ") || skillName.contains("server")) {
            return zName.contains("dining") || zName.contains("sảnh") || zType.contains("seating");
        }
        if (skillName.contains("leader") || skillName.contains("trưởng ca") || skillName.contains("supervisor")) {
            return zName.contains("pos") || zName.contains("cashier") || zName.contains("barista") || zName.contains("service");
        }
        return false;
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
