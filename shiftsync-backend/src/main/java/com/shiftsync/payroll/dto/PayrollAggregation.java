package com.shiftsync.payroll.dto;

import java.math.BigDecimal;

public record PayrollAggregation(BigDecimal totalHours, BigDecimal totalAmount) {
}
