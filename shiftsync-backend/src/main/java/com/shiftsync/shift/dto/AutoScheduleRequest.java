package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AutoScheduleRequest {

    @NotNull(message = "Start date is required")
    @Schema(description = "Start date of the schedule week", example = "2023-11-13")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Schema(description = "End date of the schedule week", example = "2023-11-19")
    private LocalDate endDate;

    @Schema(description = "Run the same scheduler but roll back all generated assignments and quota demand", example = "false")
    private Boolean dryRun = false;
}
