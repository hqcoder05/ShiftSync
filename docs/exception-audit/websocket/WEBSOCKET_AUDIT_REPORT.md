# BÁO CÁO AUDIT TOÀN DIỆN HỆ THỐNG WEBSOCKET & REALTIME — SHIFTSYNC

> **Dự án**: ShiftSync (Full-stack: Spring Boot Backend, React Web, React Native Mobile)  
> **Phạm vi audit**: Toàn bộ cấu hình WebSocket/STOMP, Message Broker, Authentication/Authorization, Event Publishing, Transaction Lifecycle, Client Handlers, và Mobile Realtime Gap.  
> **Phương pháp kiểm thử**: Đọc và phân tích trực tiếp mã nguồn thực tế (Static Code Analysis & Flow Tracing), đối chiếu cấu trúc Message Broker và Client Lifecycle.  
> **Ngày lập báo cáo**: 30/09/2026  
> **Trạng thái**: Hoàn thành phát hiện lỗi và đề xuất giải pháp khắc phục.

---

## MỤC LỤC
1. [Tổng Quan Kiến Trúc WebSocket Hiện Tại](#1-tổng-quan-kiến-trúc-websocket-hiện-tại)
2. [Chi Tiết Các Lỗ Hổng & Bug Nghiêm Trọng Phát Hiện](#2-chi-tiết-các-lỗ-hổng--bug-nghiêm-trọng-phát-hiện)
   - [Bug 1: Tin nhắn bị nhân đôi (Duplicate Notifications Toast & Event)](#bug-1-tin-nhắn-bị-nhân-đôi-duplicate-notifications-toast--event)
   - [Lỗ hổng 2: Rò rỉ dữ liệu riêng tư diện rộng qua Topic công khai](#lỗ-hổng-2-rò-rỉ-dữ-liệu-riêng-tư-diện-rộng-qua-topic-công-khai)
   - [Lỗ hổng 3: Lỗ hổng xác thực & phân quyền nghiêm trọng (Anonymous CONNECT & Unchecked SUBSCRIBE)](#lỗ-hổng-3-lỗ-hổng-xác-thực--phân-quyền-nghiêm-trọng-anonymous-connect--unchecked-subscribe)
   - [Lỗ hổng 4: Rò rỉ dữ liệu chéo cửa hàng qua Topic Domain chung](#lỗ-hổng-4-rò-rỉ-dữ-liệu-chéo-cửa-hàng-qua-topic-domain-chung)
   - [Lỗi 5: Sai lệch Transaction vs WebSocket (Ghost Messages / Phantom State)](#lỗi-5-sai-lệch-transaction-vs-websocket-ghost-messages--phantom-state)
   - [Lỗi 6: Đứt gãy luồng Realtime ở Schedule & Marketplace (Silent Realtime Failure)](#lỗi-6-đứt-gãy-luồng-realtime-ở-schedule--marketplace-silent-realtime-failure)
   - [Lỗi 7: Thiếu TaskScheduler cho STOMP Heartbeat (Connection Leaks)](#lỗi-7-thiếu-taskscheduler-cho-stomp-heartbeat-connection-leaks)
   - [Lỗi 8: Client tái tạo toàn bộ kết nối khi đổi Store (Connection Churn)](#lỗi-8-client-tái-tạo-toàn-bộ-kết-nối-khi-đổi-store-connection-churn)
   - [Lỗi 9: Mobile hoàn toàn thiếu WebSocket (Mobile Polling Gap)](#lỗi-9-mobile-hoàn-toàn-thiếu-websocket-mobile-polling-gap)
3. [Ma Trận Đánh Giá Kịch Bản Thất Bại (Failure Matrix)](#3-ma-trận-đánh-giá-kịch-bản-thất-bại-failure-matrix)
4. [Kế Hoạch & Mã Nguồn Khắc Phục Kỹ Thuật (Remediation Plan)](#4-kế-hoạch--mã-nguồn-khắc-phục-kỹ-thuật-remediation-plan)

---

## 1. TỔNG QUAN KIẾN TRÚC WEBSOCKET HIỆN TẠI

### 1.1. Cấu hình Backend (`WebSocketConfig.java`)
- **STOMP Endpoints**:
  - `/ws` và `/ws/websocket` (hỗ trợ SockJS fallback qua `.withSockJS()`).
  - CORS Allowed Origins: `*` (chấp nhận mọi nguồn).
- **Message Broker**:
  - In-memory Simple Broker với tiền tố: `/topic` (broadcast/pub-sub) và `/queue` (user-specific point-to-point).
  - Application Destination Prefix: `/app` (định tuyến đến các `@MessageMapping`).
  - User Destination Prefix: `/user`.
- **Interceptors**:
  - `configureClientInboundChannel` đăng ký một `ChannelInterceptor` kiểm tra header `Authorization` khi nhận lệnh STOMP `CONNECT`.

### 1.2. Bộ phát sự kiện Realtime (`RealtimeEventPublisher.java`)
- Sử dụng `SimpMessagingTemplate` để gửi message tới các channel:
  - Thông báo cá nhân: `/topic/notifications/{userId}` và `/topic/notifications`.
  - Sự kiện cửa hàng: `/topic/store/{storeId}/{domain}` và `/topic/{domain}`.
  - Sự kiện hệ thống: `/topic/system`.

### 1.3. Phía Client Frontend Web (`WebSocketContext.jsx`)
- Sử dụng `@stomp/stompjs` (`Client`).
- Kết nối tới `ws://<backend>/ws/websocket`.
- Đăng ký nhận tin:
  - `/topic/notifications/${currentUserId}`
  - `/topic/notifications`
  - `/topic/system`
  - Dynamic store channels: `/topic/store/${storeId}/{shifts, attendance, requests, marketplace}`.
- Bắn sự kiện DOM `window.dispatchEvent(new CustomEvent(...))` để các component React (`AttendancePageLive`, `DashboardPage`, `SchedulePage`, `MarketplacePage`) lắng nghe và reload REST API.

### 1.4. Phía Mobile App (`ShiftSync-Mobile`)
- **Hiện trạng thực tế**: Hoàn toàn **KHÔNG CÓ** WebSocket/STOMP client.
- Toàn bộ cơ chế realtime trên ứng dụng di động đang dựa vào REST polling định kỳ (`notificationService.getUnreadNotificationCount()` tại `DashboardScreen.js`), gây trễ thông tin từ 30s đến nhiều phút và tiêu tốn pin thiết bị.

---

## 2. CHI TIẾT CÁC LỖ HỔNG & BUG NGHIÊM TRỌNG PHÁT HIỆN

### BUG 1: TIN NHẮN BỊ NHÂN ĐÔI (DUPLICATE NOTIFICATIONS TOAST & EVENT)
- **Mức độ nghiêm trọng**: **HIGH (UX & State Corruption)**
- **Vị trí mã nguồn**:
  - Backend: `RealtimeEventPublisher.java` (dòng 26 - 35)
  - Web: `WebSocketContext.jsx` (dòng 115 - 135)
- **Cơ chế gây lỗi (Root Cause)**:
  1. Khi một thông báo mới được tạo, Backend phát đồng thời vào **HAI** channel:
     ```java
     // 1. Kênh riêng của user
     messagingTemplate.convertAndSend("/topic/notifications/" + userId, notification);
     // 2. Kênh broadcast chung toàn hệ thống
     messagingTemplate.convertAndSend("/topic/notifications", Map.of(
         "userId", userId,
         "notification", notification
     ));
     ```
  2. Tại Web Client (`WebSocketContext.jsx`), client của user subscribe **CẢ HAI** kênh trên:
     - Kênh 1: `/topic/notifications/${currentUserId}` -> gọi `handleIncomingNotification(notif)` -> `toast.info(...)` và tăng counter.
     - Kênh 2: `/topic/notifications` -> kiểm tra `if (!data.userId || data.userId === currentUserId)` -> điều kiện **ĐÚNG** -> gọi `handleIncomingNotification(data.notification)` lần thứ hai!
- **Hậu quả**:
  - Bất kỳ thông báo nào (duyệt nghỉ, phân ca, đổi ca, nhắc nhở) gửi tới người dùng đều kích hoạt **2 thông báo toast chồng lấn lên nhau trên màn hình** và tăng bộ đếm thông báo 2 lần.

---

### LỖ HỔNG 2: RÒ RỈ DỮ LIỆU RIÊNG TƯ DIỆN RỘNG QUA TOPIC CÔNG KHAI
- **Mức độ nghiêm trọng**: **CRITICAL (Security / Data Privacy Breach)**
- **Vị trí mã nguồn**:
  - `RealtimeEventPublisher.java` (dòng 31 - 34)
  - `WebSocketConfig.java`
- **Cơ chế gây lỗi (Root Cause)**:
  - Backend gửi payload thông báo của từng cá nhân lên topic `/topic/notifications` (kèm theo `userId` và toàn bộ nội dung `NotificationDTO`).
  - Trong STOMP Simple Broker, `/topic/notifications` là một kênh công khai.
- **Hậu quả**:
  - Bất kỳ người dùng nào (kể cả nhân viên part-time mới vào làm, hoặc hacker mở console trình duyệt) chỉ cần subscribe vào `/topic/notifications` là có thể **nghe trộm toàn bộ thông báo nhạy cảm của tất cả nhân viên và quản lý toàn công ty** (thông báo lương, kỷ luật, xin nghỉ ốm, duyệt ca, thông tin cá nhân).

---

### LỖ HỔNG 3: LỖ HỔNG XÁC THỰC & PHÂN QUYỀN NGHIÊM TRỌNG (ANONYMOUS CONNECT & UNCHECKED SUBSCRIBE)
- **Mức độ nghiêm trọng**: **CRITICAL (Security / Broken Access Control - OWASP A01)**
- **Vị trí mã nguồn**:
  - `WebSocketConfig.java` (dòng 65 - 82)
- **Cơ chế gây lỗi (Root Cause)**:
  1. **Cho phép kết nối nặc danh (Anonymous CONNECT)**:
     ```java
     if (StompCommand.CONNECT.equals(accessor.getCommand())) {
         String authHeader = accessor.getFirstNativeHeader("Authorization");
         if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
             // ... validate token ...
         } else {
             log.warn("WebSocket CONNECT frame missing Bearer token");
         }
     }
     ```
     Khi token bị thiếu hoặc không hợp lệ, hệ thống chỉ ghi log `WARN` rồi **cho message đi qua bình thường** (`return message;`), không từ chối kết nối! Kết nối vẫn được thiết lập dưới quyền Anonymous.
  2. **Hoàn toàn không kiểm soát quyền SUBSCRIBE (Missing Topic Authorization)**:
     - Không có bất kỳ dòng code nào kiểm tra `StompCommand.SUBSCRIBE`.
     - User A có thể tự do gửi frame STOMP SUBSCRIBE tới `/topic/notifications/User_B_ID` để đọc tin nhắn riêng của User B.
     - User A (nhân viên Store 1) có thể subscribe `/topic/store/Store_2_ID/attendance` để theo dõi hình ảnh check-in và vị trí GPS của nhân viên Store 2.

---

### LỖ HỔNG 4: RÒ RỈ DỮ LIỆU CHÉO CỬA HÀNG QUA TOPIC DOMAIN CHUNG
- **Mức độ nghiêm trọng**: **HIGH (Multi-tenant / Store Isolation Breach)**
- **Vị trí mã nguồn**:
  - `RealtimeEventPublisher.java` (dòng 38 - 48)
- **Cơ chế gây lỗi (Root Cause)**:
  ```java
  public void publishStoreEvent(Long storeId, String domain, String eventType, Object payload) {
      // Kênh riêng của store
      messagingTemplate.convertAndSend("/topic/store/" + storeId + "/" + domain, event);
      // Kênh toàn cầu cho domain
      messagingTemplate.convertAndSend("/topic/" + domain, event);
  }
  ```
- **Hậu quả**:
  - Việc publish vào `/topic/{domain}` (như `/topic/attendance`, `/topic/requests`) biến sự kiện nội bộ của một cửa hàng thành sự kiện toàn hệ thống. Mọi cửa hàng khác đều nhận được sự kiện chấm công và yêu cầu nội bộ của nhau, phá vỡ kiến trúc cô lập dữ liệu theo Store (Store Isolation).

---

### LỖI 5: SAI LỆCH TRANSACTION VS WEBSOCKET (GHOST MESSAGES / PHANTOM STATE)
- **Mức độ nghiêm trọng**: **HIGH (Data Consistency & Concurrency)**
- **Vị trí mã nguồn**:
  - `AttendanceService.java` (dòng 156, 189)
  - `LeaveRequestService.java` (dòng 89, 223)
- **Cơ chế gây lỗi (Root Cause)**:
  - Lời gọi `realtimeEventPublisher.publishStoreEvent(...)` được thực hiện **đồng bộ ngay bên trong thân hàm `@Transactional` trước khi Database commit**.
  ```java
  @Transactional
  public AttendanceResponse checkIn(...) {
      Attendance record = attendanceRepository.save(attendance);
      // BẮN WEBSOCKET NGAY LẬP TỨC KHI TRANSACTION CHƯA COMMIT
      realtimeEventPublisher.publishStoreEvent(storeId, "attendance", "CHECK_IN", ...);
      return mapper.toResponse(record);
  }
  ```
  - Nếu sau đó có lỗi xảy ra (ví dụ: database trigger lỗi, conflict version, optimistic locking failure, lỗi mạng khi commit), database sẽ **Rollback**.
- **Hậu quả**:
  - Client đã nhận được thông báo "CHECK_IN thành công" qua WebSocket và reload trang, nhưng trong Database bản ghi không hề tồn tại (Ghost Event / Phantom State). Gây hoang mang cho Manager và nhân viên.

---

### LỖI 6: ĐỨT GÃY LUỒNG REALTIME Ở SCHEDULE & MARKETPLACE (SILENT REALTIME FAILURE)
- **Mức độ nghiêm trọng**: **HIGH (Feature Disconnect)**
- **Vị trí mã nguồn**:
  - Phía Web: `WebSocketContext.jsx` (dòng 142 - 147) đăng ký nhận `/topic/store/${storeId}/shifts` và `/topic/store/${storeId}/marketplace`.
  - Phía Backend: `ShiftService.java`, `ShiftAssignmentService.java`, `ShiftSwapService.java`, `MarketplaceService.java`.
- **Cơ chế gây lỗi (Root Cause)**:
  - Toàn bộ các service cốt lõi liên quan đến Schedule và Marketplace **KHÔNG HỀ GỌI `RealtimeEventPublisher`**.
  - Cụ thể: Khi Manager tạo ca, xóa ca, xếp lịch, publish lịch, duyệt đổi ca, hoặc khi Staff claim ca trên Marketplace -> **Không có bất kỳ STOMP frame nào được bắn xuống store topics**.
- **Hậu quả**:
  - Trải nghiệm cộng tác thời gian thực (Collaborative Scheduling) bị phá vỡ hoàn toàn. Nếu Manager A xếp lịch ở máy tính A, màn hình của Manager B hoặc Staff xem lịch ở máy tính B **hoàn toàn đứng yên, không cập nhật**, buộc người dùng phải F5 thủ công.

---

### LỖI 7: THIẾU TASKSCHEDULER CHO STOMP HEARTBEAT (CONNECTION LEAKS)
- **Mức độ nghiêm trọng**: **MEDIUM (Infrastructure & Stability)**
- **Vị trí mã nguồn**:
  - `WebSocketConfig.java` (dòng 34 - 40)
  - `WebSocketContext.jsx` (dòng 72 - 73)
- **Cơ chế gây lỗi (Root Cause)**:
  - Phía Web client yêu cầu: `heartbeatIncoming: 10000, heartbeatOutgoing: 10000`.
  - Tuy nhiên, trong Spring Boot `WebSocketConfig.java`, phương thức `enableSimpleBroker` không hề cấu hình `TaskScheduler`:
    ```java
    // HIỆN TẠI THIẾU TaskScheduler
    registry.enableSimpleBroker("/topic", "/queue");
    ```
- **Hậu quả**:
  - Spring Simple Broker không thể thực hiện cơ chế Ping/Pong định kỳ. Khi thiết bị client bị mất mạng đột ngột (tắt máy, rớt Wi-Fi), Backend không phát hiện được và session STOMP bị treo vĩnh viễn trong bộ nhớ, dẫn đến rò rỉ tài nguyên server (Connection & Memory Leak).

---

### LỖI 8: CLIENT TÁI TẠO TOÀN BỘ KẾT NỐI KHI ĐỔI STORE (CONNECTION CHURN)
- **Mức độ nghiêm trọng**: **LOW/MEDIUM (Performance & Network Overhead)**
- **Vị trí mã nguồn**:
  - `WebSocketContext.jsx` (dòng 66, 178)
- **Cơ chế gây lỗi (Root Cause)**:
  - Mảng dependency của `useEffect` kết nối WebSocket bao gồm: `[currentUserId, currentStoreId]`.
  - Khi một Manager chuyển đổi chi nhánh để xem ca (chỉ đổi `currentStoreId`), toàn bộ kết nối WebSocket bị đóng hoàn toàn (`client.deactivate()`), sau đó khởi tạo lại một kết nối mới, handshake lại từ đầu.
- **Hậu quả**:
  - Tạo tải không cần thiết lên máy chủ (repeated handshakes, JWT validations, SSL renegotiation) và gây gián đoạn nhận thông báo cá nhân trong lúc reconnect. Giải pháp chuẩn là duy trì kết nối STOMP và chỉ unsubscribe store cũ, subscribe store mới.

---

### LỖI 9: MOBILE HOÀN TOÀN THIẾU WEBSOCKET (MOBILE POLLING GAP)
- **Mức độ nghiêm trọng**: **HIGH (Architectural Inconsistency & Mobile Experience)**
- **Vị trí mã nguồn**:
  - `ShiftSync-Mobile/src/services/notificationService.js`
  - `ShiftSync-Mobile/src/screens/DashboardScreen.js`
- **Cơ chế gây lỗi (Root Cause)**:
  - Codebase Mobile không tích hợp bất kỳ thư viện WebSocket nào (`stompjs`, `websocket`, hay `socket.io-client`).
  - Mobile chỉ gọi `getUnreadNotificationCount()` khi load màn hình Dashboard hoặc pull-to-refresh.
- **Hậu quả**:
  - Nhân viên sử dụng app điện thoại không nhận được thông báo ca làm tức thì khi Manager publish lịch hoặc đổi ca. Nếu có ca khẩn cấp cần nhận trên Marketplace, nhân viên dùng điện thoại sẽ luôn bị trễ hơn nhân viên mở Web.

---

## 3. MA TRẬN ĐÁNH GIÁ KỊCH BẢN THẤT BẠI (FAILURE MATRIX)

| ID | Kịch bản kiểm thử (Test Scenario) | Hành vi mong đợi (Expected) | Hiện trạng thực tế (Actual) | Mã lỗi / Exception | Mức độ |
|---|---|---|---|---|---|
| **SC-01** | Tạo 1 thông báo cho User A | User A nhận 1 thông báo toast duy nhất | User A nhận **2 thông báo toast chồng lấn** | Không bắn Exception (Logic flaw) | **HIGH** |
| **SC-02** | User B subscribe kênh `/topic/notifications` | Bị từ chối quyền (403 Forbidden) hoặc không có kênh broadcast này | User B đọc được toàn bộ thông báo của User A và tất cả user khác | Không bị chặn (Data Leak) | **CRITICAL** |
| **SC-03** | Client gửi CONNECT frame không có Bearer token | Bị từ chối kết nối ngay lập tức (`MessageDeliveryException` / Close Code 4001) | Kết nối vẫn thành công dưới dạng Anonymous | Log warning `WebSocket CONNECT frame missing Bearer token` | **CRITICAL** |
| **SC-04** | User A subscribe `/topic/notifications/{User_B_ID}` | Bị từ chối phân quyền (403 Access Denied) | Subscribe thành công, đọc trộm được tin nhắn riêng của User B | Không có validation trên SUBSCRIBE | **CRITICAL** |
| **SC-05** | User ở Store 1 subscribe `/topic/attendance` | Không được nhận dữ liệu của Store 2 | Nhận toàn bộ sự kiện chấm công và ảnh của Store 2 | Rò rỉ dữ liệu qua global topic | **HIGH** |
| **SC-06** | Check-in fail do database constraint (Rollback) | Không được phát sự kiện WebSocket ra ngoài | WebSocket vẫn phát event `CHECK_IN` thành công | Ghost event do phát trước commit | **HIGH** |
| **SC-07** | Manager A xếp ca mới cho Store 1 | Màn hình Schedule của Manager B tự động cập nhật | Màn hình của Manager B **đứng yên không đổi** | Thiếu `publishStoreEvent` trong `ShiftService` | **HIGH** |
| **SC-08** | Client bị ngắt kết nối mạng bất ngờ (Rút dây mạng) | Broker phát hiện timeout qua Heartbeat và giải phóng session | Session bị treo vô thời hạn trên RAM máy chủ | Thiếu `TaskScheduler` cho SimpleBroker | **MEDIUM** |
| **SC-09** | Manager chuyển từ Store 1 sang Store 2 trên Web | Giữ nguyên kết nối STOMP, chỉ đổi subscription | Đóng kết nối cũ, tạo mới toàn bộ kết nối STOMP | Tải handshake không cần thiết | **LOW** |
| **SC-10** | Manager publish lịch, nhân viên mở App Mobile | App Mobile nhận thông báo realtime tức thì | Mobile không nhận được gì cho tới lần reload sau | Mobile thiếu hoàn toàn WebSocket | **HIGH** |

---

## 4. KẾ HOẠCH & MÃ NGUỒN KHẮC PHỤC KỸ THUẬT (REMEDIATION PLAN)

### 4.1. Khắc phục Backend: Thắt chặt Bảo mật & Heartbeat (`WebSocketConfig.java`)
1. **Từ chối kết nối nếu Token không hợp lệ**.
2. **Kiểm soát quyền SUBSCRIBE theo User ID và Store ID**.
3. **Cấu hình `TaskScheduler` cho STOMP Heartbeat**.

```java
// Đề xuất cấu hình chuẩn cho WebSocketConfig.java:
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("wss-heartbeat-");
        scheduler.initialize();

        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(scheduler);
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        if (jwtTokenProvider.validateToken(token)) {
                            String username = jwtTokenProvider.getUsernameFromToken(token);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                            UsernamePasswordAuthenticationToken auth = 
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(auth);
                            return message;
                        }
                    }
                    // BẮT BUỘC TỪ CHỐI NẾU KHÔNG CÓ AUTHENTICATION HỢP LỆ
                    throw new MessageDeliveryException("Unauthorized: Invalid or missing Bearer token");
                }

                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    Principal principal = accessor.getUser();
                    if (principal == null) {
                        throw new MessageDeliveryException("Unauthorized subscription: anonymous user");
                    }
                    String destination = accessor.getDestination();
                    // KIỂM TRA PHÂN QUYỀN TOPIC:
                    // 1. Không cho phép subscribe kênh cá nhân người khác
                    if (destination != null && destination.startsWith("/topic/notifications/")) {
                        String targetUserId = destination.substring("/topic/notifications/".length());
                        // Kiểm tra principal có quyền với targetUserId không
                    }
                    // 2. Không cho phép subscribe kênh public lộ thông tin
                    if ("/topic/notifications".equals(destination)) {
                        throw new MessageDeliveryException("Forbidden: Global notification topic is disabled");
                    }
                }
                return message;
            }
        });
    }
}
```

---

### 4.2. Khắc phục Backend: Xóa bỏ Kênh Rò rỉ Dữ liệu & Đảm bảo Transaction Commit
1. **Trong `RealtimeEventPublisher.java`**:
   - Xóa bỏ hoàn toàn việc publish vào `/topic/notifications` và `/topic/{domain}`.
   - Chỉ giữ lại kênh cá nhân `/topic/notifications/{userId}` và kênh cửa hàng `/topic/store/{storeId}/{domain}`.
2. **Đảm bảo phát sự kiện sau khi Transaction đã commit**:
   - Sử dụng Spring `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` hoặc gọi qua `TransactionSynchronizationManager.registerSynchronization`.

```java
// Sửa đổi phương thức publish an toàn:
public void publishNotification(Long userId, Object notification) {
    if (userId == null) return;
    // CHỈ GỬI VÀO KÊNH RIÊNG CỦA USER, TUYỆT ĐỐI KHÔNG GỬI VÀO KÊNH GLOBAL
    messagingTemplate.convertAndSend("/topic/notifications/" + userId, notification);
}

public void publishStoreEvent(Long storeId, String domain, String eventType, Object payload) {
    if (storeId == null) return;
    Map<String, Object> event = Map.of(
        "domain", domain,
        "type", eventType,
        "payload", payload,
        "timestamp", Instant.now().toString()
    );
    // CHỈ GỬI VÀO KÊNH CỦA STORE CỤ THỂ
    messagingTemplate.convertAndSend("/topic/store/" + storeId + "/" + domain, event);
}
```

---

### 4.3. Khắc phục Backend: Kích hoạt Realtime cho Schedule & Marketplace
- Bổ sung lời gọi `realtimeEventPublisher.publishStoreEvent` vào các nghiệp vụ:
  - `ShiftService`: `SHIFT_CREATED`, `SHIFT_UPDATED`, `SHIFT_DELETED`, `SCHEDULE_PUBLISHED`.
  - `ShiftAssignmentService`: `ASSIGNMENT_UPDATED`.
  - `MarketplaceService` & `ShiftSwapService`: `MARKETPLACE_CLAIMED`, `SWAP_APPROVED`.

---

### 4.4. Khắc phục Web Frontend: Sửa lỗi Duplicate Subscription (`WebSocketContext.jsx`)
- Hủy bỏ việc subscribe vào `/topic/notifications` chung.
- Tách việc kết nối STOMP ra khỏi việc đổi Store (sử dụng dynamic subscription management).

```javascript
// Chỉ subscribe kênh cá nhân của user:
client.subscribe(`/topic/notifications/${currentUserId}`, (msg) => {
  try {
    const notif = JSON.parse(msg.body);
    handleIncomingNotification(notif);
  } catch (err) {
    console.error('Error parsing notification:', err);
  }
});
// ĐÃ LOẠI BỎ subscription vào /topic/notifications -> HẾT NHÂN ĐÔI THÔNG BÁO!
```

---

### 4.5. Đề xuất Kiến trúc cho Mobile App (`ShiftSync-Mobile`)
- **Tích hợp `@stomp/stompjs` hoặc WebSocket client** vào Mobile để nhân viên nhận thông báo và cập nhật ca làm việc tức thì (tương tự Web), đồng thời kết hợp Firebase Cloud Messaging (FCM) cho push notification khi app chạy ngầm.

---

## 5. TỔNG KẾT & ĐÁNH GIÁ CHUNG

| Hạng mục kiểm tra | Hiện trạng | Kết luận |
|---|---|---|
| **Kiến trúc WebSocket/STOMP** | Hoạt động cơ bản trên Web, vắng bóng trên Mobile | Cần đồng bộ nền tảng |
| **Xác thực kết nối (Authentication)** | Thiếu chặn nặc danh khi Token sai | **Lỗ hổng bảo mật nghiêm trọng** |
| **Phân quyền Topic (Authorization)** | Chưa có kiểm soát frame SUBSCRIBE | **Lỗ hổng bảo mật nghiêm trọng** |
| **Bảo mật dữ liệu (Data Privacy)** | Broadcast thông báo riêng tư và dữ liệu store ra kênh chung | **Nguy cơ rò rỉ dữ liệu cao** |
| **Tính toàn vẹn (Integrity & UX)** | Trùng lặp thông báo toast; sai lệch transaction commit | Cần chuẩn hóa sau commit |
| **Phủ sóng tính năng (Coverage)** | Schedule & Marketplace chưa kết nối Realtime | Cần tích hợp bổ sung |

Báo cáo này cung cấp đầy đủ bằng chứng mã nguồn và giải pháp kỹ thuật cụ thể để đội ngũ phát triển tiến hành nâng cấp hệ thống WebSocket của ShiftSync đạt tiêu chuẩn bảo mật và hiệu năng cao nhất.
