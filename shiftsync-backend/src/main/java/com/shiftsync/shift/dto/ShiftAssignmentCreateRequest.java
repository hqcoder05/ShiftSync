package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ShiftAssignmentCreateRequest {
    @NotNull(message = "Staff ID is required")
    private UUID staffId;

    private UUID zoneId;

    @io.swagger.v3.oas.annotations.media.Schema(description = "Override recurring availability only; skills, capacity, leave, blackout, overlap and hour limits still apply")
    private Boolean force;
}
