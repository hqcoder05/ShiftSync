package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class ShiftTemplateDTO {
    @Schema(description = "Shift Template ID")
    private UUID id;

    @Schema(description = "Store ID")
    private UUID storeId;

    @Schema(description = "Template Name", example = "Morning Shift")
    private String name;

    @Schema(description = "Start Time", example = "08:00:00")
    private LocalTime startTime;

    @Schema(description = "End Time", example = "16:00:00")
    private LocalTime endTime;
}
