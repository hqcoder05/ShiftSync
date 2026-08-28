package com.shiftsync.payroll.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class PayrollDTO {
    private UUID id;
    private UUID periodId;
    private UUID staffId;
    private String staffName;
    private LocalDate periodStartDate;
    private LocalDate periodEndDate;
    private String periodStatus;
    private BigDecimal totalHours;
    private BigDecimal otHours;
    private BigDecimal holidayHours;
    private BigDecimal baseAmount;
    private BigDecimal otAmount;
    private BigDecimal holidayAmount;
    private BigDecimal totalAmount;
    private OffsetDateTime generatedAt;
}
