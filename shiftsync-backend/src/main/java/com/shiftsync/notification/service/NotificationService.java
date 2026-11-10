package com.shiftsync.notification.service;

import com.google.firebase.messaging.*;
import com.shiftsync.notification.entity.UserDeviceToken;
import com.shiftsync.notification.repository.UserDeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.TaskScheduler;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Duration;
import java.time.Instant;
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
    private final @org.springframework.beans.factory.annotation.Qualifier("notificationExecutor") java.util.concurrent.Executor notificationExecutor;
    private final @org.springframework.beans.factory.annotation.Qualifier("taskScheduler") TaskScheduler taskScheduler;

    // Removed @Async so this executes in caller's thread, allowing transaction sync.
    public void sendNotification(UUID userId, NotificationType type, String title, String body, Map<String, String> data) {
        Runnable task = () -> executeSendNotification(userId, type, title, body, data);

        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        submitNotification(task);
                    }
                }
            );
        } else {
            submitNotification(task);
        }
    }

    /**
     * The settings-page test must be observable immediately. Persist and publish
     * the in-app record before returning HTTP success; the optional FCM delivery
     * can remain asynchronous.
     */
    @Transactional
    public InAppNotificationDTO sendTestNotification(UUID userId, String title, String body, Map<String, String> data) {
        InAppNotificationDTO notification = createInAppNotification(userId, "GENERAL", title, body);
        submitNotification(() -> sendPushNotification(userId, null, title, body, data));
        return notification;
    }

    /** Schedules a background-push test that survives the caller closing its tab. */
    public void scheduleTestNotification(UUID userId, String title, String body, Map<String, String> data, Duration delay) {
        taskScheduler.schedule(
                () -> sendNotification(userId, null, title, body, data),
                Instant.now().plus(delay));
    }

    private void submitNotification(Runnable task) {
        try {
            java.util.concurrent.CompletableFuture.runAsync(task, notificationExecutor);
        } catch (java.util.concurrent.RejectedExecutionException rejected) {
            log.warn("Hàng đợi thông báo đầy; chuyển sang bộ thực thi dự phòng", rejected);
            try {
                java.util.concurrent.CompletableFuture.runAsync(task);
            } catch (java.util.concurrent.RejectedExecutionException fallbackRejected) {
                log.error("Không thể đưa thông báo vào hàng đợi dự phòng", fallbackRejected);
            }
        }
    }
    
    private void executeSendNotification(UUID userId, NotificationType type, String title, String body, Map<String, String> data) {
        try {
            // Save in-app notification record
            try {
                createInAppNotification(userId, type != null ? type.name() : "GENERAL", title, body);
            } catch (Exception e) {
                log.warn("Không thể lưu thông báo trong ứng dụng cho người dùng {}: {}", userId, e.getMessage());
            }

            sendPushNotification(userId, type, title, body, data);
        } catch (Exception e) {
            log.error("Lỗi xử lý bất đồng bộ khi gửi thông báo cho người dùng {}", userId, e);
        }
    }

    private void sendPushNotification(UUID userId, NotificationType type, String title, String body, Map<String, String> data) {
        // Check preference
        if (type != null) {
            NotificationPreference pref = preferenceRepository.findByStaffIdAndNotificationType(userId, type).orElse(null);
            if (pref != null && !pref.isEnabled()) {
                log.info("Người dùng {} đã tắt loại thông báo {}; bỏ qua thông báo đẩy.", userId, type);
                return;
            }
        }

        List<UserDeviceToken> tokens = userDeviceTokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            log.info("Không tìm thấy mã thiết bị của người dùng: {}", userId);
            return;
        }

        List<String> fcmTokens = tokens.stream()
                .map(UserDeviceToken::getFcmToken)
                .collect(Collectors.toList());

        // Send a data-only FCM message. The service worker renders exactly one
        // Windows notification while the app is in the background; an FCM
        // notification payload would be auto-rendered first and cause a duplicate.
        Map<String, String> pushData = new HashMap<>();
        if (data != null) {
            pushData.putAll(data);
        }
        pushData.putIfAbsent("title", title);
        pushData.putIfAbsent("message", body);
        if (type != null) {
            pushData.putIfAbsent("type", type.name());
        }

        MulticastMessage.Builder messageBuilder = MulticastMessage.builder()
                .addAllTokens(fcmTokens)
                .putAllData(pushData);

        MulticastMessage message = messageBuilder.build();

        try {
            BatchResponse response = com.google.firebase.messaging.FirebaseMessaging.getInstance().sendEachForMulticast(message);
            log.info("Đã gửi {} thông báo đến người dùng {}. Thành công: {}, thất bại: {}",
                    fcmTokens.size(), userId, response.getSuccessCount(), response.getFailureCount());
            
            if (response.getFailureCount() > 0) {
                for (int i = 0; i < response.getResponses().size(); i++) {
                    com.google.firebase.messaging.SendResponse sendResponse = response.getResponses().get(i);
                    if (!sendResponse.isSuccessful()) {
                        String errorCode = sendResponse.getException().getMessagingErrorCode().name();
                        String failedToken = fcmTokens.get(i);
                        log.warn("Không gửi được thông báo cho thiết bị của người dùng {}: {}", userId, errorCode);
                        
                        // If token is unregistered, delete it from DB
                        if ("UNREGISTERED".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode)) {
                            userDeviceTokenRepository.deleteByUserIdAndFcmToken(userId, failedToken);
                        }
                    }
                }
            }
        } catch (com.google.firebase.messaging.FirebaseMessagingException e) {
            log.error("Lỗi gửi thông báo Firebase cho người dùng {}", userId, e);
        } catch (Exception e) {
            log.error("Lỗi bất ngờ khi gửi thông báo", e);
        }
    }

    @Transactional
    public void removeToken(String fcmToken) {
        userDeviceTokenRepository.deleteByFcmToken(fcmToken);
        log.info("Đã xóa mã thiết bị FCM không hợp lệ");
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
            log.warn("Không thể gửi thông báo SSE cho người dùng {}: {}", userId, e.getMessage());
        }

        // Đẩy thông báo thời gian thực qua WebSocket
        try {
            realtimeEventPublisher.publishNotification(userId, dto);
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo WebSocket cho người dùng {}: {}", userId, e.getMessage());
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


