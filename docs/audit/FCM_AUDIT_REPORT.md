# BÁO CÁO AUDIT TOÀN DIỆN FIREBASE CLOUD MESSAGING (FCM) TRÊN HỆ THỐNG SHIFTSYNC

**Dự án:** ShiftSync (Hệ thống Quản lý và Điều phối Ca làm việc Doanh nghiệp Bán lẻ / F&B)  
**Ngày thực hiện:** 08/10/2026  
**Phạm vi audit:** Toàn bộ mã nguồn `shiftsync-backend`, `ShiftSync-Mobile` và `ShiftSync-Web`  
**Mục tiêu:** Xác định vị trí, cách thức hoạt động, tính toàn vẹn nghiệp vụ và khoảng cách triển khai (gap) của hạ tầng Firebase Cloud Messaging (FCM) với bằng chứng thực tế từ source code.

---

## MỤC LỤC
1. [Phạm vi và Phương pháp kiểm tra](#1-phạm-vi-và-phương-pháp-kiểm-tra)
2. [Kiến trúc & Hạ tầng Kỹ thuật FCM](#2-kiến-trúc--hạ-tầng-kỹ-thuật-fcm)
3. [Call-Site Matrix Toàn diện (22 Invocations)](#3-call-site-matrix-toàn-diện)
4. [Phân loại Chi tiết theo 9 Nghiệp vụ Thực tế](#4-phân-loại-chi-tiết-theo-9-nghiệp-vụ-thực-tế)
5. [Trace Cận cảnh 5 Business Flow Tiêu biểu](#5-trace-cận-cảnh-5-business-flow-tiêu-biểu)
6. [Audit Đối soát với Client Mobile (React Native / Expo)](#6-audit-đối-soát-với-client-mobile)
7. [Audit Đối soát với Client Web App](#7-audit-đối-soát-với-client-web-app)
8. [Audit Database & Vòng đời Token](#8-audit-database--vòng-đời-token)
9. [Audit Tùy chọn Thông báo (Notification Preferences)](#9-audit-tùy-chọn-thông-báo-notification-preferences)
10. [Audit Độ tin cậy & Xử lý Ngoại lệ (Reliability & Fault Tolerance)](#10-audit-độ-tin-cậy--xử-lý-ngoại-lệ)
11. [Bảng Phân tích Rủi ro & Khuyết tật (Identified Defects)](#11-bảng-phân-tích-rủi-ro--khuyết-tật)
12. [Tổng kết Định lượng Bằng Số liệu Chính xác](#12-tổng-kết-định-lượng-bằng-số-liệu-chính-xác)
13. [Mẫu Câu trả lời 30–45 Giây Bảo vệ Đồ án / Phỏng vấn](#13-mẫu-câu-trả-lời-3045-giây-bảo-vệ-đồ-án--phỏng-vấn)
14. [Lộ trình Đề xuất Cải tiến Cụ thể](#14-lộ-trình-đề-xuất-cải-tiến-cụ-thể)

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP KIỂM TRA

### 1.1. Phạm vi kiểm tra
- **Backend:** Spring Boot 3.3.4, Java 21, Spring Data JPA, Spring Security, Hibernate 6, Firebase Admin Java SDK 9.2.0.
- **Mobile:** React Native 0.76.7, Expo ~52.0.37, JavaScript/TypeScript.
- **Web:** React, Vite, Tailwind CSS, STOMP/SockJS client.
- **Cơ sở dữ liệu:** PostgreSQL 15, Flyway Migrations (từ `V1` đến `V18`).

### 1.2. Phương pháp luận
- **Zero-Assumption Audit:** Không thừa nhận bất kỳ con số nào trong tài liệu cũ (như "22 call sites", "8 nghiệp vụ") mà chưa kiểm chứng từ file vật lý.
- **Static AST & Text Grep:** Quét regex toàn bộ từ khóa FCM (`FirebaseMessaging`, `sendNotification`, `user_device_tokens`, `notification_preference`, v.v.).
- **Trace toàn diện từ đầu đến cuối:** Lần theo vết gọi hàm từ Controller/Trigger -> Domain Service -> `NotificationService` -> Multicast Message -> Client App.

---

## 2. KIẾN TRÚC & HẠ TẦNG KỸ THUẬT FCM

### 2.1. Thư viện & Cấu hình Khởi tạo (Firebase Initialization)
- **Dependency:** Khai báo tại [`shiftsync-backend/pom.xml`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/pom.xml#L133-L137):
  ```xml
  <dependency>
      <groupId>com.google.firebase</groupId>
      <artifactId>firebase-admin</artifactId>
      <version>9.2.0</version>
  </dependency>
  ```
- **Configuration Class:** [`FirebaseConfig.java`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/config/FirebaseConfig.java#L21-L36):
  - Đọc file cấu hình từ thuộc tính `firebase.config.path` (mặc định: `classpath:firebase-service-account.json`).
  - Kiểm tra điều kiện `FirebaseApp.getApps().isEmpty()` trước khi khởi tạo `FirebaseApp.initializeApp(options)` để chống khởi tạo lặp (idempotency).
  - Tệp thông tin xác thực `firebase-service-account.json` tồn tại tại [`src/main/resources/firebase-service-account.json`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/resources/firebase-service-account.json), kết nối với Project ID: `shiftsync-app-93f17`.

### 2.2. Cơ chế Bất đồng bộ & Đồng bộ Transaction (Async Execution & Transaction Sync)
- **Thread Pool:** [`AsyncConfig.java`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/config/AsyncConfig.java#L14-L24) khai báo bean `@Bean(name = "notificationExecutor")`:
  - `CorePoolSize`: 5
  - `MaxPoolSize`: 20
  - `QueueCapacity`: 100
  - `ThreadNamePrefix`: `"Notification-"`
- **Mẫu Thiết kế After-Commit Hook:** Trong [`NotificationService.java`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/service/NotificationService.java#L41-L56):
  ```java
  public void sendNotification(UUID userId, NotificationType type, String title, String body, Map<String, String> data) {
      Runnable task = () -> executeSendNotification(userId, type, title, body, data);

      if (TransactionSynchronizationManager.isSynchronizationActive()) {
          TransactionSynchronizationManager.registerSynchronization(
              new TransactionSynchronization() {
                  @Override
                  public void afterCommit() {
                      CompletableFuture.runAsync(task, notificationExecutor);
                  }
              }
          );
      } else {
          CompletableFuture.runAsync(task, notificationExecutor);
      }
  }
  ```
  *Ý nghĩa:* Ngăn chặn tuyệt đối tình trạng "Phantom Notification" — thông báo đẩy chỉ được kích hoạt sau khi giao dịch cơ sở dữ liệu đã commit thành công. Nếu giao dịch bị rollback, thông báo sẽ bị hủy.

### 2.3. Điểm Bắn Hạ Tầng Duy Nhất (Single Dispatch Core)
- Trong [`NotificationService.java:101`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/service/NotificationService.java#L101):
  ```java
  BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
  ```
  Đây là **điểm phát thông báo FCM vật lý duy nhất** của toàn bộ hệ thống. Tất cả các nghiệp vụ trong ShiftSync đều hội tụ về phương thức này thông qua `NotificationService.sendNotification()`.

---

## 3. CALL-SITE MATRIX TOÀN DIỆN

Hệ thống ghi nhận chính xác **22 call sites** (gồm 21 lời gọi nghiệp vụ phân tán trong 7 service domain và 1 scheduled cron job, cùng 1 test endpoint tại Controller). Chi tiết xem tại tệp [`FCM_CALL_SITE_MATRIX.md`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/FCM_CALL_SITE_MATRIX.md).

Tóm lược bảng call sites:
1. `AttendanceAdjustmentService.java:184` — Duyệt điều chỉnh chấm công (`ATTENDANCE_ADJUSTMENT_UPDATED`)
2. `AttendanceAdjustmentService.java:227` — Từ chối điều chỉnh chấm công (`ATTENDANCE_ADJUSTMENT_UPDATED`)
3. `ShiftReminderJob.java:61` — Cron nhắc ca làm việc trước 60 phút (`SHIFT_REMINDER`)
4. `LeaveRequestService.java:216` — Quản lý duyệt nghỉ phép (`LEAVE_REQUEST_UPDATED`)
5. `LeaveRequestService.java:266` — Quản lý từ chối nghỉ phép (`LEAVE_REQUEST_UPDATED`)
6. `MarketplaceService.java:105` — Xuất bản ca trống lên Marketplace (`OPEN_SHIFT_AVAILABLE`)
7. `NotificationController.java:70` — Endpoint kiểm thử (`type: null`)
8. `PayrollCalculationService.java:168` — Chốt tính lương kỳ công (`PAYROLL_COMPLETED`)
9. `ShiftAssignmentService.java:271` — Gán thủ công nhân viên vào ca (`SCHEDULE_PUBLISHED`)
10. `ShiftService.java:451` — Xuất bản lịch tuần: thông báo từng ca (`SCHEDULE_PUBLISHED` - TV)
11. `ShiftService.java:474` — Xuất bản lịch tuần: thông báo tổng kết tuần (`SCHEDULE_PUBLISHED` - TA)
12. `ShiftService.java:597` — Quản lý hủy ca làm việc đã publish (`SHIFT_REMINDER` ⚠️)
13. `ShiftSwapService.java:119` — Tạo yêu cầu đổi ca (`SHIFT_SWAP_UPDATED`)
14. `ShiftSwapService.java:152` — Đồng nghiệp từ chối đổi ca (`SHIFT_SWAP_UPDATED`)
15. `ShiftSwapService.java:169` — Đồng nghiệp đồng ý đổi ca (`SHIFT_SWAP_UPDATED`)
16. `ShiftSwapService.java:272` — Quản lý duyệt đổi ca -> gửi người yêu cầu (`SHIFT_SWAP_UPDATED`)
17. `ShiftSwapService.java:280` — Quản lý duyệt đổi ca -> gửi người được nhờ (`SHIFT_SWAP_UPDATED`)
18. `ShiftSwapService.java:320` — Quản lý từ chối đổi ca -> gửi người yêu cầu (`SHIFT_SWAP_UPDATED`)
19. `ShiftSwapService.java:329` — Quản lý từ chối đổi ca -> gửi người được nhờ (`SHIFT_SWAP_UPDATED`)
20. `ShiftSwapService.java:378` — Hủy bỏ yêu cầu đổi ca (`SHIFT_SWAP_UPDATED`)
21. `WorkforceRequestService.java:180` — Đề xuất nhân sự hỗ trợ liên chi nhánh (`WORKFORCE_REQUEST_UPDATED`)
22. `WorkforceRequestService.java:259` — Thông báo cho quản lý chi nhánh (`WORKFORCE_REQUEST_UPDATED`)

---

## 4. PHÂN LOẠI CHI TIẾT THEO 9 NGHIỆP VỤ THỰC TẾ

Mặc dù enum [`NotificationType.java`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/entity/NotificationType.java) định nghĩa 8 giá trị, trên thực tế vận hành có **9 luồng nghiệp vụ độc lập** và 1 API kiểm thử:

### Luồng 1: Xuất bản và Phân công Lịch làm việc (Schedule & Assignment)
- **Call Sites:** 3 vị trí ([`ShiftAssignmentService.java:271`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java#L271), [`ShiftService.java:451`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftService.java#L451), [`ShiftService.java:474`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftService.java#L474)).
- **Type:** `SCHEDULE_PUBLISHED`.
- **Người nhận:** Nhân viên được phân ca hoặc toàn bộ nhân viên có ca trong tuần được xuất bản.

### Luồng 2: Hủy bỏ Ca làm việc đã xuất bản (Shift Cancellation)
- **Call Sites:** 1 vị trí ([`ShiftService.java:597`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftService.java#L597)).
- **Type hiện tại:** `SHIFT_REMINDER` (⚠️ Sai lệch ngữ nghĩa nghiêm trọng).
- **Người nhận:** Nhân viên bị hủy ca làm việc.

### Luồng 3: Nhắc nhở Ca làm việc Định kỳ (Shift Reminder)
- **Call Sites:** 1 vị trí ([`ShiftReminderJob.java:61`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/job/ShiftReminderJob.java#L61)).
- **Type:** `SHIFT_REMINDER`.
- **Người nhận:** Nhân viên có ca làm việc bắt đầu trong vòng 55-65 phút tới. Chạy tự động qua Spring `@Scheduled` mỗi 15 phút.

### Luồng 4: Quy trình Đổi ca Làm việc (Shift Swap Workflow)
- **Call Sites:** 8 vị trí ([`ShiftSwapService.java`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftSwapService.java): lines 119, 152, 169, 272, 280, 320, 329, 378).
- **Type:** `SHIFT_SWAP_UPDATED`.
- **Người nhận:** Luân chuyển theo trạng thái của Finite State Machine (Người yêu cầu <-> Đồng nghiệp được nhờ <-> Cả hai sau khi Quản lý duyệt/từ chối).

### Luồng 5: Chợ ca làm việc Mở (Marketplace Open Shift)
- **Call Sites:** 1 vị trí ([`MarketplaceService.java:105`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/MarketplaceService.java#L105)).
- **Type:** `OPEN_SHIFT_AVAILABLE`.
- **Người nhận:** Tất cả nhân viên cùng cửa hàng thỏa mãn vai trò chuyên môn của ca trống.

### Luồng 6: Quản lý Đơn Nghỉ phép (Leave Request)
- **Call Sites:** 2 vị trí ([`LeaveRequestService.java:216`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/leave/service/LeaveRequestService.java#L216) và line 266).
- **Type:** `LEAVE_REQUEST_UPDATED`.
- **Người nhận:** Nhân viên nộp đơn khi quản lý phê duyệt hoặc từ chối.

### Luồng 7: Điều chỉnh Chấm công (Attendance Adjustment)
- **Call Sites:** 2 vị trí ([`AttendanceAdjustmentService.java:184`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/attendance/service/AttendanceAdjustmentService.java#L184) và line 227).
- **Type:** `ATTENDANCE_ADJUSTMENT_UPDATED`.
- **Người nhận:** Nhân viên gửi giải trình chấm công khi quản lý phê duyệt hoặc bác bỏ.

### Luồng 8: Quyết toán Bảng lương (Payroll Calculation)
- **Call Sites:** 1 vị trí ([`PayrollCalculationService.java:168`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/payroll/service/PayrollCalculationService.java#L168)).
- **Type:** `PAYROLL_COMPLETED`.
- **Người nhận:** Từng nhân viên sau khi hệ thống hoàn tất chốt bảng lương định kỳ.

### Luồng 9: Điều động Nhân sự Liên chi nhánh (Cross-Store Workforce Sharing)
- **Call Sites:** 2 vị trí ([`WorkforceRequestService.java:180`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/workforce/service/WorkforceRequestService.java#L180) và line 259).
- **Type:** `WORKFORCE_REQUEST_UPDATED`.
- **Người nhận:** Nhân viên được điều động chi viện và Quản lý các chi nhánh liên quan.

### Luồng Bổ trợ: Kiểm thử Thông báo (Notification Test)
- **Call Site:** 1 vị trí ([`NotificationController.java:70`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/controller/NotificationController.java#L70)).
- **Type:** `null` (mặc định fallback thành `GENERAL` trong In-App).

---

## 5. TRACE CẬN CẢNH 5 BUSINESS FLOW TIÊU BIỂU

### Flow 1: Xuất bản Lịch làm việc tuần (Schedule Publish)
1. **API Trigger:** Client gọi `POST /api/shifts/publish?storeId=...&startDate=...&endDate=...`.
2. **Controller/Service:** `ShiftController` chuyển yêu cầu sang `ShiftService.publishSchedule()`.
3. **Database Mutation:** Trạng thái các ca chuyển từ `DRAFT` sang `PUBLISHED`.
4. **FCM Trigger:**
   - Vòng lặp các ca (`ShiftService.java:451`): Gọi `notificationService.sendNotification(shift.getStaff().getId(), SCHEDULE_PUBLISHED, "Lịch làm việc đã xuất bản", ...)`.
   - Tổng kết theo nhân viên (`ShiftService.java:474`): Gọi tiếp `notificationService.sendNotification(staffId, SCHEDULE_PUBLISHED, "Schedule Published", ...)`.
5. **Đồng bộ Giao dịch:** `TransactionSynchronizationManager.afterCommit()` bắt sự kiện commit thành công của DB.
6. **Async Handoff:** Đẩy `executeSendNotification` vào `notificationExecutor`.
7. **In-App & Preferences:**
   - Lưu bản ghi vào bảng `notification` (In-App), phát qua SSE và WebSocket.
   - Kiểm tra bảng `notification_preference` với `staff_id` và `SCHEDULE_PUBLISHED`. Nếu tắt (`enabled = false`) -> Dừng gửi push.
8. **Lấy Token:** Truy vấn `user_device_tokens` theo `user_id`.
9. **Dispatch FCM:** Gọi `FirebaseMessaging.getInstance().sendEachForMulticast(message)`.
10. **Client Mobile:** ❌ **Không nhận được** do Mobile chưa cài đặt Firebase SDK.

### Flow 2: Đề xuất và Phản hồi Đổi ca (Shift Swap Request & Peer Response)
1. **API Trigger:** Nhân viên A gọi `POST /api/shifts/swaps` đề xuất đổi ca cho Nhân viên B.
2. **Service:** `ShiftSwapService.createSwapRequest()` lưu bản ghi đổi ca ở trạng thái `PENDING_PEER_ACCEPTANCE`.
3. **FCM Trigger:** Gọi `notificationService.sendNotification(targetStaff.getId(), SHIFT_SWAP_UPDATED, "Yêu cầu đổi ca mới", ...)` tại line 119.
4. **Đồng nghiệp B phản hồi:**
   - Nếu từ chối (`POST .../respond` với `accept=false`): `ShiftSwapService:152` bắn push thông báo từ chối về Nhân viên A.
   - Nếu đồng ý (`accept=true`): `ShiftSwapService:169` bắn push thông báo đã chấp thuận về Nhân viên A (chờ Quản lý duyệt).
5. **Dispatch FCM:** Chạy sau commit, qua `notificationExecutor`.
6. **Client Mobile:** ❌ **Không nhận được push native**; chỉ xem được nếu mở tab thông báo In-App.

### Flow 3: Phê duyệt Đơn Nghỉ phép (Leave Request Approval)
1. **API Trigger:** Quản lý duyệt đơn tại `PUT /api/leave/requests/{id}/approve`.
2. **Service:** `LeaveRequestService.approveLeaveRequest()` cập nhật trạng thái đơn thành `APPROVED` và điều chỉnh hạn ngạch ngày phép.
3. **FCM Trigger:** `LeaveRequestService:216` gọi `notificationService.sendNotification(request.getStaff().getId(), LEAVE_REQUEST_UPDATED, "Đơn nghỉ phép đã được duyệt", ...)`.
4. **Dispatch FCM:** Sau commit, kiểm tra preference `LEAVE_REQUEST_UPDATED`, lấy token và gửi qua `sendEachForMulticast`.
5. **Client Mobile:** ❌ **Không nhận được push native**.

### Flow 4: Đăng ca Mở lên Chợ Ca (Marketplace Open Shift)
1. **API Trigger:** Quản lý đăng ca trống tại `POST /api/shifts/marketplace/publish`.
2. **Service:** `MarketplaceService.publishToMarketplace()` lưu bản ghi `OpenShift`.
3. **FCM Trigger:** Tìm kiếm danh sách nhân viên trong cùng store phù hợp vai trò. Duyệt từng nhân viên và gọi `notificationService.sendNotification(staff.getId(), OPEN_SHIFT_AVAILABLE, "Ca làm việc mới trên Marketplace", ...)` tại line 105.
4. **Dispatch FCM:** Gửi multicast bất đồng bộ cho từng nhân sự.
5. **Client Mobile:** ❌ **Không nhận được push native**.

### Flow 5: Nhắc nhở Ca làm việc Tự động (Shift Reminder Cron Job)
1. **Trigger:** Spring Scheduler `@Scheduled(cron = "0 */15 * * * *")` kích hoạt `ShiftReminderJob.sendShiftReminders()`.
2. **Query:** Quét DB tìm các ca bắt đầu trong khoảng từ 55 đến 65 phút nữa (`findUpcomingShiftsStartingBetween`).
3. **FCM Trigger:** Duyệt danh sách ca, gọi `notificationService.sendNotification(shift.getStaff().getId(), SHIFT_REMINDER, "Nhắc nhở ca làm việc", ...)` tại line 61.
4. **Thực thi:** Phương thức này không có transaction quản lý của Spring (`isSynchronizationActive() == false`), nên tác vụ được gửi trực tiếp ngay lập tức vào `notificationExecutor`.
5. **Dispatch FCM:** Gửi thông báo nhắc việc.
6. **Client Mobile:** ❌ **Không nhận được push native**.

---

## 6. AUDIT ĐỐI SOÁT VỚI CLIENT MOBILE

| Hạng mục kiểm tra | Trạng thái thực tế | Bằng chứng mã nguồn |
|-------------------|-------------------|---------------------|
| Thư viện Firebase Client trong `package.json` | ❌ **KHÔNG CÓ** | `ShiftSync-Mobile/package.json` hoàn toàn không có `@react-native-firebase/app`, `@react-native-firebase/messaging` hoặc `expo-notifications`. |
| Cấu hình Firebase trong Expo (`app.json`) | ❌ **KHÔNG CÓ** | `app.json` không có cấu hình plugin push notification, không có `google-services.json` (Android) hay `GoogleService-Info.plist` (iOS). |
| Hàm gọi API đăng ký FCM Token | ⚠️ **CÓ HÀM NHƯNG BỎ HOANG** | `ShiftSync-Mobile/services/notificationService.js:9` có export `registerFcmToken(token)`, nhưng **không có bất kỳ file nào trong dự án import hay gọi hàm này**. |
| Listener nhận thông báo Foreground/Background | ❌ **KHÔNG CÓ** | Không có headless task, không có service worker hay push listener nào được đăng ký. |
| Cơ chế hiển thị thông báo trên Mobile | ⚠️ **CHỈ LÀ IN-APP POLLING** | Màn hình `NotificationScreen.js` gọi `GET /api/users/me/notifications` để hiển thị danh sách từ PostgreSQL. |
| Deep Linking khi bấm Push Notification | ❌ **KHÔNG HOẠT ĐỘNG** | Do không có native push notification, luồng điều hướng khi tap notification hoàn toàn không tồn tại. |

---

## 7. AUDIT ĐỐI SOÁT VỚI CLIENT WEB APP

- **Thư viện Firebase Web SDK:** Hoàn toàn **KHÔNG CÓ** trong `ShiftSync-Web/package.json`. Web không sử dụng Service Worker (`firebase-messaging-sw.js`).
- **Cơ chế Realtime thực tế trên Web:**
  - Web sử dụng WebSocket giao thức STOMP qua SockJS (`@stomp/stompjs`, `sockjs-client`).
  - Khi Backend gọi `createInAppNotification`, mã tại [`NotificationService.java:161`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/service/NotificationService.java#L161) gọi `realtimeEventPublisher.publishNotification(userId, dto)`, đẩy message qua topic `/topic/notifications/{userId}` và `/topic/notifications/global`.
  - Ngoài ra backend còn hỗ trợ SSE tại endpoint `GET /api/users/me/notifications/stream` ([`NotificationController.java:135`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/controller/NotificationController.java#L135)).

---

## 8. AUDIT DATABASE & VÒNG ĐỜI TOKEN

### 8.1. Cấu trúc Bảng lưu trữ Device Token
Được tạo bởi migration [`V16__add_device_tokens.sql`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/resources/db/migration/V16__add_device_tokens.sql):
```sql
CREATE TABLE user_device_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES staff(id),
    fcm_token VARCHAR(512) NOT NULL,
    device_type VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uk_user_device_tokens UNIQUE (user_id, fcm_token)
);
```
- Entity JPA: [`UserDeviceToken.java`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/entity/UserDeviceToken.java).
- Ràng buộc: Cặp `(user_id, fcm_token)` là duy nhất (`uk_user_device_tokens`). Một user có thể đăng ký nhiều thiết bị.

### 8.2. Đăng ký và Làm sạch Token
- **Đăng ký:** API `POST /api/users/me/fcm-token` ([`NotificationController.java:39`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/controller/NotificationController.java#L39)). Nếu chưa có token thì insert mới.
- **Tự động dọn dẹp Token hỏng (Stale Token Eviction):** Tại [`NotificationService.java:114-116`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/service/NotificationService.java#L114-L116), khi Firebase trả về mã lỗi `UNREGISTERED` hoặc `INVALID_ARGUMENT`, backend sẽ tự động gọi `removeToken(failedToken)` để xóa token khỏi cơ sở dữ liệu.
- ⚠️ **Lỗ hổng Hủy token khi Logout:**
  - Hệ thống **không có endpoint** `DELETE /api/users/me/fcm-token`.
  - Hàm `AuthService.logout()` chỉ đưa JWT vào Blacklist Redis mà **không xóa** device token trong `user_device_tokens`. Điều này dẫn đến nguy cơ rò rỉ thông báo nếu người dùng đăng xuất nhưng không xóa dữ liệu app.

---

## 9. AUDIT TÙY CHỌN THÔNG BÁO (NOTIFICATION PREFERENCES)

### 9.1. Cấu trúc và Mặc định
- Bảng: `notification_preference` (migration `V1__init_schema.sql` dòng 338 và `V18`).
- Ràng buộc: `UNIQUE (staff_id, notification_type)`.
- Mặc định: Nếu người dùng chưa từng cấu hình, [`NotificationPreferenceService.java:39`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/service/NotificationPreferenceService.java#L39) coi giá trị mặc định là `true` (cho phép nhận).

### 9.2. Kiểm tra trước khi bắn FCM
- Trong [`NotificationService.java:68-74`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/notification/service/NotificationService.java#L68-L74):
  ```java
  if (type != null) {
      NotificationPreference pref = preferenceRepository.findByStaffIdAndNotificationType(userId, type).orElse(null);
      if (pref != null && !pref.isEnabled()) {
          log.info("User {} disabled notification for type {}. Skipping push notification.", userId, type);
          return;
      }
  }
  ```
- **Hành vi thực tế:**
  1. Bản ghi In-App Notification vẫn được lưu vào database và phát qua SSE/WebSocket (dòng 61-65).
  2. Chỉ có lệnh bắn push notification FCM bị hủy bỏ nếu user tắt tùy chọn loại thông báo tương ứng.
  3. Tất cả 9 nghiệp vụ đều truyền đầy đủ `NotificationType` hợp lệ và đều được kiểm tra qua logic này.

---

## 10. AUDIT ĐỘ TIN CẬY & XỬ LÝ NGOẠI LỆ

1. **Không chặn và không làm Rollback giao dịch nghiệp vụ (Non-blocking Isolation):**
   - Lệnh gửi FCM luôn chạy trong `CompletableFuture.runAsync(..., notificationExecutor)` sau khi giao dịch cơ sở dữ liệu đã commit.
   - Nếu máy chủ Firebase sập, mạng chập chờn, hoặc Firebase ném ngoại lệ `FirebaseMessagingException`, giao dịch chấm công, duyệt phép, xuất bản lịch đã hoàn tất thành công trong database và không bao giờ bị rollback.
2. **Cô lập luồng xử lý (Thread Isolation):**
   - Executor `notificationExecutor` có thread pool độc lập, ngăn chặn việc quá tải thông báo làm cạn kiệt pool `http-nio` phục vụ request API.
3. **Cơ chế Thử lại (Retry):**
   - ⚠️ **Không có cơ chế Retry**: Nếu mạng lỗi hoặc Firebase quá tải tức thời, ngoại lệ chỉ được ghi log (`log.error`) mà không được lưu vào hàng đợi để thử lại (Dead Letter Queue / Outbox Pattern).

---

## 11. BẢNG PHÂN TÍCH RỦI RO & KHUYẾT TẬT

| Mã khuyết tật | Mức độ | File & Vị trí | Mô tả bản chất | Hậu quả thực tế |
|---------------|--------|---------------|----------------|-----------------|
| **`FCM-SEMANTIC-001`** | **CRITICAL** | `ShiftService.java:597-603` | Quản lý hủy ca làm việc đã xuất bản nhưng gọi `sendNotification` với `NotificationType.SHIFT_REMINDER`. | Nếu nhân viên tắt thông báo "Nhắc nhở ca làm", họ sẽ **bị bỏ lỡ thông báo hủy ca**, dẫn đến việc vẫn đến chỗ làm khi ca đã bị hủy. |
| **`FCM-DUPLICATE-001`** | **HIGH** | `ShiftService.java:448-482` | Hàm `publishSchedule` bắn cả thông báo từng ca (dòng 451) VÀ thông báo tổng kết tuần (dòng 474) cho cùng một nhân viên. | Nhân viên có 5 ca trong tuần sẽ nhận **6 thông báo đẩy** gần như cùng 1 giây (spam thông báo, lãng phí quota FCM). |
| **`FCM-MOBILE-GAP-001`** | **CRITICAL** | `ShiftSync-Mobile` | Backend xây dựng hoàn chỉnh hạ tầng FCM nhưng Mobile thiếu Firebase Messaging SDK, không lấy được device token. | Tính năng Push Notification trên điện thoại không hoạt động ngoài đời thực; app chỉ nhận thông báo khi đang mở. |
| **`FCM-TOKEN-LEAK-001`** | **HIGH** | `AuthService.java` & `NotificationController.java` | Không có API xóa token và khi logout không hủy token thiết bị trong database. | Nếu user A đăng xuất trên điện thoại và user B mượn máy hoặc thiết bị được bàn giao, user A vẫn có thể nhận push notification nhạy cảm. |
| **`FCM-MULTICAST-LIMIT-001`** | **MEDIUM** | `NotificationService.java:87-101` | `MulticastMessage` gom tất cả token bằng `.addAllTokens(fcmTokens)` mà không phân trang `500 tokens/batch` (giới hạn của FCM). | Nếu một user đăng nhập hơn 500 thiết bị hoặc khi broadcast, Firebase SDK sẽ ném ngoại lệ `IllegalArgumentException`. |
| **`FCM-MISSING-CALLER-FEEDBACK-001`** | **LOW** | `NotificationService.java:41` | Phương thức trả về `void` bất đồng bộ, nuốt toàn bộ lỗi bên trong khối `try-catch`. | Caller nghiệp vụ không thể biết thông báo đẩy đã gửi thành công hay thất bại để hiển thị cảnh báo cho quản lý. |

---

## 12. TỔNG KẾT ĐỊNH LƯỢNG BẰNG SỐ LIỆU CHÍNH XÁC

```
================================================================================
                    SHIFTSYNC FCM AUDIT METRIC SUMMARY
================================================================================
VERIFIED CALL SITES              : 22
VERIFIED BUSINESS FLOWS          : 9 (+ 1 Test Endpoint)
MOBILE CONSUMED FLOWS            : 0
UNCONSUMED FLOWS                 : 9
DUPLICATE RISKS                  : 1 (ShiftService.publishSchedule spam 2 lớp)
SEMANTIC ISSUES                  : 1 (ShiftService.deleteShift dùng SHIFT_REMINDER)
ERROR-HANDLING ISSUES            : 1 (Không có retry/outbox, nuốt lỗi FCM)
TOKEN ISSUES                     : 1 (Thiếu token cleanup khi logout)
================================================================================
```

---

## 13. MẪU CÂU TRẢ LỜI 30–45 GIÂY BẢO VỆ ĐỒ ÁN / PHỎNG VẤN

> *"Hệ thống ShiftSync hiện đã hoàn thiện kiến trúc Push Notification ở phía Backend với **22 call sites** thực tế, phân bổ trên **9 luồng nghiệp vụ cốt lõi** như Lịch làm việc, Đổi ca, Chợ ca, Nghỉ phép, Chấm công, Tính lương và Điều động nhân sự.*
> 
> *Về mặt kỹ thuật, Backend xử lý rất bài bản: thông báo đẩy được kích hoạt **sau khi commit database** qua `TransactionSynchronization.afterCommit()`, chạy bất đồng bộ trên **Thread Pool riêng biệt**, tôn trọng **cấu hình bật/tắt (Notification Preference)** của người dùng và tự động xóa token hỏng.*
> 
> *Tuy nhiên, qua audit mã nguồn thực tế, chúng em phát hiện 2 điểm cần cải tiến quan trọng: Thứ nhất, phía ứng dụng Mobile hiện đang sử dụng cơ chế polling In-App và chưa tích hợp Firebase Native Client để nhận Push khi tắt app; Thứ hai, tại nghiệp vụ hủy ca, hệ thống đang dùng nhầm mã enum `SHIFT_REMINDER`, có nguy cơ khiến nhân viên bỏ lỡ thông báo nếu đã tắt tính năng nhắc ca. Đây là những mục tiêu đã được đưa vào lộ trình hoàn thiện của giai đoạn tiếp theo."*

---

## 14. LỘ TRÌNH ĐỀ XUẤT CẢI TIẾN CỤ THỂ

*(Lưu ý: Không thực hiện sửa code trong pha audit; các đề xuất dưới đây dành cho pha Implementation tiếp theo)*

### 14.1. Khắc phục Backend (Ưu tiên cao)
1. **Sửa Semantic Type tại `ShiftService.java:597`:**
   - Thay đổi từ `NotificationType.SHIFT_REMINDER` sang một enum phù hợp (hoặc thêm `SCHEDULE_CANCELLED` / sử dụng `SCHEDULE_PUBLISHED`).
2. **Khắc phục Trùng lặp tại `ShiftService.java:448-482`:**
   - Quyết định chuẩn hóa 1 trong 2 hình thức: Chỉ gửi 1 thông báo tổng kết tuần cho mỗi nhân viên, hoặc gửi chi tiết từng ca (tránh gửi đồng thời cả hai gây spam).
3. **Thêm API Hủy Token & Xử lý Logout:**
   - Thêm `@DeleteMapping("/api/users/me/fcm-token")` tiếp nhận `fcmToken`.
   - Trong `AuthService.logout()`, bổ sung tham số hoặc logic xóa token của thiết bị đang đăng xuất.

### 14.2. Khắc phục Client Mobile
1. Cài đặt `@react-native-firebase/app` và `@react-native-firebase/messaging` (hoặc `expo-notifications`).
2. Tạo hook `useFcmToken()`:
   - Yêu cầu quyền thông báo (`requestPermission`).
   - Lấy `messaging().getToken()` và gọi `registerFcmToken(token)` lên backend sau khi login thành công.
3. Cài đặt Foreground Listener (`onMessage`) và Background Handler (`setBackgroundMessageHandler`) để hiển thị Notification Banner và điều hướng Deep Link khi user tap thông báo.

### 14.3. Nâng cấp Kiến trúc Bền bỉ (Transactional Outbox Pattern)
- Thay vì gọi trực tiếp `CompletableFuture.runAsync()`, triển khai bảng `outbox_notifications` trong database. Một cron job hoặc worker sẽ quét và gửi FCM, hỗ trợ retry với Exponential Backoff khi Firebase hoặc đường truyền mạng gặp sự cố.
