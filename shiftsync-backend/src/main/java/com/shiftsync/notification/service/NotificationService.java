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

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final UserDeviceTokenRepository userDeviceTokenRepository;
    private final NotificationPreferenceRepository preferenceRepository;

    @Async
    public void sendNotification(UUID userId, NotificationType type, String title, String body, Map<String, String> data) {
        try {
            // Check preference
            if (type != null) {
                NotificationPreference pref = preferenceRepository.findByStaffIdAndNotificationType(userId, type).orElse(null);
                if (pref != null && !pref.isEnabled()) {
                    log.info("User {} disabled notification for type {}. Skipping.", userId, type);
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
                .setNotification(Notification.builder()
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
}
