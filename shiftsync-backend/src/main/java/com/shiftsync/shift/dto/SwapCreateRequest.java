package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SwapCreateRequest {
    @NotNull(message = "From shift ID is required")
    private UUID fromShiftId;

    @NotNull(message = "To staff ID is required")
    private UUID toStaffId;

    @NotNull(message = "To shift ID is required")
    private UUID toShiftId;
}
