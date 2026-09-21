package com.shiftsync.skill.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class SkillDTO {
    @Schema(description = "Skill ID")
    private UUID id;

    @Schema(description = "Store ID")
    private UUID storeId;

    @Schema(description = "Skill Name (Role)", example = "Barista")
    private String name;

    @Schema(description = "Skill Description", example = "Makes coffee")
    private String description;

    @Schema(description = "Hourly pay rate in VND", example = "26000.00")
    private java.math.BigDecimal hourlyRate;
}
