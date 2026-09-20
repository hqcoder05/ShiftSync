package com.shiftsync.quota.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyMatrixQuotaResponse {
    private UUID branchId;
    private String branchName;
    private LocalDate weekStart;
    private LocalDate weekEnd;
    private String weekFormatted; // e.g. "14/09 – 20/09/2026"
    private LocalTime openTime;
    private LocalTime closeTime;
    private LocalTime midTime;
    private String morningLabel;
    private String afternoonLabel;
    private double slaPercentage; // e.g. 97.8
    private int totalQuotaSlots; // e.g. 88
    private int standardQuotaSlots; // e.g. 90
    private String progressTitle; // e.g. "TIẾN ĐỘ PHÂN BỔ ĐỊNH BIÊN TUẦN: 88 / 90 Lượt ca vị trí (97.8%)"

    // Progress Pills
    private ProgressPills progressPills;

    // Operational Position KPI Target Cards (Barista, Cashier, Kitchen)
    private List<WeeklyPositionCard> positionCards;

    // 7 Days Columns Info
    private List<DayColumnHeader> days;

    // Matrix Rows (one row per operational position)
    private List<MatrixRow> matrixRows;

    // Summary Rows at the bottom of the matrix
    private MatrixSummaryRows summaryRows;

    // Categorized Review & Warnings Box (Red, Yellow, Blue)
    private List<WeeklyWarningItem> warnings;

    // Bottom Budget Bar
    private WeeklyBudgetFooter budget;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProgressPills {
        private int compliantCount;
        private double compliantPercent;
        private int peakCount;
        private double peakPercent;
        private int needsReviewCount;
        private double needsReviewPercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyPositionCard {
        private UUID positionId;
        private String positionName;
        private String code;
        private int min;
        private int target;
        private int max;
        private long hourlyRate;
        private int assignedSlots;
        private int targetSlots;
        private double totalHours;
        private String applyScope; // "Áp dụng: Mọi ca" or "Áp dụng: Chỉ ca cao điểm"
        private int slaPercentage;
        private String color;
        private String icon;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DayColumnHeader {
        private LocalDate date;
        private String dayOfWeekName; // "Thứ 2", "Thứ 3", ... "Chủ nhật"
        private String formattedDate; // "14/09"
        private String expectedRevenueText; // "Dự kiến: 20-25tr DT"
        @JsonProperty("isPeakWeekend")
        private boolean isPeakWeekend; // true for Saturday & Sunday
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatrixRow {
        private UUID positionId;
        private String positionName;
        private String positionCode;
        private String description;
        private long hourlyRate;
        private String targetSummary; // "Mục tiêu: Sáng 2 – Chiều 1/2"
        private List<MatrixCell> cells; // 14 cells (7 days x 2 shifts)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatrixCell {
        private String quotaId;
        private LocalDate date;
        private String shiftType; // "morning" or "afternoon"
        private String shiftName; // "Ca Sáng (06-14h)" or "Ca Chiều (14-22h)"
        private int count;
        private int min;
        private int target;
        private int max;
        private String status; // "COMPLIANT" | "PEAK" | "OVER" | "VIOLATION"
        private String statusLabel; // "Đạt chuẩn" | "Cao điểm" | "Vượt chuẩn" | "Vi phạm"
        @JsonProperty("isPeakSlot")
        private boolean isPeakSlot;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatrixSummaryRows {
        // Total staff per shift (14 values: 7 days x 2 shifts)
        private List<Integer> shiftTotals;
        // Total staff per day vs norm (7 values)
        private List<DayTotalSummary> dayTotals;
        // Converted man-hours (7 values: 8h x totalStaff)
        private List<Double> manHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DayTotalSummary {
        private int totalStaff;
        private int standardNorm; // target total for the day
        private int maxNorm; // max allowed total staff for the day
        private int minNorm; // min required total staff for the day
        private String statusBadge; // "Đạt chuẩn" | "Trong định biên" | "Vượt +X NV" | "Thiếu X NV"
        private String badgeType; // "COMPLIANT" | "OVER" | "UNDER"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyWarningItem {
        private String id;
        private String severity; // "RED" (Violation), "YELLOW" (Over), "BLUE" (Auto Peak)
        private String severityLabel; // "ĐỎ: VI PHẠM QUY CHUẨN" | "VÀNG: VƯỢT CHUẨN" | "XANH: CAO ĐIỂM TỰ ĐỘNG"
        private String title;
        private String description;
        private boolean isLocked; // true for blue auto peak
        private String targetQuotaId; // for "Xem ô" jump
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyBudgetFooter {
        private int totalQuotas; // e.g. 121
        private double totalHours; // e.g. 968
        private long estimatedCost; // e.g. 27328000
        private String formattedEstimatedCost; // "27.328.000 đ"
        private double slaComplianceRate; // 100.0
        private long monthlyQuotaBudget; // 85000000
        private long monthlyUsedBudget; // 27328000
        private double monthlyUsedPercentage; // 32.2
        private String budgetStatusText; // "32.2% ngân sách tháng — Đang trong hạn mức an toàn"
    }
}
