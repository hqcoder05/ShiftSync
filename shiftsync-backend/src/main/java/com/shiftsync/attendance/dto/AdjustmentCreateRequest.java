package com.shiftsync.attendance.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class AdjustmentCreateRequest {

    @Schema(description = "ID of the attendance record. Null if forgot to check-in entirely.")
    private UUID attendanceId;

    @NotNull(message = "Shift ID is required")
    @Schema(description = "ID of the shift")
    private UUID shiftId;

    @Schema(description = "Requested check-in time")
    private OffsetDateTime requestedCheckIn;

    @Schema(description = "Requested check-out time")
    private OffsetDateTime requestedCheckOut;

    @NotBlank(message = "Reason is required")
    @Schema(description = "Reason for the adjustment")
    private String reason;
}
