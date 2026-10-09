package com.shiftsync.skill.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SkillRequest {
    
    @NotBlank(message = "Skill name is required")
    @Schema(description = "Skill Name (Role)", example = "Barista")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @Schema(description = "Skill Description", example = "Makes coffee")
    private String description;

    @jakarta.validation.constraints.DecimalMin(value = "0.0", message = "Hourly rate must be non-negative")
    @Schema(description = "Hourly pay rate in VND", example = "26000.00")
    private java.math.BigDecimal hourlyRate;
}

