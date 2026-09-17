package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequirementCoverageDTO {

    @Schema(description = "Requirement ID")
    private UUID requirementId;

    @Schema(description = "Shift ID")
    private UUID shiftId;

    @Schema(description = "Shift Date")
    private LocalDate shiftDate;

    @Schema(description = "Shift Start Time")
    private LocalTime startTime;

    @Schema(description = "Shift End Time")
    private LocalTime endTime;

    @Schema(description = "Skill ID")
    private UUID skillId;

    @Schema(description = "Skill Name")
    private String skillName;

    @Schema(description = "Zone ID")
    private UUID zoneId;

    @Schema(description = "Zone Name")
    private String zoneName;

    @Schema(description = "Workstation ID")
    private UUID workstationId;

    @Schema(description = "Workstation Name")
    private String workstationName;

    @Schema(description = "Required staff count")
    private int requiredCount;

    @Schema(description = "Assigned staff count")
    private int assignedCount;

    @Schema(description = "Shortage count (non-negative)")
    private int shortageCount;

    @Schema(description = "Coverage percentage (0.0 to 100.0)")
    private double coverageRate;

    @Schema(description = "Whether requirement is fully satisfied")
    private boolean fullyCovered;
}
