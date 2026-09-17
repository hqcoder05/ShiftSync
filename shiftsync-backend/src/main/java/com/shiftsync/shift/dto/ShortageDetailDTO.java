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
public class ShortageDetailDTO {

    @Schema(description = "Store ID")
    private UUID storeId;

    @Schema(description = "Shift ID")
    private UUID shiftId;

    @Schema(description = "Shift Date")
    private LocalDate shiftDate;

    @Schema(description = "Shift Start Time")
    private LocalTime startTime;

    @Schema(description = "Shift End Time")
    private LocalTime endTime;

    @Schema(description = "Required Skill ID")
    private UUID skillId;

    @Schema(description = "Required Skill Name")
    private String skillName;

    @Schema(description = "Store Zone ID (if 3D location configured)")
    private UUID zoneId;

    @Schema(description = "Store Zone Name")
    private String zoneName;

    @Schema(description = "Workstation ID (if configured)")
    private UUID workstationId;

    @Schema(description = "Workstation Name")
    private String workstationName;

    @Schema(description = "Required staff count for this requirement")
    private int requiredCount;

    @Schema(description = "Assigned staff count for this requirement")
    private int assignedCount;

    @Schema(description = "Shortage count for this requirement (requiredCount - assignedCount)")
    private int shortageCount;

    @Schema(description = "Primary diagnostic reason (e.g. NO_QUALIFIED_STAFF, CONSTRAINTS_VIOLATED)")
    private String primaryReason;

    @Schema(description = "Detailed diagnostic explanation")
    private String diagnosticDetails;
}
