package com.shiftsync.notification.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterTokenRequest {
    
    @NotBlank(message = "FCM Token is required")
    @jakarta.validation.constraints.Size(max = 512)
    @JsonAlias("token")
    private String fcmToken;
    
    @jakarta.validation.constraints.Size(max = 50)
    private String deviceType; // "android", "ios", "web"
}
