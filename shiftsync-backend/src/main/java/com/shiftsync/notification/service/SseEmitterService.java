package com.shiftsync.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Dịch vụ quản lý kết nối Server-Sent Events (SSE) để truyền phát thông báo thời gian thực tới Web Client.
 *
 * Giới hạn: SseEmitter lưu trong memory của instance hiện tại. Nếu scale ngang nhiều instance backend,
 * notification tạo ở instance A sẽ không tới được client đang giữ SSE ở instance B — cần Redis Pub/Sub
 * để fan-out giữa các instance trong tương lai nếu mở rộng.
 */
@Service
@Slf4j
public class SseEmitterService {

    private static final long SSE_TIMEOUT = 30 * 60 * 1000L; // 30 phút

    private final Map<UUID, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    /**
     * Đăng ký một kết nối SSE mới cho người dùng.
     * Hỗ trợ một người dùng mở nhiều tab/thiết bị cùng lúc.
     */
    public SseEmitter subscribe(UUID userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        emitter.onCompletion(() -> {
            log.debug("SSE completed for user {}", userId);
            removeEmitter(userId, emitter);
        });

        emitter.onTimeout(() -> {
            log.debug("SSE timeout for user {}", userId);
            removeEmitter(userId, emitter);
        });

        emitter.onError(e -> {
            log.debug("SSE error for user {}: {}", userId, e != null ? e.getMessage() : "unknown");
            removeEmitter(userId, emitter);
        });

        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.info("Registered new SSE emitter for user {}. Total user active tabs: {}",
                userId, userEmitters.get(userId).size());

        // Gửi event ban đầu để client xác nhận kết nối thành công ngay lập tức
        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("Connected successfully"));
        } catch (IOException e) {
            log.warn("Failed to send initial connect event to user {}: {}", userId, e.getMessage());
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    /**
     * Dọn dẹp emitter khi kết thúc, timeout hoặc gặp lỗi ngắt kết nối.
     */
    public void removeEmitter(UUID userId, SseEmitter emitter) {
        List<SseEmitter> list = userEmitters.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                userEmitters.remove(userId);
                log.debug("Removed last SSE emitter for user {}", userId);
            }
        }
    }

    /**
     * Đẩy sự kiện thông báo tới tất cả các emitter đang mở của một người dùng.
     */
    public void pushToUser(UUID userId, Object payload) {
        List<SseEmitter> list = userEmitters.get(userId);
        if (list == null || list.isEmpty()) {
            log.debug("No active SSE emitters for user {}. Skipping SSE push.", userId);
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(payload));
            } catch (IOException | IllegalStateException e) {
                log.debug("SSE connection closed by client for user {}: {}", userId, e.getMessage());
                deadEmitters.add(emitter);
            } catch (Exception e) {
                log.warn("Unexpected error pushing SSE to user {}: {}", userId, e.getMessage());
            }
        }

        for (SseEmitter dead : deadEmitters) {
            removeEmitter(userId, dead);
        }
    }

    /**
     * Gửi heartbeat định kỳ mỗi 20 giây tới tất cả các client đang kết nối
     * để tránh bị ngắt kết nối bởi Nginx reverse proxy hoặc timeout trung gian.
     */
    @Scheduled(fixedRate = 20000)
    public void sendHeartbeat() {
        if (userEmitters.isEmpty()) {
            return;
        }

        for (Map.Entry<UUID, List<SseEmitter>> entry : userEmitters.entrySet()) {
            UUID userId = entry.getKey();
            List<SseEmitter> list = entry.getValue();
            List<SseEmitter> deadEmitters = new ArrayList<>();

            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (IOException | IllegalStateException e) {
                    deadEmitters.add(emitter);
                } catch (Exception e) {
                    log.warn("Unexpected error sending heartbeat to user {}: {}", userId, e.getMessage());
                }
            }

            for (SseEmitter dead : deadEmitters) {
                removeEmitter(userId, dead);
            }
        }
    }

    public int getActiveEmitterCount(UUID userId) {
        List<SseEmitter> list = userEmitters.get(userId);
        return list != null ? list.size() : 0;
    }

    public int getTotalActiveUsers() {
        return userEmitters.size();
    }
}