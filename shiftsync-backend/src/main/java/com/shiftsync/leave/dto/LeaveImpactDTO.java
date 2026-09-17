package com.shiftsync.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveImpactDTO {
    private UUID leaveRequestId;
    private UUID staffId;
    private String staffName;
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalConflictingShifts;
    private List<ImpactedShiftDTO> conflictingShifts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImpactedShiftDTO {
        private UUID shiftId;
        private LocalDate shiftDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private UUID storeId;
        private String storeName;
        private String skillName;
    }
}
