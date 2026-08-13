package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ShiftRequirementRequest {
    
    @NotNull(message = "Skill ID is required")
    @Schema(description = "Skill ID (Role)")
    private UUID skillId;

    @Min(value = 1, message = "Required count must be at least 1")
    @Schema(description = "Number of staff required for this role", example = "2")
    private int requiredCount;
}
