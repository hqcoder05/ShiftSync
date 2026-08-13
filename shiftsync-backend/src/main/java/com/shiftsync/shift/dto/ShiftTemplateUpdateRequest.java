package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class ShiftTemplateUpdateRequest {
    
    @NotBlank(message = "Template name is required")
    @Schema(description = "Template Name", example = "Morning Shift")
    private String name;

    @NotNull(message = "Start time is required")
    @Schema(description = "Start Time", example = "08:00:00")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    @Schema(description = "End Time", example = "16:00:00")
    private LocalTime endTime;
}
