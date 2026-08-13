package com.shiftsync.skill.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SkillRequest {
    
    @NotBlank(message = "Skill name is required")
    @Schema(description = "Skill Name (Role)", example = "Barista")
    private String name;

    @Schema(description = "Skill Description", example = "Makes coffee")
    private String description;
}
