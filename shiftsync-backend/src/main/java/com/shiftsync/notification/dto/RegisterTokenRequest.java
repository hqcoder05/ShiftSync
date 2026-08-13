package com.shiftsync.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterTokenRequest {
    
    @NotBlank(message = "FCM Token is required")
    private String fcmToken;
    
    private String deviceType; // "android", "ios", "web"
}
