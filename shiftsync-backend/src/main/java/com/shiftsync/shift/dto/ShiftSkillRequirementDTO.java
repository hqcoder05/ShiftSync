package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ShiftSkillRequirementDTO {
    @Schema(description = "Requirement ID")
    private UUID id;

    @Schema(description = "Skill ID")
    private UUID skillId;
    
    @Schema(description = "Skill Name")
    private String skillName;

    @Schema(description = "Required count")
    private int requiredCount;
}
