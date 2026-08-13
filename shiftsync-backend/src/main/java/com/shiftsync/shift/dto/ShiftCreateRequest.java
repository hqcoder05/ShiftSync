package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
public class ShiftCreateRequest {
    
    @Schema(description = "Shift Template ID (Optional). If provided, times can be derived from it.")
    private UUID shiftTemplateId;

    @NotNull(message = "Shift date is required")
    @Schema(description = "Date of the shift", example = "2023-12-01")
    private LocalDate shiftDate;

    @NotNull(message = "Start time is required")
    @Schema(description = "Start Time", example = "08:00:00")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    @Schema(description = "End Time", example = "16:00:00")
    private LocalTime endTime;

    @NotNull(message = "Registration deadline is required")
    @Schema(description = "Registration Deadline (ISO-8601)", example = "2023-11-25T23:59:59Z")
    private ZonedDateTime registrationDeadline;
}
