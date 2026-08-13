package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SwapRespondRequest {
    @NotNull(message = "Response (accept/reject) is required")
    private Boolean accept;
}
