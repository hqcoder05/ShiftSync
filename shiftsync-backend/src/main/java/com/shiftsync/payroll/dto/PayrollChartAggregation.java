package com.shiftsync.payroll.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PayrollChartAggregation(LocalDate startDate, LocalDate endDate, BigDecimal totalHours, BigDecimal totalAmount) {
}
