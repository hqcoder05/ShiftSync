package com.shiftsync.store.service;

import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.dto.PayrollAggregation;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.store.dto.DashboardMetricsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EmploymentRepository employmentRepository;
    private final PayrollRepository payrollRepository;

    @Transactional(readOnly = true)
    public DashboardMetricsDTO getDashboardMetrics(UUID storeId, LocalDate startDate, LocalDate endDate) {
        long totalStaff = employmentRepository.countByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE);

        PayrollAggregation metrics = payrollRepository.getPayrollMetrics(storeId, startDate, endDate);

        double totalHours = 0.0;
        BigDecimal totalPayrollCost = BigDecimal.ZERO;

        if (metrics != null) {
            if (metrics.totalHours() != null) {
                totalHours = metrics.totalHours();
            }
            if (metrics.totalAmount() != null) {
                totalPayrollCost = metrics.totalAmount();
            }
        }

        return DashboardMetricsDTO.builder()
                .totalStaff(totalStaff)
                .totalHours(totalHours)
                .totalPayrollCost(totalPayrollCost)
                .build();
    }

    @Transactional(readOnly = true)
    public java.util.List<com.shiftsync.store.dto.ChartDataDTO> getChartData(UUID storeId, LocalDate startDate, LocalDate endDate) {
        java.util.List<com.shiftsync.payroll.dto.PayrollChartAggregation> aggregations = payrollRepository.getPayrollChartData(storeId, startDate, endDate);
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM");
        
        java.util.List<com.shiftsync.store.dto.ChartDataDTO> chartData = new java.util.ArrayList<>();
        
        for (com.shiftsync.payroll.dto.PayrollChartAggregation agg : aggregations) {
            String label = agg.startDate().format(formatter) + " - " + agg.endDate().format(formatter);
            double hours = agg.totalHours() != null ? agg.totalHours() : 0.0;
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
