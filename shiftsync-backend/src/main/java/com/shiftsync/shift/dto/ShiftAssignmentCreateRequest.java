package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ShiftAssignmentCreateRequest {
    @jakarta.validation.constraints.Size(max = 1000)
    private String changeReason;
    @NotNull(message = "Staff ID is required")
    private UUID staffId;

    private UUID zoneId;

    private Boolean force;
}
