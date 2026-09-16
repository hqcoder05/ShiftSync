package com.shiftsync.notification.service;

import com.google.firebase.messaging.*;
import com.shiftsync.notification.entity.UserDeviceToken;
import com.shiftsync.notification.repository.UserDeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Async;
import com.shiftsync.notification.entity.NotificationPreference;
import com.shiftsync.notification.entity.NotificationType;
import com.shiftsync.notification.repository.NotificationPreferenceRepository;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.notification.dto.InAppNotificationDTO;
import com.shiftsync.notification.entity.Notification;
import com.shiftsync.notification.repository.NotificationRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final UserDeviceTokenRepository userDeviceTokenRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SseEmitterService sseEmitterService;
    private final com.shiftsync.shared.websocket.RealtimeEventPublisher realtimeEventPublisher;

    @Async
    public void sendNotification(UUID userId, NotificationType type, String title, String body, Map<String, String> data) {
        try {
            // Save in-app notification record
            try {
                createInAppNotification(userId, type != null ? type.name() : "GENERAL", title, body);
            } catch (Exception e) {
                log.warn("Failed to persist in-app notification for user {}: {}", userId, e.getMessage());
            }

            // Check preference
            if (type != null) {
                NotificationPreference pref = preferenceRepository.findByStaffIdAndNotificationType(userId, type).orElse(null);
                if (pref != null && !pref.isEnabled()) {
                    log.info("User {} disabled notification for type {}. Skipping push notification.", userId, type);
                    return;
                }
            }

            List<UserDeviceToken> tokens = userDeviceTokenRepository.findByUserId(userId);
            
            if (tokens.isEmpty()) {
                log.info("No device tokens found for user: {}", userId);
                return;
            }

        List<String> fcmTokens = tokens.stream()
                .map(UserDeviceToken::getFcmToken)
                .collect(Collectors.toList());

        MulticastMessage.Builder messageBuilder = MulticastMessage.builder()
                .setNotification(com.google.firebase.messaging.Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .addAllTokens(fcmTokens);

        if (data != null && !data.isEmpty()) {
            messageBuilder.putAllData(data);
        }

        MulticastMessage message = messageBuilder.build();

        try {
            BatchResponse response = com.google.firebase.messaging.FirebaseMessaging.getInstance().sendEachForMulticast(message);
            log.info("Sent {} messages to user {}. Success: {}, Failure: {}", 
                    fcmTokens.size(), userId, response.getSuccessCount(), response.getFailureCount());
            
            if (response.getFailureCount() > 0) {
                for (int i = 0; i < response.getResponses().size(); i++) {
                    com.google.firebase.messaging.SendResponse sendResponse = response.getResponses().get(i);
                    if (!sendResponse.isSuccessful()) {
                        String errorCode = sendResponse.getException().getMessagingErrorCode().name();
                        String failedToken = fcmTokens.get(i);
                        log.warn("Failed to send to token {}: {}", failedToken, errorCode);
                        
                        // If token is unregistered, delete it from DB
                        if ("UNREGISTERED".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode)) {
                            removeToken(failedToken);
                        }
                    }
                }
            }
        } catch (com.google.firebase.messaging.FirebaseMessagingException e) {
            log.error("Error sending Firebase notification to user {}", userId, e);
        } catch (Exception e) {
            log.error("Unexpected error when sending notification", e);
        }
        } catch (Exception e) {
            log.error("Async execution error in sendNotification for user {}", userId, e);
        }
    }

    @Transactional
    public void removeToken(String fcmToken) {
        userDeviceTokenRepository.deleteByFcmToken(fcmToken);
        log.info("Removed invalid FCM token");
    }

    @Transactional
    public InAppNotificationDTO createInAppNotification(UUID userId, String type, String title, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Notification notif = Notification.builder()
                .staff(user)
                .type(type != null ? type : "GENERAL")
                .title(title)
                .message(message)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notif);
        InAppNotificationDTO dto = mapToDTO(saved);

        // Đẩy thông báo thời gian thực qua Server-Sent Events (SSE)
        try {
            sseEmitterService.pushToUser(userId, dto);
        } catch (Exception e) {
            log.warn("Failed to push SSE notification to user {}: {}", userId, e.getMessage());
        }

        // Đẩy thông báo thời gian thực qua WebSocket
        try {
            realtimeEventPublisher.publishNotification(userId, dto);
        } catch (Exception e) {
            log.warn("Failed to push WebSocket notification to user {}: {}", userId, e.getMessage());
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public List<InAppNotificationDTO> getUserNotifications(UUID userId) {
        return notificationRepository.findByStaffIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByStaffIdAndIsReadFalse(userId);
    }

    @Transactional
    public InAppNotificationDTO markAsRead(UUID userId, UUID notificationId) {
        Notification notif = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new com.shiftsync.shared.exception.BusinessException("Notification not found", org.springframework.http.HttpStatus.NOT_FOUND));

        if (!notif.getStaff().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to access this notification");
        }

        notif.setRead(true);
        Notification saved = notificationRepository.save(notif);
        return mapToDTO(saved);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsRead(userId);
    }

    private InAppNotificationDTO mapToDTO(Notification entity) {
        return InAppNotificationDTO.builder()
                .id(entity.getId())
                .type(entity.getType())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .isRead(entity.isRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
