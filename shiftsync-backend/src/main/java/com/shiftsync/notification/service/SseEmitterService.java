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

    private final Map<SseEmitter, java.util.function.BooleanSupplier> sessions = new ConcurrentHashMap<>();

    private final Map<UUID, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    /**
     * Đăng ký một kết nối SSE mới cho người dùng.
     * Hỗ trợ một người dùng mở nhiều tab/thiết bị cùng lúc.
     */
    public SseEmitter subscribe(UUID userId) {
        return subscribe(userId, () -> true);
    }

    public SseEmitter subscribe(UUID userId, java.util.function.BooleanSupplier session) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        sessions.put(emitter, session);

        emitter.onCompletion(() -> {
            log.debug("Kết nối SSE của người dùng {} đã hoàn tất", userId);
            removeEmitter(userId, emitter);
        });

        emitter.onTimeout(() -> {
            log.debug("Kết nối SSE của người dùng {} đã hết thời gian chờ", userId);
            removeEmitter(userId, emitter);
        });

        emitter.onError(e -> {
            log.debug("Lỗi kết nối SSE của người dùng {}: {}", userId, e != null ? e.getMessage() : "unknown");
            removeEmitter(userId, emitter);
        });

        userEmitters.compute(userId, (key, existing) -> {
            List<SseEmitter> list = existing != null ? existing : new CopyOnWriteArrayList<>();
            list.add(emitter);
            return list;
        });
        log.info("Đã đăng ký kết nối SSE cho người dùng {}. Số thẻ đang hoạt động: {}",
                userId, getActiveEmitterCount(userId));

        // Gửi event ban đầu để client xác nhận kết nối thành công ngay lập tức
        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("Connected successfully"));
        } catch (IOException e) {
            log.warn("Không thể gửi sự kiện kết nối ban đầu cho người dùng {}: {}", userId, e.getMessage());
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    /**
     * Dọn dẹp emitter khi kết thúc, timeout hoặc gặp lỗi ngắt kết nối.
     */
    public void removeEmitter(UUID userId, SseEmitter emitter) {
        sessions.remove(emitter);
        userEmitters.computeIfPresent(userId, (key, list) -> {
            list.remove(emitter);
            if (list.isEmpty()) {
                log.debug("Đã xóa kết nối SSE cuối cùng của người dùng {}", userId);
                return null;
            }
            return list;
        });
    }

    /**
     * Đẩy sự kiện thông báo tới tất cả các emitter đang mở của một người dùng.
     */
    public void pushToUser(UUID userId, Object payload) {
        pushEvent(userId, "notification", payload);
    }

    public void pushEvent(UUID userId, String eventName, Object payload) {
        List<SseEmitter> list = userEmitters.get(userId);
        if (list == null || list.isEmpty()) {
            log.debug("Người dùng {} không có kết nối SSE đang hoạt động; bỏ qua gửi SSE.", userId);
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : list) {
            if (!checkSession(userId, emitter)) continue;
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            } catch (IOException | IllegalStateException e) {
                log.debug("Phía người dùng {} đã đóng kết nối SSE: {}", userId, e.getMessage());
                deadEmitters.add(emitter);
            } catch (Exception e) {
                log.warn("Lỗi bất ngờ khi gửi SSE cho người dùng {}: {}", userId, e.getMessage());
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
                if (!checkSession(userId, emitter)) continue;
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (IOException | IllegalStateException e) {
                    deadEmitters.add(emitter);
                } catch (Exception e) {
                    log.warn("Lỗi bất ngờ khi gửi tín hiệu duy trì kết nối cho người dùng {}: {}", userId, e.getMessage());
                }
            }

            for (SseEmitter dead : deadEmitters) {
                removeEmitter(userId, dead);
            }
        }
    }

    private boolean checkSession(UUID userId, SseEmitter emitter) {
        var session = sessions.get(emitter);
        boolean active = false;
        try { active = session != null && session.getAsBoolean(); }
        catch (RuntimeException ignored) { /* Do not send data when validation fails. */ }
        if (!active) {
            removeEmitter(userId, emitter);
            emitter.complete();
        }
        return active;
    }

    public int getActiveEmitterCount(UUID userId) {
        List<SseEmitter> list = userEmitters.get(userId);
        return list != null ? list.size() : 0;
    }

    public int getTotalActiveUsers() {
        return userEmitters.size();
    }
}
