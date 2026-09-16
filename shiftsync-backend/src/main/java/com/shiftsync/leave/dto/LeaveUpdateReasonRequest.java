package com.shiftsync.leave.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveUpdateReasonRequest {
    @NotBlank(message = "Reason must not be blank")
    private String reason;
}
