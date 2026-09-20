package com.shiftsync.quota.dto;

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
public class DailyQuotaResponse {
    private UUID branchId;
    private String branchName;
    private LocalDate date;
    private String dateFormatted; // e.g. "14/09/2026"
    private LocalTime openTime;
    private LocalTime closeTime;
    private LocalTime midTime;
    private String morningLabel;
    private String afternoonLabel;
    private double slaPercentage; // e.g. 96.8
    private String statusBadge; // e.g. "● 5/6 ca đã đủ định biên"
    private int completedShiftsCount;
    private int totalShiftsCount;

    // 3 Operational Position KPIs
    private List<DailyPositionKpi> positionKpis;

    // Timeline Shifts (Ca Sáng 06:00-14:00, Ca Chiều 14:00-22:00)
    private List<DailyShiftQuota> shifts;

    // Bottom Warning Banner
    private DailyWarningBanner warningBanner;

    // Bottom Footer Metrics
    private DailySummaryFooter summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyPositionKpi {
        private UUID positionId;
        private String positionName;
        private String code;
        private int slaPercentage;
        private double assignedHours;
        private int requiredCount;
        private int min;
        private int target;
        private int max;
        private String normLabel; // e.g. "Chuẩn: 2 - 4 NV/ca"
        private String positionDescription;
        private long hourlyRate;
        private String color;
        private String icon;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyShiftQuota {
        private UUID id;
        private String name; // "Ca Sáng" or "Ca Chiều"
        private String startTime; // "06:00"
        private String endTime; // "14:00"
        private double durationHours;
        private List<Integer> timelineHours; // [6, 8, 10, 12] or [14, 16, 18, 20]
        private List<DailyQuotaCell> quotas;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyQuotaCell {
        private String quotaId;
        private UUID positionId;
        private String positionName;
        private String positionCode;
        private String positionDescription;
        private int count;
        private int min;
        private int target;
        private int max;
        private String status; // "COMPLIANT" | "UNDERSTAFFED" | "OVERSTAFFED"
        private String statusLabel; // "✓ Đạt chuẩn" | "⚠️ Thiếu 1 NV" | "⚠️ Vượt chuẩn"
        private boolean isViolation;
        private String violationMessage;
        private long hourlyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyWarningBanner {
        private boolean hasViolation;
        private String shiftName;
        private String positionName;
        private int currentCount;
        private int requiredCount;
        private String title;
        private String message;
        private String impactDescription;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySummaryFooter {
        private double totalHours; // e.g. 136
        private int totalShiftsCount; // e.g. 17
        private long estimatedCost; // e.g. 3840000
        private String costBreakdownText; // "(Barista 28k/h, Thu ngân 26k/h, Bếp 30k/h)"
        private double slaComplianceRate; // 100.0
        private boolean isBiometricSynced; // true
        private int compliantSlotsCount;
        private int totalSlotsCount;
        private int violationSlotsCount;
    }
}
