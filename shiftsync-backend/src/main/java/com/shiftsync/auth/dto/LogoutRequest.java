package com.shiftsync.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LogoutRequest {
    @NotBlank(message = "Thieu refresh token")
    private String refreshToken;
}
