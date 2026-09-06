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
    
    private UUID contractTypeId;
    
    private String employmentType;

    private UUID skillId;
    
    private BigDecimal hourlyRate;
    
    private LocalDate joinedDate;
}

