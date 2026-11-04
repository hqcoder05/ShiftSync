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
            log.info("Đã gửi thông báo thời gian thực qua WebSocket đến /topic/notifications/{}", userId);
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo qua WebSocket cho người dùng {}: {}", userId, e.getMessage());
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
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()
                && org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() { sendStoreEvent(storeId, domain, action, data); }
                    });
            return;
        }
        sendStoreEvent(storeId, domain, action, data);
    }

    private void sendStoreEvent(UUID storeId, String domain, String action, Object data) {
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
            log.info("Đã gửi sự kiện cửa hàng: nhóm={}, hành động={}, mã cửa hàng={}", domain, action, storeId);
        } catch (Exception e) {
            log.warn("Không thể gửi sự kiện cửa hàng qua WebSocket: {}", e.getMessage());
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
            log.warn("Không thể gửi sự kiện hệ thống qua WebSocket: {}", e.getMessage());
        }
    }
}
