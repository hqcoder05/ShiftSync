package com.shiftsync.shift.dto;

import lombok.*;
import java.util.List;
import java.util.UUID;

/** Descriptive final-plan metrics. These are not a proof of feasibility or optimality. */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ScheduleQualityDTO {
    private String evaluationVersion;
    private int demandSlots;
    private int coveredSlots;
    private int unfilledSlots;
    private double demandHours;
    private double coveredHours;
    private double unfilledHours;
    private int autoAssignmentsKept;
    private int autoAssignmentsAdded;
    private int autoAssignmentsRemoved;
    private List<MonthlyLoad> monthlyLoads;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyLoad {
        private String month;
        private int staffCount;
        private double scheduledHours;
        private double normalizedLoadStdDev;
        private List<StaffLoad> staffLoads;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StaffLoad {
        private UUID staffId;
        private double scheduledHours;
        private double capacityHours;
        private double loadRatio;
    }
}
