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
import java.util.List;
import java.util.UUID;
import com.shiftsync.notification.service.NotificationPreferenceService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "FCM Notification management APIs")
public class NotificationController {

    private final UserDeviceTokenRepository userDeviceTokenRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final NotificationPreferenceService preferenceService;
    private final com.shiftsync.notification.service.SseEmitterService sseEmitterService;

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
                null,
                request.getTitle() != null ? request.getTitle() : "Test Notification", 
                request.getBody() != null ? request.getBody() : "This is a test notification from ShiftSync", 
                request.getData());

        return ResponseEntity.ok().body(Map.of("message", "Test notification triggered"));
    }

    @Operation(summary = "Get notification preferences")
    @GetMapping("/users/me/notification-preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<com.shiftsync.notification.dto.NotificationPreferenceDTO>> getPreferences(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(preferenceService.getPreferences(userDetails.getId()));
    }

    @Operation(summary = "Update a notification preference")
    @PutMapping("/users/me/notification-preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.shiftsync.notification.dto.NotificationPreferenceDTO> updatePreference(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody com.shiftsync.notification.dto.UpdatePreferenceRequest request) {
        return ResponseEntity.ok(preferenceService.updatePreference(userDetails.getId(), request));
    }

    @Operation(summary = "Get in-app notifications for current user")
    @GetMapping("/users/me/notifications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<com.shiftsync.notification.dto.InAppNotificationDTO>> getMyNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(notificationService.getUserNotifications(userDetails.getId()));
    }

    @Operation(summary = "Get unread notifications count for current user")
    @GetMapping("/users/me/notifications/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        long count = notificationService.getUnreadCount(userDetails.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @Operation(summary = "Mark a notification as read")
    @PutMapping("/users/me/notifications/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.shiftsync.notification.dto.InAppNotificationDTO> markAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id) {
        return ResponseEntity.ok(notificationService.markAsRead(userDetails.getId(), id));
    }

    @Operation(summary = "Mark all notifications as read")
    @PutMapping("/users/me/notifications/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getId());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @Operation(summary = "Subscribe to realtime notifications via Server-Sent Events (SSE)")
    @GetMapping(value = "/users/me/notifications/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return sseEmitterService.subscribe(userDetails.getId());
    }
}
