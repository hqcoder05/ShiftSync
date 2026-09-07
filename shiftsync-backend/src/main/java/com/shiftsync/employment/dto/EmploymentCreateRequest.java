package com.shiftsync.employment.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class EmploymentCreateRequest {
    @NotNull(message = "Staff ID is required")
    private UUID staffId;
    
    @NotNull(message = "Employment type is required")
    private java.util.UUID contractTypeId;
    
    @NotNull(message = "Hourly rate is required")
    @Positive(message = "Hourly rate must be positive")
    private BigDecimal hourlyRate;
    
    @NotNull(message = "Joined date is required")
    private LocalDate joinedDate;
}

