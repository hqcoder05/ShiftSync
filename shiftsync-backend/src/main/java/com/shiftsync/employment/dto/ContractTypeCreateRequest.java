package com.shiftsync.employment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ContractTypeCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Max weekly hours is required")
    @Min(value = 1, message = "Max weekly hours must be at least 1")
    private Integer maxWeeklyHours;

    @NotNull(message = "OT multiplier is required")
    @DecimalMin(value = "1.0", message = "OT multiplier must be at least 1.0")
    private BigDecimal otMultiplier;

    @NotNull(message = "Default hourly rate is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Default hourly rate must be strictly positive")
    private BigDecimal defaultHourlyRate;
}
