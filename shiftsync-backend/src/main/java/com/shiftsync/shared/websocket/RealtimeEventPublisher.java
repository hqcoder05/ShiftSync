package com.shiftsync.shared.websocket;

import com.shiftsync.notification.dto.InAppNotificationDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast notification directly to a specific user
     */
    public void publishNotification(UUID userId, InAppNotificationDTO notification) {
        try {
            // Push to personal topic
            String userDest = "/topic/notifications/" + userId;
            messagingTemplate.convertAndSend(userDest, (Object) notification);
            // Also push to generic notifications topic with recipientId
            Map<String, Object> genericPayload = Map.of(
                    "type", "NEW_NOTIFICATION",
                    "userId", userId.toString(),
                    "notification", notification,
                    "timestamp", Instant.now().toString()
            );
            messagingTemplate.convertAndSend("/topic/notifications", (Object) genericPayload);
            log.info("Published realtime notification via WebSocket to /topic/notifications/{}", userId);
        } catch (Exception e) {
            log.warn("Failed to publish notification via WebSocket to user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Broadcast store-specific events (shifts, attendance, requests, marketplace)
     */
    public void publishStoreEvent(UUID storeId, String domain, Object data) {
        publishStoreEvent(storeId, domain, "UPDATED", data);
    }

    /**
     * Broadcast store-specific events (shifts, attendance, requests, marketplace)
     */
    public void publishStoreEvent(UUID storeId, String domain, String action, Object data) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("domain", domain != null ? domain : "");
            payload.put("action", action != null ? action : "UPDATED");
            payload.put("storeId", storeId != null ? storeId.toString() : "");
            payload.put("data", data != null ? data : java.util.Map.of());
            payload.put("timestamp", Instant.now().toString());

            if (storeId != null && domain != null) {
                String storeDest = "/topic/store/" + storeId + "/" + domain.toLowerCase();
                messagingTemplate.convertAndSend(storeDest, (Object) payload);
            }
            if (domain != null) {
                // Also broadcast to general domain topic for multi-store managers/admins
                String domainDest = "/topic/" + domain.toLowerCase();
                messagingTemplate.convertAndSend(domainDest, (Object) payload);
            }
            log.info("Published realtime store event: domain={}, action={}, storeId={}", domain, action, storeId);
        } catch (Exception e) {
            log.warn("Failed to publish store event via WebSocket: {}", e.getMessage());
        }
    }

    /**
     * Broadcast system-wide events
     */
    public void publishSystemEvent(String eventType, Object data) {
        try {
            Map<String, Object> payload = Map.of(
                    "eventType", eventType,
                    "data", data != null ? data : Map.of(),
                    "timestamp", Instant.now().toString()
            );
            messagingTemplate.convertAndSend("/topic/system", (Object) payload);
        } catch (Exception e) {
            log.warn("Failed to publish system event via WebSocket: {}", e.getMessage());
        }
    }
}
