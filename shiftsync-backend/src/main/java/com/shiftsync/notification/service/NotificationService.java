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

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final UserDeviceTokenRepository userDeviceTokenRepository;

    public void sendNotification(UUID userId, String title, String body, Map<String, String> data) {
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
            BatchResponse response = FirebaseMessaging.getInstance().sendMulticast(message);
            log.info("Sent {} messages to user {}. Success: {}, Failure: {}", 
                    fcmTokens.size(), userId, response.getSuccessCount(), response.getFailureCount());
            
            // Handle failures (e.g., remove invalid tokens)
            if (response.getFailureCount() > 0) {
                List<SendResponse> responses = response.getResponses();
                for (int i = 0; i < responses.size(); i++) {
                    if (!responses.get(i).isSuccessful()) {
                        String errorCode = responses.get(i).getException().getMessagingErrorCode().name();
                        String failedToken = fcmTokens.get(i);
                        log.warn("Failed to send to token {}: {}", failedToken, errorCode);
                        
                        // If token is unregistered, delete it from DB
                        if ("UNREGISTERED".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode)) {
                            removeToken(failedToken);
                        }
                    }
                }
            }
        } catch (FirebaseMessagingException e) {
            log.error("Error sending Firebase notification to user {}", userId, e);
        } catch (Exception e) {
            log.error("Unexpected error when sending notification", e);
        }
    }

    @Transactional
    public void removeToken(String fcmToken) {
        userDeviceTokenRepository.deleteByFcmToken(fcmToken);
        log.info("Removed invalid FCM token");
    }
}
