package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ShiftAssignmentCreateRequest {
    @NotNull(message = "Staff ID is required")
    private UUID staffId;
}
