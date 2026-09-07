package com.shiftsync.layout.service;

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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpatialAllocationService {

    private final StoreZoneRepository storeZoneRepository;
    private final StoreLayoutRepository storeLayoutRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;

    /**
     * Thuật toán 3D Greedy Max-Min Dispersion.
     * Tối ưu hóa phân bổ nhân sự vào các khu vực không gian 3D sao cho
     * khoảng cách giữa các nhân viên là xa nhất, nhằm tăng độ bao quát (coverage).
     */
    @Transactional(rollbackFor = Exception.class)
    public void allocateZonesForShift(UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new BusinessException("Shift not found", HttpStatus.NOT_FOUND));

        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByShiftId(shiftId);
        if (assignments.isEmpty()) {
            return;
        }

        List<StoreZone> allZones = storeZoneRepository.findByStoreId(shift.getStore().getId());
        if (allZones.isEmpty()) {
            throw new BusinessException("No 3D zones configured for this store", HttpStatus.BAD_REQUEST);
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

        for (ShiftAssignment assignment : assignments) {
            StoreZone chosenZone = selectBestZoneMaxMinDispersion(candidates, selectedZones, centerX, centerY, centerZ);
            
            if (chosenZone != null) {
                assignment.setZone(chosenZone);
                selectedZones.add(chosenZone);
                // Decrement capacity
                candidates.stream()
                        .filter(c -> c.zone.getId().equals(chosenZone.getId()))
                        .findFirst()
                        .ifPresent(c -> c.availableCapacity--);
            }
        }
        
        shiftAssignmentRepository.saveAll(assignments);
        log.info("Successfully allocated {} staff to 3D zones using Greedy Max-Min Dispersion for shift {}", assignments.size(), shiftId);
    }

    private StoreZone selectBestZoneMaxMinDispersion(List<ZoneCandidate> candidates, List<StoreZone> alreadySelected, Double centerX, Double centerY, Double centerZ) {
        List<ZoneCandidate> availableCandidates = candidates.stream()
                .filter(c -> c.availableCapacity > 0)
                .collect(Collectors.toList());

        if (availableCandidates.isEmpty()) {
            // All zones full, fallback to any zone (ignore capacity for forced assignment)
            availableCandidates = new ArrayList<>(candidates);
        }

        if (alreadySelected.isEmpty()) {
            // First choice: pick the zone closest to the center
            return availableCandidates.stream()
                    .min((c1, c2) -> Double.compare(
                            distance(c1.zone, centerX, centerY, centerZ),
                            distance(c2.zone, centerX, centerY, centerZ)
                    ))
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

            if (minDistanceToSelected > maxMinDistance) {
                maxMinDistance = minDistanceToSelected;
                bestCandidate = candidate;
            }
        }

        return bestCandidate != null ? bestCandidate.zone : availableCandidates.get(0).zone;
    }

    private double distance(StoreZone z, Double x, Double y, Double zCoord) {
        double dx = z.getX() - x;
        double dy = z.getY() - y;
        double dz = z.getZ() - zCoord;
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
