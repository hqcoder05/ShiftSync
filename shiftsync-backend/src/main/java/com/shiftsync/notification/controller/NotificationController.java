package com.shiftsync.notification.controller;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.notification.dto.RegisterTokenRequest;
import com.shiftsync.notification.dto.TestNotificationRequest;
import com.shiftsync.notification.entity.UserDeviceToken;
import com.shiftsync.notification.repository.UserDeviceTokenRepository;
import com.shiftsync.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "FCM Notification management APIs")
public class NotificationController {

    private final UserDeviceTokenRepository userDeviceTokenRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Operation(summary = "Register FCM token for current user")
    @PostMapping("/users/me/fcm-token")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> registerToken(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody RegisterTokenRequest request) {
        
        Optional<UserDeviceToken> existingToken = userDeviceTokenRepository
                .findByUserIdAndFcmToken(userDetails.getId(), request.getFcmToken());

        if (existingToken.isEmpty()) {
            User user = userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            UserDeviceToken newToken = UserDeviceToken.builder()
                    .user(user)
                    .fcmToken(request.getFcmToken())
                    .deviceType(request.getDeviceType())
                    .build();
            userDeviceTokenRepository.save(newToken);
        }

        return ResponseEntity.ok().body(Map.of("message", "Token registered successfully"));
    }

    @Operation(summary = "Send a test notification to yourself")
    @PostMapping("/notifications/test")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> sendTestNotification(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody TestNotificationRequest request) {
        
        notificationService.sendNotification(
                userDetails.getId(), 
                request.getTitle() != null ? request.getTitle() : "Test Notification", 
                request.getBody() != null ? request.getBody() : "This is a test notification from ShiftSync", 
                request.getData());

        return ResponseEntity.ok().body(Map.of("message", "Test notification triggered"));
    }
}
