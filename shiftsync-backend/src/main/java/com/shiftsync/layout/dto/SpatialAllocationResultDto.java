package com.shiftsync.layout.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpatialAllocationResultDto {
    private UUID shiftId;
    private UUID storeId;
    private String status; // SUCCESS, PARTIAL, FAILED_NO_ZONES, CAPACITY_EXCEEDED, NO_STAFF
    private String message;
    private int totalAssignedStaff;
    private int allocatedStaffCount;
    private int unallocatedStaffCount;
    private int totalZonesCount;
    private int occupiedZonesCount;
    private int unoccupiedZonesCount;
    private List<ZoneOccupancyDetailDto> occupiedZones;
    private List<ZoneOccupancyDetailDto> unoccupiedZones;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ZoneOccupancyDetailDto {
        private UUID zoneId;
        private String zoneName;
        private int currentStaffCount;
        private int capacity;
        private Double x;
        private Double y;
        private Double z;
    }
}
