package com.shiftsync.shift.dto;

import com.shiftsync.shift.enums.ShiftStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ShiftDTO {
    @Schema(description = "Shift ID")
    private UUID id;

    @Schema(description = "Store ID")
    private UUID storeId;

    @Schema(description = "Shift Template ID (Optional)")
    private UUID shiftTemplateId;

    @Schema(description = "Shift Date")
    private LocalDate shiftDate;

    @Schema(description = "Start Time")
    private LocalTime startTime;

    @Schema(description = "End Time")
    private LocalTime endTime;

    @Schema(description = "Status")
    private ShiftStatus status;

    @Schema(description = "Registration Deadline")
    private ZonedDateTime availabilityDeadline;
    
    @Schema(description = "Requirements by Skill/Role")
    private List<ShiftSkillRequirementDTO> requirements;

    @Schema(description = "Assigned Staff ID")
    private UUID staffId;

    @Schema(description = "Assigned Staff Name")
    private String staffName;

    @Schema(description = "Shift Note")
    private String note;

    @Schema(description = "Shift Color")
    private String color;

    @Schema(description = "Skill / Role ID")
    private UUID skillId;
}
