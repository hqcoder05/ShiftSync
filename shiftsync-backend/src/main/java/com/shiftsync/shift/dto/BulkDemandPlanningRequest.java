package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
public class BulkDemandPlanningRequest {

    @Schema(description = "Scope of demand planning: WEEK or DAY", example = "WEEK")
    private String scope = "WEEK";

    @Schema(description = "Target specific date if scope is DAY", example = "2026-09-08")
    private LocalDate targetDate;

    @Schema(description = "Start date of the week if scope is WEEK", example = "2026-09-07")
    private LocalDate startDate;

    @Schema(description = "End date of the week if scope is WEEK", example = "2026-09-13")
    private LocalDate endDate;

    @NotNull(message = "Shifts configuration list cannot be null")
    @Schema(description = "Shift templates and their staffing requirements")
    private List<ShiftDemandConfig> shifts;

    @Data
    public static class ShiftDemandConfig {
        @Schema(description = "Shift name / title", example = "Ca Sáng")
        private String name;

        @NotNull(message = "Start time is required")
        @Schema(description = "Start Time", example = "07:00:00")
        private LocalTime startTime;

        @NotNull(message = "End time is required")
        @Schema(description = "End Time", example = "15:00:00")
        private LocalTime endTime;

        @Schema(description = "Shift color badge", example = "#5BC8B8")
        private String color;

        @Schema(description = "Skill requirements for this shift")
        private List<ShiftRequirementRequest> requirements;
    }
}