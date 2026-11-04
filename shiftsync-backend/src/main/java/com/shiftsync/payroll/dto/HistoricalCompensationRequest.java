package com.shiftsync.payroll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class HistoricalCompensationRequest {
    @NotNull private LocalDate effectiveDate;
    @NotBlank @Size(min=10,max=2000) private String evidence;
    private UUID contractTypeId;
    private BigDecimal hourlyRate;
    private Integer maxWeeklyHours;
    private BigDecimal otMultiplier;
}
