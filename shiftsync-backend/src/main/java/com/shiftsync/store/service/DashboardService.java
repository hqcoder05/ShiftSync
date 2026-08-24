package com.shiftsync.store.service;

import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.dto.PayrollAggregation;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import com.shiftsync.store.dto.DashboardMetricsDTO;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EmploymentRepository employmentRepository;
    private final PayrollRepository payrollRepository;
    private final AttendanceRepository attendanceRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftSwapRequestRepository shiftSwapRequestRepository;
    private final StoreConfigurationRepository storeConfigurationRepository;

    @Transactional(readOnly = true)
    public DashboardMetricsDTO getDashboardMetrics(UUID storeId, LocalDate startDate, LocalDate endDate) {
        
        long totalAssignments = shiftAssignmentRepository.countTotalAssignmentsByStoreAndDateRange(storeId, startDate, endDate);
        PayrollAggregation payrollMetrics = payrollRepository.getPayrollMetrics(storeId, startDate, endDate);

        double workingHour = calculateWorkingHour(payrollMetrics);

        return DashboardMetricsDTO.builder()
                .attendance(DashboardMetricsDTO.AttendanceMetrics.builder()
                        .lateRate(calculateLateRate(storeId, startDate, endDate, totalAssignments))
                        .absentRate(calculateAbsentRate(storeId, startDate, endDate, totalAssignments))
                        .build())
                .scheduling(DashboardMetricsDTO.SchedulingMetrics.builder()
                        .coverage(calculateCoverage(storeId, startDate, endDate, totalAssignments))
                        .openShiftCount(calculateOpenShiftCount(storeId, startDate, endDate))
                        .swapCount(calculateSwapCount(storeId, startDate, endDate))
                        .build())
                .payroll(DashboardMetricsDTO.PayrollMetrics.builder()
                        .laborCost(calculateLaborCost(payrollMetrics))
                        .workingHour(workingHour)
                        .overtime(calculateOvertime(payrollMetrics))
                        .staffUtilization(calculateStaffUtilization(storeId, startDate, endDate, workingHour))
                        .build())
                .build();
    }

    /**
     * Late Rate = (LATE attendances / Total assignments) * 100
     */
    private double calculateLateRate(UUID storeId, LocalDate startDate, LocalDate endDate, long totalAssignments) {
        if (totalAssignments == 0) return 0.0;
        long lateCount = attendanceRepository.countAttendanceByStoreAndDateRangeAndStatus(storeId, startDate, endDate, com.shiftsync.attendance.enums.AttendanceStatus.LATE);
        return roundToTwoDecimals((double) lateCount / totalAssignments * 100);
    }

    /**
     * Absent Rate = (Assignments with past endTime but no Attendance) / Total assignments * 100
     */
    private double calculateAbsentRate(UUID storeId, LocalDate startDate, LocalDate endDate, long totalAssignments) {
        if (totalAssignments == 0) return 0.0;
        long absentCount = shiftAssignmentRepository.countAbsentAssignmentsByStoreAndDateRange(storeId, startDate, endDate);
        return roundToTwoDecimals((double) absentCount / totalAssignments * 100);
    }

    /**
     * Coverage = (Total assigned staff / Total required staff) * 100
     */
    private double calculateCoverage(UUID storeId, LocalDate startDate, LocalDate endDate, long totalAssignments) {
        Long totalRequired = shiftRepository.sumRequiredStaffByStoreAndDateRange(storeId, startDate, endDate);
        if (totalRequired == null || totalRequired == 0) return 0.0;
        double coverage = (double) totalAssignments / totalRequired * 100;
        return roundToTwoDecimals(Math.min(coverage, 100.0)); // Cap at 100% in case over-assigned
    }

    /**
     * Labor Cost = Sum of all payroll totalAmount in the period
     */
    private BigDecimal calculateLaborCost(PayrollAggregation metrics) {
        return (metrics != null && metrics.totalAmount() != null) ? metrics.totalAmount() : BigDecimal.ZERO;
    }

    /**
     * Working Hour = Sum of all payroll totalHours in the period
     */
    private double calculateWorkingHour(PayrollAggregation metrics) {
        return (metrics != null && metrics.totalHours() != null) ? metrics.totalHours().doubleValue() : 0.0;
    }

    /**
     * Overtime = Sum of all payroll otHours in the period
     */
    private double calculateOvertime(PayrollAggregation metrics) {
        return (metrics != null && metrics.otHours() != null) ? metrics.otHours().doubleValue() : 0.0;
    }

    /**
     * Staff Utilization = Actual working hours / Max possible hours * 100
     * Max possible hours = Total Active Staff * maxHourPerWeek * (Days in Period / 7)
     */
    private double calculateStaffUtilization(UUID storeId, LocalDate startDate, LocalDate endDate, double actualWorkingHours) {
        if (actualWorkingHours <= 0) return 0.0;
        long totalStaff = employmentRepository.countByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE);
        if (totalStaff == 0) return 0.0;

        StoreConfiguration config = storeConfigurationRepository.findByStoreId(storeId).orElse(null);
        int maxHourPerWeek = (config != null && config.getMaxHourPerWeek() != null) ? config.getMaxHourPerWeek() : 48; // Default to 48 as per StoreConfiguration.java

        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1; // inclusive
        double maxPossibleHours = totalStaff * maxHourPerWeek * ((double) days / 7.0);

        if (maxPossibleHours <= 0) return 0.0;
        double utilization = (actualWorkingHours / maxPossibleHours) * 100;
        return roundToTwoDecimals(Math.min(utilization, 100.0)); // Cap at 100%
    }

    /**
     * Open Shift Count = Number of shifts with isOpen = true
     */
    private long calculateOpenShiftCount(UUID storeId, LocalDate startDate, LocalDate endDate) {
        return shiftRepository.countOpenShiftsByStoreAndDateRange(storeId, startDate, endDate);
    }

    /**
     * Swap Count = Number of Shift Swap Requests created for shifts in this period
     */
    private long calculateSwapCount(UUID storeId, LocalDate startDate, LocalDate endDate) {
        return shiftSwapRequestRepository.countSwapRequestsByStoreAndDateRange(storeId, startDate, endDate);
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    @Transactional(readOnly = true)
    public java.util.List<com.shiftsync.store.dto.ChartDataDTO> getChartData(UUID storeId, LocalDate startDate, LocalDate endDate) {
        java.util.List<com.shiftsync.payroll.dto.PayrollChartAggregation> aggregations = payrollRepository.getPayrollChartData(storeId, startDate, endDate);
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM");
        
        java.util.List<com.shiftsync.store.dto.ChartDataDTO> chartData = new java.util.ArrayList<>();
        
        for (com.shiftsync.payroll.dto.PayrollChartAggregation agg : aggregations) {
            String label = agg.startDate().format(formatter) + " - " + agg.endDate().format(formatter);
            double hours = agg.totalHours() != null ? agg.totalHours().doubleValue() : 0.0;
            BigDecimal cost = agg.totalAmount() != null ? agg.totalAmount() : BigDecimal.ZERO;
            
            chartData.add(com.shiftsync.store.dto.ChartDataDTO.builder()
                    .label(label)
                    .hours(hours)
                    .cost(cost)
                    .build());
        }
        
        return chartData;
    }
}
