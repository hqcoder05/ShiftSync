package com.shiftsync.payroll.dto;

import java.math.BigDecimal;

public record PayrollAggregation(Double totalHours, BigDecimal totalAmount) {
}
