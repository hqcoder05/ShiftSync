package com.shiftsync.store.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardMetricsDTO {

    private AttendanceMetrics attendance;
    private SchedulingMetrics scheduling;
    private PayrollMetrics payroll;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttendanceMetrics {
        private double lateRate;     // %
        private double absentRate;   // %
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SchedulingMetrics {
        private double coverage;     // %
        private long openShiftCount;
        private long swapCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PayrollMetrics {
        private BigDecimal laborCost;
        private double workingHour;
        private double overtime;
        private double staffUtilization; // %
    }
}
