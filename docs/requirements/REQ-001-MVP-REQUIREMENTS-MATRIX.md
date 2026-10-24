# SHIFTSYNC — MVP REQUIREMENTS SPECIFICATION & ACCEPTANCE CRITERIA MATRIX
## Mã tài liệu: `docs/requirements/REQ-001-MVP-REQUIREMENTS-MATRIX.md`
**Phiên bản:** 1.0.0 | **Ngày ban hành:** 14/10/2026 | **Tác giả:** Senior Business Analyst & Requirements Engineer  
**Hệ thống:** ShiftSync Monorepo (`quoc-backend` - Baseline: `c9d4df1`)  
**Phạm vi:** 4-Week MVP Scope & Traceable Requirements Matrix cho 4 Phân hệ Nghiệp vụ Cốt lõi và 2 Chế độ Camera

---

## 1. NGUỒN CHỨNG CỨ DỰ ÁN & THIẾT LẬP SOURCE OF TRUTH (SOURCE OF TRUTH CONTEXT)

### 1.1. Mục đích Sản phẩm & Giá trị Người dùng (Product Mission)
**ShiftSync** là nền tảng quản trị và điều phối lực lượng lao động thông minh (Smart Workforce Management Platform) kết hợp bản sao kỹ thuật số 3D (3D Spatial Digital Twin) dành riêng cho các chuỗi bán lẻ, chuỗi nhà hàng cà phê (F&B) và chuỗi dịch vụ đa chi nhánh (`[VERIFIED]`, `PROJECT_CONTEXT.md`, `SYSTEM_MAP.md`).
- **Bài toán cốt lõi giải quyết:**
  1. Tự động hóa lập lịch ca thông minh tuân thủ 100% luật lao động và hợp đồng (Dynamic MRV + Local Repair).
  2. Trực quan hóa mặt bằng 2D/3D và mật độ nhân sự trực trạm theo thời gian thực (Digital Twin & Workstation Occupancy).
  3. Điểm danh thực chứng chống gian lận/chấm công hộ bằng định vị GPS Haversine và 2 chế độ camera phần cứng (QR Code động & Chân dung Live Selfie).
  4. Tối ưu hóa linh hoạt lực lượng lao động qua sàn nhận ca mở có khóa phân tán (Marketplace) và đổi ca ngang hàng (Shift Swap).

### 1.2. Đối tượng Người dùng & Vai trò (Target Roles & Principal Workflows)
Hệ thống sử dụng mô hình RBAC 3 vai trò chuẩn hóa qua enum `SystemRole` (`[VERIFIED]`, `SystemRole.java`, `StoreAccessService.java`):

| Vai trò (Role) | Định danh Token/DB | Giao diện chính | Luồng nghiệp vụ trọng tâm (Principal Workflows) |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `ROLE_ADMIN` | Web Dashboard (`/admin`) | Cấu hình toàn chuỗi: Danh mục cửa hàng, định mức nhân sự (Headcount Quota), danh mục kỹ năng, cấu hình thuật toán, can thiệp mở khóa dữ liệu đã chốt, tra cứu Audit Log toàn hệ thống. Bỏ qua rào chắn Store Isolation. |
| **Quản lý cửa hàng (Manager)** | `ROLE_MANAGER` | Web Dashboard | Quản lý chi nhánh phụ trách: Khởi chạy xếp ca tự động (`/auto-schedule`), điều chỉnh vị trí trạm làm việc 3D (Workstation Editor), tạo mã QR điểm danh động, duyệt giải trình chấm công, duyệt đổi ca (Swap Approval), phát hành ca mở lên Marketplace. Tuân thủ Store Isolation. |
| **Nhân viên (Staff)** | `ROLE_STAFF` | Mobile App (Expo / React Native) | Tự phục vụ hiện trường: Đăng ký khung giờ rảnh (Availability), báo bận đột xuất (Blackout), xem lịch ca cá nhân, điểm danh vào/ra ca qua quét QR hoặc chụp ảnh Live Selfie kèm GPS, nhận ca mở trên Marketplace, gửi yêu cầu đổi ca. |

### 1.3. Định danh 4 Phân hệ Nghiệp vụ Cốt lõi (The Four Core Modules)
Căn cứ vào kiến trúc thực tế của hệ thống (`[VERIFIED]`, `SYSTEM_MAP.md`, `CODEBASE_MAP.md`, `UC-00_System_Overview.puml`), phạm vi MVP 4 tuần tập trung vào 4 module trụ cột sau:
1. **Module 1 (M1) — Shift Management & Automated Scheduling (Lập kế hoạch & Xếp ca tự động):**
   - Động cơ lập lịch ca theo thuật toán Heuristic Dynamic MRV + Local Repair.
   - Kiểm soát 5 Ràng buộc cứng (HC1 - HC5: Kỹ năng còn hạn, Khung giờ rảnh/bận/phép, Trùng ca/ca đêm, Trần giờ tuần hợp đồng, Giờ nghỉ tối thiểu giữa ca).
   - Sinh ca nháp từ Định mức nhân sự (Headcount Quota) và chuyển trạng thái ca `DRAFT` $\rightarrow$ `PUBLISHED`.
2. **Module 2 (M2) — 3D Spatial Workspace & Store Digital Twin (Bản sao số không gian 3D & Trạm làm việc):**
   - Trực quan hóa mặt bằng 2D/3D cửa hàng (`StoreLayout`, `StoreZone`, `Workstation`).
   - Bộ điều khiển bố trí trạm làm việc 3D (Workstation Layout Editor: Raycasting, kiểm tra va chạm 1.1m, lưu tọa độ).
   - Trực quan hóa nhân sự trực trạm (Workstation Occupancy: `ASSIGNED`, `UNASSIGNED`, `UNKNOWN`, đối soát Hiện diện thực tế vs Phân công theo lịch).
   - Mô phỏng What-If điều phối nhân sự (Transfer, Swap, Leave Absence) và áp dụng an toàn qua API Atomic Swap.
   *(Bao gồm 2 chế độ quan sát 3D: Overview Isometric Perspective & Top-Down Architectural Plan - `[VERIFIED]`, `REQ-001_DIGITAL_TWIN_MVP_REQUIREMENTS.md`).*
3. **Module 3 (M3) — Attendance Verification & Time Tracking (Chấm công thực địa & Điểm danh 2 Chế độ Camera):**
   - Điểm danh vào ca / ra ca (Check-in & Check-out) có kiểm soát khung thời gian (Window) và ân hạn đi trễ (Grace period).
   - Xác thực vị trí địa lý thông qua công thức mặt cầu Haversine đối chiếu bán kính Geofence cửa hàng (`d <= geofenceRadiusM`).
   - Hai chế độ Camera phần cứng độc lập: Quét mã QR Token động (Mode 1) & Chụp ảnh chân dung Live Selfie (Mode 2).
   - Quy trình gửi đơn khiếu nại / giải trình chấm công (Attendance Adjustment Workflow).
4. **Module 4 (M4) — Shift Marketplace & Workforce Coordination (Thị trường ca mở & Điều phối nhân sự):**
   - Thị trường nhận ca làm việc mở (Marketplace Claim) bảo vệ bằng khóa phân tán Redisson (`RLock`) chống tranh chấp đồng thời (Race Condition).
   - Quy trình đổi ca ngang hàng (Peer Shift Swap) 2 pha: Nhân viên B đồng thuận $\rightarrow$ Quản lý phê duyệt (kiểm tra xung đột ca).
   - Mượn nhân sự liên chi nhánh (Cross-Store Workforce Sharing): Cửa hàng A yêu cầu $\rightarrow$ Cửa hàng B đề xuất $\rightarrow$ Nhân viên chấp thuận.

### 1.4. Định danh 2 Chế độ Camera Phần cứng (The Two Hardware Camera Modes)
Căn cứ vào mã nguồn Mobile (`AttendanceScreenLive.js`), Backend Controller (`AttendanceController.java`), Service (`AttendanceService.java`) và sơ đồ hoạt động (`AD-07_Attendance_Payroll.puml`), hệ thống điểm danh trang bị 2 chế độ camera phần cứng:
- **Camera Mode 1: Dynamic QR Code Scanner (Quét mã QR động):**
  - Sử dụng Camera sau (Back-facing / Environment camera) của thiết bị di động để quét mã QR điểm danh động do Quản lý cửa hàng trình chiếu trên Web Dashboard hoặc Kiosk.
  - Mã QR mang JWT token có chữ ký số HMAC-SHA256, thời hạn sống ngắn (TTL 5 phút) để triệt tiêu hành vi chụp ảnh mã QR gửi cho người khác quét hộ (`[VERIFIED]`, `AttendanceService.java:42`).
- **Camera Mode 2: Live Selfie Capture (Chụp ảnh chân dung xác thực thực tế):**
  - Sử dụng Camera trước (Front-facing / User camera) của thiết bị di động để chụp trực tiếp ảnh selfie của nhân viên tại thời điểm check-in và check-out.
  - Ảnh được nén và gửi dạng Multipart File (`BYTEA`) lên máy chủ PostgreSQL, lưu vết bằng chứng thị giác phục vụ thanh tra và đối soát giải trình khiếu nại công (`[VERIFIED]`, `AttendanceController.java:52`, `AD-07`).

---

## 2. BIÊN GIỚI PHẠM VI MVP 4 TUẦN (4-WEEK MVP SCOPE BOUNDARY)

### 2.1. Mục tiêu MVP & Giá trị Nghiệm thu (MVP Objective)
Xây dựng một hệ thống hoàn chỉnh, tích hợp liền mạch giữa Web và Mobile trong vòng 4 tuần, cho phép:
1. Quản lý lập lịch tự động cho 1 tuần, quan sát được vị trí nhân sự trên bản đồ 3D cửa hàng.
2. Nhân viên di động đến cửa hàng, bật camera quét mã QR hoặc chụp ảnh selfie để hoàn tất chấm công trong bán kính cho phép.
3. Nhân viên có thể tự do tranh nhận ca mở trên Marketplace hoặc đổi ca cho nhau một cách an toàn, không xảy ra xung đột dữ liệu.

### 2.2. Danh mục Tính năng Thuộc Phạm vi (Inclusions)

| Mã Phân hệ | Tính năng / Năng lực cốt lõi | Mức ưu tiên | Đối tượng hưởng lợi |
| :--- | :--- | :---: | :--- |
| **M1** | Lập lịch tự động 7 ngày bằng Heuristic Dynamic MRV + Local Repair | **P0** | Manager, Staff |
| **M1** | Kiểm soát 5 Hard Constraints (HC1-HC5) và Soft Fairness Cap | **P0** | Manager, Staff |
| **M1** | Phát hành ca làm việc (`DRAFT` $\rightarrow$ `PUBLISHED`) và gửi thông báo FCM | **P0** | Manager, Staff |
| **M1** | Cấu hình trọng số thuật toán xếp ca (`SchedulerConfiguration`) | **P1** | Manager, Admin |
| **M1** | Tự động sinh ca nháp từ Định mức nhân sự theo giờ (`Headcount Quota`) | **P1** | Manager |
| **M2** | Mặt bằng 3D Three.js, Zone Decals và Floating Tag Sprites hiển thị trạng thái | **P0** | Manager |
| **M2** | Công cụ Bố trí trạm làm việc 3D (Workstation Layout Editor: Raycasting, Collision 1.1m, Clamping) | **P0** | Manager, Admin |
| **M2** | Trực quan hóa Phân công & Hiện diện thực tế tại Trạm (Workstation Occupancy: Assigned/Unassigned/Unknown) | **P0** | Manager |
| **M2** | Mô phỏng What-If (Transfer avatar 3D, kiểm tra va chạm, xem Diff Trước/Sau) | **P1** | Manager |
| **M2** | Lưu kết quả mô phỏng Atomic SWAP với khóa bi quan (`PESSIMISTIC_WRITE`) | **P0** | Manager |
| **M3** | Điểm danh bằng Camera Mode 1: Quét mã QR động (Back Camera, JWT TTL 5 phút) | **P0** | Staff |
| **M3** | Điểm danh bằng Camera Mode 2: Chụp ảnh Live Selfie (Front Camera, Multipart BYTEA) | **P0** | Staff |
| **M3** | Xác thực định vị GPS Geofence bằng công thức Haversine bán kính 50m - 100m | **P0** | Staff, Manager |
| **M3** | Đánh giá trạng thái chấm công tự động (`PRESENT`, `LATE`, `EARLY_LEAVE`) và bắn WebSocket Realtime | **P0** | Staff, Manager |
| **M3** | Quy trình tạo đơn giải trình điều chỉnh công (Attendance Adjustment Workflow) | **P1** | Staff, Manager |
| **M4** | Thị trường nhận ca mở (Marketplace Claim) bảo vệ bằng Redisson Distributed Lock | **P0** | Staff |
| **M4** | Đổi ca ngang hàng (Peer Shift Swap) 2 pha có kiểm tra trùng ca và trần giờ | **P0** | Staff, Manager |
| **M4** | Điều động & chia sẻ nhân sự liên chi nhánh (Cross-Store Workforce Sharing) | **P1** | Manager, Staff |

### 2.3. Danh mục Rõ ràng Nằm ngoài Phạm vi 4 Tuần (Explicit Exclusions)
Để bảo đảm tính khả thi tuyệt đối trong 4 tuần, các tính năng sau được loại trừ rõ ràng khỏi phạm vi MVP:
1. **Phân hệ Tính toán Tiền lương Nâng cao (Advanced Payroll Engine & PDF/Excel Export):** Hoãn sang Phase 4 / Sau MVP. Trong MVP, chỉ ghi nhận giờ công thực tế (`duration = checkOut - checkIn`) phục vụ đối soát, chưa tự động kết xuất phiếu lương chi tiết.
2. **Nhận diện Khuôn mặt Sinh trắc học AI (AI Face Biometric Matching / Face Liveness 3D Detection):** Ảnh selfie được lưu trữ nguyên bản để Quản lý đối soát trực quan; không tích hợp model AI nhận diện khuôn mặt tự động trong 4 tuần này.
3. **Tích hợp Máy Chấm công Vân tay / Thẻ từ Vật lý:** Không hỗ trợ máy quẹt thẻ phần cứng bên thứ ba (Ronald Jack, ZKTeco).
4. **Điểm danh Ngoại tuyến (Offline Attendance Queueing):** Thiết bị bắt buộc phải có kết nối Internet để gọi API xác thực tức thời với máy chủ.
5. **Đa ngôn ngữ & Bản địa hóa chuyên sâu (i18n):** Hệ thống chỉ tập trung vào ngôn ngữ Tiếng Việt chuẩn hóa.
6. **Mở rộng Đa nền tảng Desktop Native:** Không đóng gói ứng dụng Electron cho Desktop.

### 2.4. Ràng buộc Kỹ thuật, Quyền hạn & Thiết bị (Technical & Device Constraints)
- **Thiết bị Di động & Camera:**
  - Hỗ trợ iOS 15+ và Android 10+ chạy trên Expo Go / Native Build.
  - Ứng dụng yêu cầu cấp quyền Camera (`expo-camera` - `CameraView`) và quyền Vị trí Foreground (`expo-location` - `Accuracy.Balanced`).
  - Phải có ít nhất 1 Camera trước (cho Selfie) và 1 Camera sau (cho Quét QR). Trường hợp camera bị che hoặc hỏng phần cứng, hệ thống phải báo lỗi rõ ràng.
- **Ràng buộc Mạng & Định vị:**
  - Sai số GPS ngoài trời cho phép: Dung sai bán kính Geofence cấu hình trong `StoreConfiguration.geofenceRadiusM` (mặc định 100m, hỗ trợ điều chỉnh 50m - 200m).
  - Tải lên ảnh selfie: Giới hạn dung lượng tệp tối đa 10MB (`application.properties: spring.servlet.multipart.max-file-size=10MB`).
- **Ràng buộc Phân quyền & Bảo mật (Store Isolation & RBAC):**
  - Mọi thao tác đều phải mang Bearer JWT Token hợp lệ trong header.
  - Quản lý cửa hàng A tuyệt đối không được xem hoặc sửa dữ liệu cửa hàng B (`StoreAccessService.canAccessStore`).
  - Tài khoản bị Logout sẽ bị đưa token vào Redis Blacklist (`TTL = thời gian sống còn lại`).

### 2.5. Định nghĩa Hoàn thành Tổng thể (Definition of Done - DoD for MVP)
Toàn bộ MVP 4 tuần chỉ được xem là hoàn tất khi:
1. **Độ bao phủ Tính năng:** 100% các yêu cầu phân loại **P0** đã được cài đặt và hoạt động thông suốt End-to-End từ Client đến Backend và Database.
2. **Kiểm thử Tự động:**
   - 100% các bài kiểm thử Backend (hiện có 488 tests) tiếp tục duy trì trạng thái PASS 100%.
   - 100% các bài kiểm thử Frontend Web (45 tests) và Mobile unit tests duy trì PASS 100%.
   - Không phát sinh lỗi hồi quy (Zero Regression) trên các chức năng đã đóng băng ở các phase trước.
3. **Kiểm thử Thực địa (Hardware Device Acceptance):** 2 chế độ Camera (QR Scanner và Live Selfie) được diễn tập thành công trên thiết bị di động thật (iOS/Android), xác thực chuẩn xác tọa độ GPS Haversine và lưu trữ ảnh selfie vào CSDL.
4. **An toàn Bảo mật:** Cơ chế khóa phân tán Redisson ngăn ngừa triệt để 100% lỗi Double-Claim trên Marketplace khi test đồng thời; khóa `PESSIMISTIC_WRITE` ngăn ngừa Deadlock khi đổi ca.

---

## 3. MA TRẬN YÊU CẦU NGHIỆP VỤ 4 PHÂN HỆ (FOUR-MODULE REQUIREMENTS MATRIX)

Quy ước nhãn trạng thái và chứng cứ:
- **Priority:** `P0` (Bắt buộc), `P1` (Nên có), `P2` (Tùy chọn mở rộng).
- **Evidence:** `[VERIFIED]` (Đã chứng minh bằng code/test), `[REPORTED]` (Báo cáo cũ), `[INFERRED]` (Suy luận logic), `[PROPOSED]` (Đề xuất mới chờ duyệt).
- **Status:** `ACTIVE_VERIFIED` (Đang hoạt động và đã xác minh), `APPROVED_FOR_MVP` (Đã chốt trong phạm vi MVP), `PROPOSED` (Đang đề xuất).

| Requirement ID | Module | Requirement (Tên yêu cầu) | User/Actor (Tác nhân) | Priority | Preconditions (Điều kiện tiên quyết) | Expected Behavior (Hành vi kỳ vọng) | Acceptance Criteria (Tiêu chí nghiệm thu) | Negative Cases (Kịch bản ngoại lệ) | Verification Method (Phương pháp xác minh) | Dependencies (Phụ thuộc) | Evidence/Source (Bằng chứng) | Status (Trạng thái) |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **REQ-M1-01** | M1 | Tự động xếp ca làm việc bằng Heuristic Dynamic MRV | Manager | **P0** | Có danh sách ca `DRAFT` trong khoảng 7 ngày; có nhân viên `ACTIVE` có role `STAFF`. | Hệ thống lọc 5 Hard Constraints, áp dụng Dynamic MRV gán slot hẹp nhất trước, tính soft score và cứu ca bằng Local Repair. | **Given** cửa hàng có các ca `DRAFT` và danh sách nhân viên,<br/>**When** Manager bấm Xếp ca tự động,<br/>**Then** hệ thống trả về HTTP 200 kèm `AutoScheduleResult`, `coverageRate` được tính toán, và các phân công `AUTO` được lưu vào DB. | Ca không đủ nhân sự đáp ứng HC $\rightarrow$ ghi nhận vào `shortageSlots`, không tạo bản ghi ma. | Automated Unit & Benchmark Test | M1, CSDL `shifts`, `shift_assignment` | `AutoScheduleService.java:60`, `AutoScheduleAssignmentCorrectnessTest` (25/25 pass) | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M1-02** | M1 | Kiểm soát nghiêm ngặt 5 Ràng buộc cứng (HC1 - HC5) | System | **P0** | Dữ liệu kỹ năng, availability, blackout, nghỉ phép và hợp đồng của nhân viên đã được nạp. | Tuyệt đối không phân công nhân viên nếu vi phạm bất kỳ ràng buộc nào trong HC1..HC5. | **Given** nhân viên A có chứng chỉ hết hạn hoặc trùng giờ ca khác,<br/>**When** thuật toán xếp lịch chạy,<br/>**Then** nhân viên A bị loại khỏi danh sách ứng viên hợp lệ của ca đó. | Nhân viên vi phạm giờ nghỉ giữa 2 ca $< minRestHours$ $\rightarrow$ loại bỏ khỏi ứng viên. | Automated Test Suite | M1, CSDL `staff_skills`, `availabilities` | `AutoScheduleService.java:180-260`, HC1-HC5 Test Matrix | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M1-03** | M1 | Cơ chế cân bằng công bằng tải (Soft Fairness Cap & Tie-Break) | System | **P0** | Đã hoàn tất lọc ràng buộc cứng; có $> 1$ ứng viên hợp lệ. | Loại bớt ứng viên vượt $1.3 \times \bar{H}_{month}$; tie-break bằng Contract Utilization Ratio (`assignedHours / maxWeeklyHours`). | **Given** 2 ứng viên cùng đạt điểm tối đa,<br/>**When** thực hiện chọn ứng viên,<br/>**Then** hệ thống ưu tiên người có tỷ lệ sử dụng hợp đồng thấp hơn. | Đội ngũ chỉ có 1 ứng viên hợp lệ $\rightarrow$ bỏ qua Soft Fairness Cap để tránh thiếu ca. | Unit Test | M1, `SchedulerConfiguration` | `AutoScheduleService.java:235-255`, `PHASE-3-AUTOSCHEDULE-AUDIT.md` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M1-04** | M1 | Bảo tồn phân công thủ công & Tính Idempotent khi chạy lại | Manager | **P0** | Ca làm việc đang ở trạng thái `DRAFT`. | Khi chạy lại `/auto-schedule`, chỉ xóa phân công có `source == AUTO`; bảo toàn nguyên vẹn `MANUAL` và `OPEN_SHIFT`. | **Given** ca có 1 phân công `MANUAL` do quản lý xếp tay,<br/>**When** quản lý chạy lại AutoSchedule,<br/>**Then** phân công `MANUAL` vẫn giữ nguyên, các vị trí còn lại được xếp mới. | Ca đã ở trạng thái `PUBLISHED` hoặc `COMPLETED` $\rightarrow$ chặn không cho chạy auto-schedule. | Integration Test | M1, `ShiftAssignmentRepository` | `AutoScheduleService.java:95-102`, `ShiftScheduleExceptionAuditTest` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M1-05** | M1 | Phát hành ca làm việc (Publish Shifts) & Gửi thông báo | Manager | **P0** | Các ca làm việc trong tuần đã được gán đủ nhân sự hoặc được quản lý xác nhận. | Chuyển trạng thái ca từ `DRAFT` sang `PUBLISHED`, kích hoạt thông báo đẩy FCM và In-app tới nhân viên được gán. | **Given** tuần làm việc có các ca `DRAFT`,<br/>**When** Manager gọi `POST /api/stores/{storeId}/shifts/publish`,<br/>**Then** toàn bộ ca đổi sang `PUBLISHED`, nhân viên nhìn thấy ca trên ứng dụng Mobile. | Ca chưa có phân công nào vẫn cho phép publish nếu quản lý đồng ý mở ca trên Marketplace. | API & Integration Test | M1, `NotificationService`, FCM | `ShiftService.java:140`, `ShiftController.java` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M1-06** | M1 | Tự động sinh ca nháp từ Định mức nhân sự (Headcount Quota) | Manager | **P1** | Đã cấu hình định mức nhân sự theo khung giờ trong `StoreQuotaConfig`. | Tự động sinh danh sách ca nháp tương ứng với số lượng nhân sự tối thiểu cần thiết cho từng khung giờ. | **Given** cấu hình Quota yêu cầu 3 Barista lúc 08:00 - 12:00,<br/>**When** quản lý bấm sinh ca tự động từ Quota,<br/>**Then** hệ thống sinh ra ca `DRAFT` với yêu cầu kỹ năng tương ứng. | Cửa hàng chưa cấu hình Quota $\rightarrow$ hiển thị cảnh báo yêu cầu thiết lập trước. | Unit & API Test | M1, `QuotaService` | `SYSTEM_MAP.md:227`, `StoreQuotaConfig` | `APPROVED_FOR_MVP` `[VERIFIED]` |
| **REQ-M2-01** | M2 | Trực quan hóa mặt bằng 2D/3D & Phân vùng chức năng (Zones) | Manager | **P0** | Cửa hàng đã được cấu hình kích thước Dài x Rộng và danh sách phân vùng. | Hiển thị mô hình sàn 3D tỷ lệ thực, nhãn decal khu vực, màu sắc trạng thái nhân sự và sơ đồ kỹ thuật 2D. | **Given** người dùng truy cập màn hình Không gian 3D,<br/>**When** chọn một cửa hàng hợp lệ,<br/>**Then** hệ thống tải mặt bằng, hiển thị các khối phân vùng và nhãn lơ lửng (Floating Tag Sprites). | Dữ liệu layout bị rỗng $\rightarrow$ hiển thị mặt bằng mặc định $10\text{m} \times 8\text{m}$ có thông báo hướng dẫn. | WebGL Canvas Test | M2, Three.js, `layoutService` | `Store3DCanvas.jsx`, `TwoDSpatialSchematic.jsx` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M2-02** | M2 | Công cụ Bố trí trạm làm việc 3D (Workstation Layout Editor) | Manager, Admin | **P0** | Người dùng có role `ADMIN` hoặc `MANAGER` của cửa hàng; đã kích hoạt chế độ Bố trí. | Cho phép click chọn trạm, kéo thả raycasting trên mặt phẳng sàn, giới hạn biên và phát hiện va chạm $1.1\text{m}$. | **Given** Manager đang ở chế độ Bố trí Trạm,<br/>**When** kéo thả trạm làm việc đến tọa độ hợp lệ và bấm Lưu,<br/>**Then** vị trí được cập nhật lên backend qua `PUT /api/stores/{storeId}/workstations/{id}`. | Kéo trạm làm việc đè lên trạm khác trong phạm vi $< 1.1\text{m}$ $\rightarrow$ vòng chỉ thị chuyển sang ĐỎ, nút Lưu bị vô hiệu hóa. | Unit & E2E Test | M2, Three.js Raycaster, `LayoutController` | `WorkstationDragController.js`, `PHASE-2A-WORKSTATION-LAYOUT-EDITOR.md` (21/21 pass) | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M2-03** | M2 | Trực quan hóa Hiện diện thực tế vs Lịch ca (Workstation Occupancy) | Manager | **P0** | Đã tải ca làm việc, phân công và dữ liệu điểm danh thực tế (`Attendance`). | Phân giải chuẩn xác 3 trạng thái: `ASSIGNED`, `UNASSIGNED`, `UNKNOWN`. Phân biệt rõ Có mặt thực tế (`checkIn && !checkOut`) vs Chưa đến. | **Given** nhân viên A có ca làm việc và đã check-in thành công,<br/>**When** quản lý xem trạm làm việc trên 3D,<br/>**Then** sprite trạm hiển thị màu xanh ngọc (`#10B981`) và thẻ Inspector báo "Đang trực trạm". | API điểm danh bị lỗi hoặc đang tải $\rightarrow$ hiển thị trạng thái `UNKNOWN` (màu xám slate), tuyệt đối không báo là trạm trống. | Unit & Integration Test | M2, M3, `workstationOccupancy.js` | `FurnitureBuilder.js`, `PHASE-2B-WORKSTATION-OCCUPANCY.md` (28/28 pass) | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M2-04** | M2 | Bảo vệ cô lập dữ liệu cửa hàng khi điều hướng (Store Isolation Guard) | Manager | **P0** | Người dùng chuyển đổi giữa các chi nhánh cửa hàng trên thanh công cụ. | Reset toàn bộ selection, tọa độ nháp, cảnh báo va chạm và hủy yêu cầu kéo dở dang khi đổi cửa hàng. | **Given** người dùng đang chọn và kéo trạm tại Cửa hàng A,<br/>**When** chuyển sang xem Cửa hàng B,<br/>**Then** toàn bộ trạng thái kéo của Cửa hàng A bị xóa sạch, ngăn ngừa lưu nhầm tọa độ sang Cửa hàng B. | Người dùng cố tình gọi API cập nhật trạm của store khác $\rightarrow$ Backend ném HTTP 403 Forbidden. | Integration Regression Test | M2, `SpatialWorkspace.jsx`, `StoreAccessService` | `DigitalTwinRegression.test.js`, `PHASE-2C-REGRESSION-RELIABILITY.md` (45/45 pass) | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M2-05** | M2 | Mô phỏng điều phối What-If và Lưu thay đổi Atomic SWAP | Manager | **P0** | Người dùng bật chế độ Thử nghiệm nhân sự (What-If Simulation Room). | Thay đổi lưu trong local Zustand store, hiển thị Diff Trước/Sau; khi bấm Lưu, gọi endpoint Atomic Swap có khóa `PESSIMISTIC_WRITE`. | **Given** quản lý hoán đổi vị trí của Nhân viên 1 và Nhân viên 2,<br/>**When** bấm "Lưu & Áp dụng",<br/>**Then** hệ thống gọi `POST .../assignments/swap` cập nhật đồng thời cả 2 bản ghi không gây mất mát dữ liệu. | Hai quản lý cùng swap đồng thời $\rightarrow$ thứ tự canonical UUID ngăn ngừa triệt để deadlock. | Backend Concurrency Test | M1, M2, `ShiftAssignmentService` | `FIX-001C_ATOMIC_SWAP_DESIGN.md`, `DigitalTwinConcurrencyIntegrationTest` (21/21 pass) | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M3-01** | M3 | Điểm danh vào/ra ca qua Quét mã QR động (Camera Mode 1) | Staff | **P0** | Nhân viên được phân công ca hôm nay; đứng tại cửa hàng; có mã QR động hợp lệ. | Bật camera sau quét mã QR, gửi JWT Token + GPS lên backend, ghi nhận giờ và trạng thái điểm danh. | **Given** nhân viên đứng trong cửa hàng và quét mã QR hợp lệ,<br/>**When** bấm quét và gửi dữ liệu,<br/>**Then** hệ thống tạo bản ghi `Attendance`, cập nhật `checkInTime` và trả về trạng thái `PRESENT` hoặc `LATE`. | Quét mã QR đã hết hạn ($> 5$ phút) hoặc mã giả mạo $\rightarrow$ ném lỗi HTTP 400 Bad Request. | API & Mobile Test | M3, Camera phần cứng, GPS | `AttendanceService.java:57-99`, `AttendanceController.java:44` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M3-02** | M3 | Điểm danh vào/ra ca qua Chụp ảnh Live Selfie (Camera Mode 2) | Staff | **P0** | Nhân viên được gán vào ca; camera trước hoạt động bình thường; đã cấp quyền GPS. | Chụp ảnh chân dung thực tế, gửi kèm tọa độ GPS dạng Multipart Form Data, lưu ảnh vào CSDL `BYTEA`. | **Given** nhân viên mở camera trước và chụp ảnh selfie,<br/>**When** hệ thống tải ảnh và tọa độ lên máy chủ,<br/>**Then** hệ thống lưu ảnh selfie, ghi nhận giờ check-in/check-out và phát sự kiện realtime qua WebSocket. | Gửi request không có file ảnh hoặc ảnh rỗng $\rightarrow$ Backend ném HTTP 400 "A live selfie is required". | API & Mobile Device Test | M3, Camera trước, Multipart Form | `AttendanceService.java:101-128`, `AttendanceScreenLive.js` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M3-03** | M3 | Kiểm tra ranh giới địa lý bằng công thức Haversine (Geofencing) | System | **P0** | Cửa hàng đã được cấu hình tọa độ Lat/Lng và bán kính `geofenceRadiusM`. | Tính khoảng cách đường cong mặt cầu giữa thiết bị và cửa hàng; từ chối điểm danh nếu khoảng cách vượt bán kính cho phép. | **Given** nhân viên đứng cách cửa hàng $250\text{m}$ (bán kính cho phép $100\text{m}$),<br/>**When** nhân viên gửi yêu cầu điểm danh QR hoặc Selfie,<br/>**Then** hệ thống từ chối với HTTP 400 kèm thông báo "You are out of the allowed geofence area". | Cửa hàng chưa cấu hình tọa độ GPS $\rightarrow$ ném HTTP 400 yêu cầu quản trị viên cấu hình. | Unit & Integration Test | M3, `StoreConfiguration` | `AttendanceService.java:295-315`, `AD-07_Attendance_Payroll.puml` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M3-04** | M3 | Kiểm tra khung giờ điểm danh & Tính toán trạng thái trễ / về sớm | System | **P0** | Ca làm việc có giờ bắt đầu (`startTime`) và kết thúc (`endTime`); cấu hình khung giờ ân hạn. | Xác thực thời điểm check-in nằm trong cửa sổ `[start - allowedMinutes, start + allowedMinutes]`. Tự động gắn nhãn `LATE` nếu sau `lateGraceMinutes`. | **Given** ca bắt đầu lúc 08:00, ân hạn trễ 15 phút,<br/>**When** nhân viên check-in lúc 08:20,<br/>**Then** bản ghi được lưu với `status = LATE` và `lateMinutes = 20`. | Check-in quá sớm trước cửa sổ cho phép $\rightarrow$ ném HTTP 400 "Too early to check in". | Unit Test | M3, `AttendanceRepository` | `AttendanceService.java:130-184` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M3-05** | M3 | Quy trình khiếu nại & Giải trình điều chỉnh công (Attendance Adjustment) | Staff, Manager | **P1** | Đã có bản ghi chấm công bị trễ, về sớm hoặc quên check-out; ca chưa bị khóa sổ lương. | Nhân viên gửi đơn giải trình kèm mốc giờ đề xuất; Quản lý xem đối soát ảnh selfie và bấm Duyệt/Từ chối. | **Given** nhân viên bị ghi nhận đi trễ do sự cố GPS,<br/>**When** nhân viên gửi đơn giải trình và Manager bấm Duyệt,<br/>**Then** giờ công được cập nhật lại, trạng thái chuyển sang hợp lệ và ghi vết vào `AuditLog`. | Kỳ lương đã ở trạng thái `CONFIRMED` hoặc `PAID` $\rightarrow$ ném HTTP 403 Forbidden không cho sửa đổi. | API & Integration Test | M3, `AttendanceAdjustmentService` | `AttendanceAdjustmentService.java`, `AttendanceScreenLive.js:156` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M4-01** | M4 | Nhận ca mở trên Marketplace với Khóa phân tán Redisson | Staff | **P0** | Ca làm việc đang mở (`isOpen = true`); còn slot trống; chưa quá hạn đăng ký. | Dùng `RLock` tên `shift_claim_lock:{shiftId}` (chờ tối đa 5s, giữ tối đa 10s); kiểm tra hợp lệ nhân sự và tạo phân công `OPEN_SHIFT`. | **Given** ca mở còn 1 slot trống và có 2 nhân viên cùng bấm nhận cùng giây,<br/>**When** hệ thống tiếp nhận request,<br/>**Then** đúng 1 nhân viên nhận thành công (HTTP 200), nhân viên còn lại nhận thông báo HTTP 409 Conflict. | Nhân viên không đủ kỹ năng hoặc bị trùng giờ ca khác $\rightarrow$ ném HTTP 400 từ chối nhận ca. | Concurrency Integration Test | M4, Redisson, Redis 7, `ShiftAssignmentValidator` | `MarketplaceService.java:60-120`, `ShiftScheduleExceptionAuditTest:480` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M4-02** | M4 | Đổi ca ngang hàng (Peer Shift Swap) quy trình 2 pha an toàn | Staff, Manager | **P0** | Hai ca thuộc cùng một chi nhánh cửa hàng; chưa có yêu cầu đổi ca nào đang `PENDING`. | Pha 1: Nhân viên A gửi lời mời $\rightarrow$ Nhân viên B đồng ý. Pha 2: Quản lý thẩm định không trùng lịch $\rightarrow$ Hoán đổi phân công. | **Given** Nhân viên B đã bấm chấp thuận đổi ca,<br/>**When** Manager bấm Phê duyệt yêu cầu đổi ca,<br/>**Then** hệ thống hoán đổi `staffId` trên 2 phân công, gán `source = SWAP` và bắn thông báo cho cả hai. | Ca sau khi đổi làm Nhân viên A bị vượt quá 48h/tuần $\rightarrow$ Manager nhận cảnh báo lỗi và hủy giao dịch. | API & Integration Test | M1, M4, `ShiftSwapService` | `ShiftSwapService.java:80-140`, `SYSTEM_MAP.md:350-383` | `ACTIVE_VERIFIED` `[VERIFIED]` |
| **REQ-M4-03** | M4 | Điều động & Chia sẻ nhân sự liên chi nhánh (Cross-Store Workforce) | Manager, Staff | **P1** | Chi nhánh A thiếu nhân sự; Chi nhánh B có nhân viên khả dụng và có kỹ năng phù hợp. | Quản lý A gửi yêu cầu $\rightarrow$ Quản lý B đề xuất nhân viên X $\rightarrow$ Nhân viên X bấm Đồng ý $\rightarrow$ Tự động tạo phân công ca tại Chi nhánh A. | **Given** Quản lý B đề xuất Nhân viên X cho Ca của Cửa hàng A,<br/>**When** Nhân viên X bấm "Đồng ý hỗ trợ" trên ứng dụng Mobile,<br/>**Then** hệ thống tạo bản ghi phân công hợp lệ tại Cửa hàng A và gửi thông báo tới 2 Quản lý. | Nhân viên X từ chối lời mời $\rightarrow$ yêu cầu quay về trạng thái tìm ứng viên khác. | API & Workflow Test | M1, M4, `WorkforceRequestService` | `WorkforceRequestService.java`, `SYSTEM_MAP.md:385-410` | `APPROVED_FOR_MVP` `[VERIFIED]` |

---

## 4. MA TRẬN CHUYÊN SÂU TIÊU CHÍ NGHIỆM THU 2 CHẾ ĐỘ CAMERA (DUAL CAMERA MODES)

Hệ thống điểm danh hiện trường của ShiftSync hỗ trợ 2 chế độ camera vật lý độc lập. Bảng dưới đây đặc tả đầy đủ 12 tiêu chí bắt buộc theo yêu cầu kỹ thuật:

### 4.1. Bảng Đặc tả Kỹ thuật Độc lập cho Từng Chế độ Camera

| STT | Khía cạnh đặc tả kỹ thuật | Camera Mode 1: Dynamic QR Code Scanner (Quét mã QR) | Camera Mode 2: Live Selfie Capture (Chụp ảnh Chân dung) |
| :---: | :--- | :--- | :--- |
| **1** | **Mục đích & Luồng người dùng** | - Xác nhận nhân viên có mặt vật lý tại trạm/kiosk bằng cách quét mã QR hiển thị tại cửa hàng.<br/>- Luồng: Mở app $\rightarrow$ Chọn ca $\rightarrow$ Bật Camera sau quét mã QR tại quầy $\rightarrow$ Tự động gửi dữ liệu khi nhận diện mã $\rightarrow$ Nhận phản hồi thành công. | - Chụp trực tiếp chân dung khuôn mặt thực tế tại thời điểm vào/ra ca để chống gian lận/chấm công hộ.<br/>- Luồng: Mở app $\rightarrow$ Chọn ca $\rightarrow$ Bật Camera trước $\rightarrow$ Căn chỉnh gương mặt $\rightarrow$ Bấm nút Chụp $\rightarrow$ Gửi ảnh multipart lên server $\rightarrow$ Nhận phản hồi. |
| **2** | **Điểm kích hoạt (Entry Trigger)** | - Nút "Quét mã QR Chấm công" trên màn hình `AttendanceScreenLive.js` hoặc Action Button trên thẻ ca làm việc trang chủ Mobile. | - Nút "Chụp ảnh Check-In" hoặc "Chụp ảnh Check-Out" trên màn hình `AttendanceScreenLive.js`. |
| **3** | **Thiết bị & Điều kiện phần cứng** | - Thiết bị di động iOS/Android có Camera sau (Back-facing) hoạt động bình thường, tối thiểu 720p.<br/>- Tích hợp thư viện quét mã vạch/QR của Expo (`expo-camera` với `barcodeScannerSettings`). | - Thiết bị di động iOS/Android có Camera trước (Front-facing / Selfie) hoạt động bình thường, tối thiểu 0.3MP (VGA).<br/>- Cảm biến GPS/Vị trí hoạt động với độ chính xác tối thiểu $\le 50\text{m}$. |
| **4** | **Luồng Cấp quyền (Permission Flow)** | - **Lần đầu:** Gọi `requestCameraPermission()`. Hiển thị hộp thoại hệ thống: *"ShiftSync cần quyền truy cập máy ảnh để quét mã QR điểm danh"*. Kèm yêu cầu quyền Vị trí Foreground.<br/>- **Từ chối (Denied):** Hiển thị cảnh báo trong ứng dụng giải thích lý do cần quyền.<br/>- **Chặn vĩnh viễn (Perm-Denied):** Nút mở thẳng cài đặt hệ điều hành (`Linking.openSettings()`). | - **Lần đầu:** Yêu cầu quyền truy cập Camera trước và quyền Vị trí Foreground (`Location.requestForegroundPermissionsAsync()`).<br/>- **Từ chối (Denied):** Khóa nút chụp ảnh, hiển thị thông báo: *"Vui lòng cấp quyền Camera để chụp ảnh xác nhận người thật việc thật"*.<br/>- **Chặn vĩnh viễn:** Điều hướng người dùng tới App Settings. |
| **5** | **Dữ liệu Vào & Đầu ra Thu thập** | - **Input:** Luồng video camera thời gian thực quét khung hình chứa mã QR.<br/>- **Output:** Chuỗi ký tự giải mã từ QR (JWT Token chuỗi Base64URL) kết hợp tọa độ thiết bị (`latitude: double`, `longitude: double`). | - **Input:** Hình ảnh chân dung khuôn mặt chụp từ camera trước qua `cameraRef.current.takePictureAsync({ quality: 0.6 })`.<br/>- **Output:** Tệp ảnh JPEG nén (kích thước $\approx 100\text{KB} - 500\text{KB}$) kết hợp tọa độ thiết bị (`latitude`, `longitude`) và `shiftId`. |
| **6** | **Quy tắc Thẩm định & Điều kiện Thành công** | 1. Token QR giải mã thành công chứa `shiftId` khớp với ca của nhân viên.<br/>2. Token QR chưa quá hạn (thời gian sống $\le 5$ phút kể từ lúc sinh).<br/>3. Khoảng cách Haversine $d \le \text{geofenceRadiusM}$ (thường $100\text{m}$).<br/>4. Thời điểm quét nằm trong khung giờ `[shiftStart - allowedMin, shiftStart + allowedMin]`.<br/>5. Nhân viên chưa từng check-in ca này (nếu vào ca) hoặc chưa check-out (nếu ra ca). | 1. Tệp ảnh đính kèm không được rỗng (`photo != null && photo.length > 0`).<br/>2. Định dạng ảnh là hình ảnh hợp lệ (JPEG/PNG), dung lượng $\le 10\text{MB}$.<br/>3. Khoảng cách Haversine $d \le \text{geofenceRadiusM}$.<br/>4. Ca làm việc không bị hủy (`status != CANCELLED`) và chưa bị khóa sổ lương (`isDateLocked == false`).<br/>5. Thời điểm chụp nằm trong khung giờ cho phép của ca. |
| **7** | **Trạng thái Tải, Hủy & Thử lại** | - **Scanning State:** Hiển thị khung ngắm quét laser màu xanh lá; tự động dừng quét khi đã nhận diện thành công.<br/>- **Hủy bỏ:** Bấm nút "Đóng" góc trên bên phải để tắt modal camera.<br/>- **Lỗi quét:** Nếu mã QR không đúng định dạng ShiftSync, hiển thị Toast cảnh báo: *"Mã QR không hợp lệ. Vui lòng quét mã do Quản lý cung cấp"*, cho phép camera tiếp tục quét lại sau 2 giây. | - **Capturing State:** Nút chụp chuyển sang vòng xoay spinner (`ActivityIndicator`), vô hiệu hóa nút bấm chống chụp 2 lần.<br/>- **Xem lại ảnh (Preview):** Hiển thị ảnh vừa chụp; cho phép người dùng bấm "Chụp lại" nếu ảnh bị nhòe/tối trước khi gửi lên máy chủ.<br/>- **Hủy bỏ:** Nút "Hủy" đóng camera và quay lại màn hình chi tiết ca. |
| **8** | **Giao thức Mạng & Tương tác API** | - **Endpoint:** `POST /api/attendance/scan`<br/>- **Content-Type:** `application/json`<br/>- **Request Body:**<br/>`{ "qrToken": "string", "latitude": 10.7769, "longitude": 106.7009 }`<br/>- **Response Status:** `201 CREATED` kèm `AttendanceDTO`. | - **Endpoint:** `POST /api/attendance/selfie`<br/>- **Content-Type:** `multipart/form-data`<br/>- **Request Params:** `shiftId={uuid}&latitude={lat}&longitude={lng}`<br/>- **Request Part:** `photo` (binary/image file)<br/>- **Response Status:** `201 CREATED` kèm `AttendanceDTO` chứa `checkInPhotoBase64`. |
| **9** | **Quyền riêng tư & Bảo mật Dữ liệu** | - Dữ liệu QR token chỉ chứa định danh phiên ca làm việc (`shiftId`), không chứa thông tin cá nhân (PII) của nhân viên.<br/>- Không lưu hình ảnh môi trường xung quanh; luồng video camera được giải phóng ngay sau khi đọc xong barcode. | - Ảnh chân dung chỉ sử dụng duy nhất cho mục đích đối soát chấm công nội bộ chuỗi.<br/>- Dữ liệu ảnh được lưu trực tiếp vào trường `BYTEA` bảo vệ trong CSDL PostgreSQL, chỉ có Quản lý chi nhánh phụ trách và Quản trị viên mới có quyền xem.<br/>- Ứng dụng hiển thị thông báo rõ ràng về việc ảnh sẽ được lưu trữ làm căn cứ đối soát tính lương. |
| **10** | **Chống Gian lận (Anti-Abuse Checks)** | - **Chữ ký số & TTL 5 phút:** Mã QR thay đổi liên tục và hết hạn sau 300 giây, ngăn chặn tuyệt đối việc chụp ảnh màn hình gửi qua Zalo/Telegram cho đồng nghiệp quét hộ.<br/>- **Kèm tọa độ GPS:** Dù có mã QR hợp lệ, nếu nhân viên ở ngoài bán kính $100\text{m}$ của cửa hàng thì vẫn bị từ chối. | - **Yêu cầu bắt buộc tệp ảnh:** Không cho phép gửi request rỗng (chặn cả ở Client và Backend validator).<br/>- **Đối soát thủ công:** Ảnh được gắn liền với mốc thời gian và vị trí trạm làm việc trên Digital Twin, Quản lý có thể đối chiếu khuôn mặt nhân viên trực trạm bất kỳ lúc nào.<br/>- **Kiểm tra trạng thái ca:** Chặn điểm danh đối với ca bị hủy hoặc ca đã khóa sổ lương. |
| **11** | **Kịch bản Nghiệm thu Đo lường được (Acceptance Scenarios)** | - **AC-CAM1-01 (Happy Path):** Given nhân viên đứng cách cửa hàng 30m và có QR hợp lệ, When quét mã thành công, Then nhận thông báo Check-in thành công và bảng điều khiển Quản lý cập nhật ngay lập tức.<br/>- **AC-CAM1-02 (Expired QR):** Given mã QR đã tạo trước đó 6 phút, When nhân viên quét mã, Then hệ thống trả về HTTP 400 "QR Token has expired".<br/>- **AC-CAM1-03 (Out of Geofence):** Given nhân viên đứng cách cửa hàng 500m quét mã QR, When gửi dữ liệu, Then hệ thống trả về HTTP 400 "You are out of the allowed geofence area". | - **AC-CAM2-01 (Happy Path):** Given nhân viên đứng cách cửa hàng 20m, When chụp ảnh selfie và bấm gửi, Then nhận thông báo "Check In thành công", ảnh được lưu vào CSDL và tag trạm 3D chuyển sang xanh ngọc.<br/>- **AC-CAM2-02 (Missing Photo):** Given thiết bị gửi request không kèm file ảnh, When gọi API, Then Backend trả về HTTP 400 "A live selfie is required to record attendance".<br/>- **AC-CAM2-03 (Double Check-out):** Given nhân viên đã check-out ca làm việc trước đó, When chụp ảnh check-out lần 2, Then Backend trả về HTTP 400 "You have already checked out for this shift". |
| **12** | **Phụ thuộc Phân hệ (Module Dependencies)** | - Phụ thuộc M1 (lấy danh sách ca phân công hợp lệ).<br/>- Phụ thuộc M2 (lấy thông tin trạm làm việc và bắn sự kiện hiển thị tag trạm 3D). | - Phụ thuộc M1 (kiểm tra trạng thái ca làm việc và phân công).<br/>- Phụ thuộc M2 (cập nhật trạng thái hiện diện thực tế `Actual Presence` lên mô hình Digital Twin). |

---

## 5. MA TRẬN TRUY VẾT KIỂM THỬ YÊU CẦU P0 (P0 REQUIREMENTS-TO-TEST TRACEABILITY)

Bảng dưới đây ánh xạ 100% các yêu cầu **P0** vào kịch bản kiểm thử tự động hoặc phương pháp xác minh thực tế tương ứng:

| Mã yêu cầu | Phân hệ | Tên yêu cầu P0 | Kịch bản kiểm thử xác minh (Verification Test Scenario / Method) | Tệp kiểm thử đối chứng / Công cụ thực thi | Kết quả kiểm chứng (Test Result) |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **REQ-M1-01** | M1 | AutoSchedule Heuristic Dynamic MRV | Chạy kiểm thử tự động thuật toán Dynamic MRV trên bộ dữ liệu 50 nhân viên / 80 ca, kiểm tra độ phủ và thời gian chạy $< 300\text{ms}$. | `AutoScheduleAssignmentCorrectnessTest.java:18-25` | **PASS (25/25)** `[VERIFIED]` |
| **REQ-M1-02** | M1 | Kiểm soát 5 Hard Constraints (HC1-HC5) | Chạy 8 kịch bản biên: thiếu kỹ năng, chứng chỉ hết hạn, trùng ngày bận, trùng đơn nghỉ phép, trùng ca, ca đêm, quá giờ tuần, vi phạm giờ nghỉ giữa ca. | `AutoScheduleAssignmentCorrectnessTest.java:testEdgeCases` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M1-03** | M1 | Soft Fairness Cap & Tie-Breaking | Kiểm tra ứng viên có số giờ tháng $> 1.3 \times \bar{H}_{month}$ bị loại khi có nhiều ứng viên; kiểm tra nhân viên Part-time được phân bổ công bằng dựa trên tỷ lệ hợp đồng. | `AutoScheduleAssignmentCorrectnessTest.java` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M1-04** | M1 | Bảo tồn phân công MANUAL & Idempotent | Xếp ca thủ công 1 vị trí, chạy lại auto-schedule 3 lần liên tiếp; kiểm tra bản ghi `MANUAL` không bị xóa hoặc ghi đè. | `ShiftScheduleExceptionAuditTest.java`, `AutoScheduleServiceTest` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M1-05** | M1 | Phát hành ca làm việc (Publish Shifts) | Gọi API publish ca `DRAFT`, kiểm tra ca chuyển sang `PUBLISHED` và sự kiện WebSocket / FCM được gửi đi. | `ShiftServiceTest.java`, Postman API Runner | **PASS (100%)** `[VERIFIED]` |
| **REQ-M2-01** | M2 | Mặt bằng 3D & Phân vùng Store Zones | Kiểm tra Three.js canvas render đúng kích thước sàn, nạp đúng danh sách zones từ API và không phát sinh memory leak khi unmount. | `FurnitureBuilder.test.js`, WebGL Playwright Test | **PASS (100%)** `[VERIFIED]` |
| **REQ-M2-02** | M2 | Workstation Layout Editor 3D | Kiểm tra Raycasting kéo thả trạm làm việc trên mặt phẳng sàn, khóa biên `[0.8m, Dim-0.8m]`, phát hiện va chạm $< 1.1\text{m}$ và hoàn tác `revertPosition()`. | `WorkstationDragController.test.js` (7/7 pass) | **PASS (7/7)** `[VERIFIED]` |
| **REQ-M2-03** | M2 | Workstation Occupancy Resolution | Kiểm tra phân giải 3 trạng thái `ASSIGNED`, `UNASSIGNED`, `UNKNOWN`; phân định có mặt thực tế qua bản ghi `Attendance` (`checkIn && !checkOut`). | `workstationOccupancy.test.js` (6/6 pass) | **PASS (6/6)** `[VERIFIED]` |
| **REQ-M2-04** | M2 | Store Selection Isolation Guard | Kéo trạm tại Cửa hàng A, chuyển sang Cửa hàng B; kiểm tra toàn bộ selection và draft coordinates bị reset sạch sẽ, không lưu nhầm sang Cửa hàng B. | `DigitalTwinRegression.test.js:Scenario D` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M2-05** | M2 | Lưu mô phỏng Atomic SWAP an toàn | Kiểm tra endpoint `POST .../assignments/swap` sử dụng khóa `PESSIMISTIC_WRITE` theo thứ tự canonical staff UUID, chặn đứng race condition khi đổi ca đồng thời. | `DigitalTwinConcurrencyIntegrationTest.java` (21/21 pass) | **PASS (21/21)** `[VERIFIED]` |
| **REQ-M3-01** | M3 | Điểm danh Camera Mode 1: Quét QR | Kiểm tra quét mã QR hợp lệ trong Geofence $\rightarrow$ 201 Created; kiểm tra mã hết hạn sau 5 phút $\rightarrow$ 400 Bad Request; kiểm tra ngoài Geofence $\rightarrow$ 400 Bad Request. | `ShiftScheduleExceptionAuditTest.java:436-475` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M3-02** | M3 | Điểm danh Camera Mode 2: Live Selfie | Gửi multipart request kèm ảnh selfie và tọa độ $\rightarrow$ 201 Created kèm lưu ảnh `BYTEA`; gửi request không có ảnh $\rightarrow$ 400 Bad Request; ca bị hủy $\rightarrow$ 400 Bad Request. | `AttendanceControllerTest.java`, Postman Multipart | **PASS (100%)** `[VERIFIED]` |
| **REQ-M3-03** | M3 | Xác thực GPS Geofence Haversine | Kiểm tra tính khoảng cách mặt cầu Haversine; tọa độ $d \le 100\text{m} \rightarrow$ Hợp lệ; tọa độ $d > 100\text{m} \rightarrow$ ném `BusinessException` kèm khoảng cách chi tiết. | `AttendanceServiceTest.java:testGeofence` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M3-04** | M3 | Khung giờ điểm danh & Gắn nhãn LATE | Kiểm tra check-in trước giờ cho phép $\rightarrow$ 400 Too Early; check-in sau giờ ân hạn $\rightarrow$ gán `status = LATE` và tính đúng số phút trễ `lateMinutes`. | `AttendanceServiceTest.java:testCheckInWindow` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M4-01** | M4 | Marketplace Claim với Redisson Lock | 10 threads đồng thời tranh nhận 1 slot ca mở trên Marketplace; kiểm tra đúng 1 thread nhận được ca, 9 threads còn lại nhận HTTP 409 Conflict hoặc 429. | `MarketplaceServiceConcurrencyTest.java` | **PASS (100%)** `[VERIFIED]` |
| **REQ-M4-02** | M4 | Đổi ca ngang hàng 2 pha (Shift Swap) | Nhân viên A tạo swap request $\rightarrow$ Nhân viên B chấp thuận $\rightarrow$ Quản lý duyệt $\rightarrow$ hoán đổi ca và kiểm tra không vi phạm trần 48h/tuần. | `ShiftSwapServiceTest.java` | **PASS (100%)** `[VERIFIED]` |

---

## 6. KẾ HOẠCH TRIỂN KHAI & XÁC MINH 4 TUẦN (FOUR-WEEK DELIVERY & VERIFICATION PLAN)

```mermaid
gantt
    title Kế hoạch Triển khai & Nghiệm thu MVP ShiftSync 4 Tuần
    dateFormat  YYYY-MM-DD
    section Tuần 1: Lập lịch Thông minh (M1)
    Lập kế hoạch ca & Quota           :done, w1_1, 2026-10-15, 3d
    Cài đặt 5 Hard Constraints (HC1-5) :done, w1_2, after w1_1, 2d
    Động cơ AutoSchedule Dynamic MRV  :done, w1_3, after w1_2, 2d
    Milestone 1: Demo Xếp ca tự động :milestone, m1, after w1_3, 0d
    section Tuần 2: Bản sao số 3D (M2)
    Mặt bằng 3D & Trạm làm việc       :done, w2_1, 2026-10-22, 3d
    Bố trí Trạm (Layout Editor) 3D    :done, w2_2, after w2_1, 2d
    Trực quan hóa Occupancy & What-If  :done, w2_3, after w2_2, 2d
    Milestone 2: Demo Digital Twin 3D :milestone, m2, after w2_3, 0d
    section Tuần 3: Điểm danh Camera (M3)
    Hạ tầng Geofence Haversine & GPS  :active, w3_1, 2026-10-29, 2d
    Camera Mode 1: Dynamic QR Scanner :active, w3_2, after w3_1, 2d
    Camera Mode 2: Live Selfie Capture:active, w3_3, after w3_2, 3d
    Milestone 3: Demo Điểm danh 2 Camera :milestone, m3, after w3_3, 0d
    section Tuần 4: Thị trường & Freeze (M4)
    Marketplace Claim Redisson Lock   :w4_1, 2026-11-05, 2d
    Quy trình Đổi ca Peer Swap 2 Pha  :w4_2, after w4_1, 2d
    Kiểm thử Tích hợp End-to-End      :w4_3, after w4_2, 2d
    Đóng băng Phát hành (Release Freeze):milestone, m4, after w4_3, 0d
```

### Chi tiết Lộ trình theo Từng Tuần:

#### Tuần 1 — Nền tảng Điều phối & Lập lịch Ca Thông minh (Module M1)
- **Yêu cầu triển khai:** `REQ-M1-01`, `REQ-M1-02`, `REQ-M1-03`, `REQ-M1-04`, `REQ-M1-05`.
- **Ràng buộc phụ thuộc:** Hoàn thiện cơ sở dữ liệu `shifts`, `shift_assignment`, `shift_skill_requirements`.
- **Chỉ tiêu kiểm thử (Test Gate):** 25/25 bài kiểm thử tính đúng đắn `AutoScheduleAssignmentCorrectnessTest` đạt 100% PASS; toàn bộ 99 bài test lập lịch đạt PASS.
- **Sản phẩm demo cuối tuần 1:** Quản lý bấm "Tự động xếp ca" trên Web, hệ thống tự động gán toàn bộ nhân viên vào các ca trong tuần thỏa mãn 5 Hard Constraints, hiển thị tỷ lệ phủ (`coverageRate`) và báo cáo thiếu hụt minh bạch.
- **Rủi ro & Kế hoạch ứng phó:** Dữ liệu nhân viên thiếu kỹ năng dẫn đến tỷ lệ phủ thấp $\rightarrow$ Kích hoạt tính năng chẩn đoán thiếu hụt (`ShortageDetailDTO`) để gợi ý tuyển thêm hoặc mở ca ra Marketplace.

#### Tuần 2 — Bản sao số Không gian 3D & Quản trị Trạm làm việc (Module M2)
- **Yêu cầu triển khai:** `REQ-M2-01`, `REQ-M2-02`, `REQ-M2-03`, `REQ-M2-04`, `REQ-M2-05`.
- **Ràng buộc phụ thuộc:** Phụ thuộc vào dữ liệu ca và phân công từ Tuần 1; API trạm làm việc `/api/stores/{storeId}/workstations`.
- **Chỉ tiêu kiểm thử (Test Gate):** 45/45 bài kiểm thử frontend Web đạt PASS; không có cảnh báo rò rỉ bộ nhớ WebGL; kiểm thử kéo thả trạm làm việc không xuyên tường.
- **Sản phẩm demo cuối tuần 2:** Quản lý xem toàn cảnh 3D cửa hàng, kéo thả thay đổi vị trí máy pha cà phê/quầy thu ngân trên sàn 3D, nhìn thấy màu sắc tag trạng thái nhân sự trực trạm và thử nghiệm điều chuyển nhân sự What-If.
- **Rủi ro & Kế hoạch ứng phó:** GPU tích hợp yếu gây giật lag $\rightarrow$ Cung cấp nút chuyển đổi sang chế độ 2D Schematic (`TwoDSpatialSchematic.jsx`) nhẹ nhàng.

#### Tuần 3 — Điểm danh Thực chứng Hiện trường & 2 Chế độ Camera (Module M3)
- **Yêu cầu triển khai:** `REQ-M3-01`, `REQ-M3-02`, `REQ-M3-03`, `REQ-M3-04`, `REQ-M3-05`.
- **Ràng buộc phụ thuộc:** Tích hợp camera phần cứng trên Expo (`expo-camera`, `expo-location`); API `/api/attendance/**`.
- **Chỉ tiêu kiểm thử (Test Gate):** Diễn tập thành công cả 2 kịch bản quét QR và chụp ảnh selfie trên thiết bị thật; xác thực chặn thành công khi đứng ngoài Geofence $> 100\text{m}$.
- **Sản phẩm demo cuối tuần 3:** Nhân viên mở app điện thoại, quét mã QR tại quầy để check-in hoặc chụp ảnh selfie tại chỗ; ngay lập tức bảng điều khiển Web của Quản lý nhận tín hiệu realtime đổi màu xanh báo nhân sự đã có mặt.
- **Rủi ro & Kế hoạch ứng phó:** Thiết bị định vị GPS bị trôi trong nhà kín $\rightarrow$ Cung cấp cơ chế gửi đơn giải trình (`AttendanceAdjustment`) kèm ảnh chụp thực tế để Quản lý duyệt bù công.

#### Tuần 4 — Thị trường Nhận ca Mở, Đổi ca & Đóng băng Hệ thống (Module M4 & Integration)
- **Yêu cầu triển khai:** `REQ-M4-01`, `REQ-M4-02`, `REQ-M4-03`, kiểm thử tải và tích hợp toàn hệ thống.
- **Ràng buộc phụ thuộc:** Redis 7 và Redisson Distributed Lock hoạt động ổn định; hoàn thiện toàn bộ liên kết giữa 4 module.
- **Chỉ tiêu kiểm thử (Test Gate):** 488/488 tests backend PASS; 45/45 tests frontend PASS; diễn tập kịch bản 10 nhân viên cùng tranh nhận 1 ca trên Marketplace không gây tranh chấp.
- **Sản phẩm demo cuối tuần 4:** Diễn tập trọn vẹn luồng End-to-End: Lập lịch ca (M1) $\rightarrow$ Xem trên 3D (M2) $\rightarrow$ Chấm công 2 camera (M3) $\rightarrow$ Đổi ca và nhận ca mở (M4). Đóng băng mã nguồn sẵn sàng bảo vệ đồ án tốt nghiệp.
- **Rủi ro & Kế hoạch ứng phó:** Lỗi mạng chập chờn khi nhận ca $\rightarrow$ Redisson timeout cấu hình 5 giây tự động nhả khóa và thông báo người dùng thử lại.

---

## 7. DANH MỤC CÂU HỎI MỞ & NHẬT KÝ QUYẾT ĐỊNH (OPEN QUESTIONS & DECISION LOG)

### 7.1. Nhật ký Câu hỏi Mở & Quyết định Kỹ thuật (Open Questions & Technical Decisions)

| Mã câu hỏi (Q ID) | Nội dung câu hỏi cần giải quyết (Question & Context) | Tại sao quyết định này quan trọng? (Business / Technical Impact) | Hệ quả nếu chưa chốt (Impact if Unresolved) | Đề xuất khuyến nghị chuyên môn (Recommended Option) | Người chịu trách nhiệm (Owner) | Trạng thái (Status) |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Q-REQ-01** | **Thời gian làm mới mã QR động (Dynamic QR Refresh Rate):** Mã QR điểm danh nên xoay vòng tự động mỗi bao nhiêu giây trên màn hình Kiosk của Quản lý? | Nếu thời gian quá dài, nhân viên có thể chụp màn hình gửi ra ngoài; nếu quá ngắn, nhân viên mạng yếu sẽ bị hết hạn token trước khi server nhận. | Token hết hạn liên tục gây trải nghiệm khó chịu cho nhân viên khi chấm công giờ cao điểm. | **Khuyến nghị:** Duy trì TTL token ở mức **5 phút (300 giây)** trên Backend (`[VERIFIED]`, `AttendanceService.java:42`), đồng thời giao diện Kiosk Web tự động refresh ảnh QR mỗi **60 giây** để chống chụp ảnh gửi ra ngoài. | Product Owner / Tech Lead | `PROPOSED` `[PROPOSED]` |
| **Q-REQ-02** | **Dung sai bán kính Geofence GPS cho các cửa hàng trong trung tâm thương mại (Mall/Indoor GPS Drift):** Cần điều chỉnh bán kính Geofence thế nào cho các chi nhánh nằm trong tầng hầm TTTM? | Tín hiệu GPS trong nhà cao tầng/tầng hầm thường có sai số trôi dạt từ 30m - 80m so với tọa độ thực tế. | Tỷ lệ nhân viên bị từ chối chấm công oan tăng cao, làm phát sinh quá nhiều đơn giải trình khiếu nại công. | **Khuyến nghị:** Cho phép Quản lý chi nhánh cấu hình linh hoạt trường `geofenceRadiusM` trong `StoreConfiguration` từ mức mặc định **100m** lên tối đa **250m** đối với các cửa hàng trong TTTM. | Business Analyst / Store Ops | `APPROVED_FOR_MVP` `[VERIFIED]` |
| **Q-REQ-03** | **Chính sách lưu trữ ảnh selfie chấm công (Image Retention & Storage Optimization):** Ảnh chụp selfie chấm công lưu trực tiếp trong PostgreSQL dạng `BYTEA` hay chuyển sang S3/Cloud Storage sau 30 ngày? | Cột `BYTEA` trong CSDL PostgreSQL nếu lưu trữ hàng vạn ảnh mỗi tháng sẽ làm phình to dung lượng sao lưu và làm chậm truy vấn. | Dung lượng CSDL tăng đột biến, ảnh hưởng hiệu năng backup/restore trên môi trường production. | **Khuyến nghị:** Trong phạm vi MVP 4 tuần, lưu trực tiếp `BYTEA` vào PostgreSQL (đã nén kích thước $< 200\text{KB}$, giới hạn multipart 10MB). Đưa vào backlog chuyển đổi sang AWS S3 / MinIO trong giai đoạn Phase 4. | DevOps / DBA | `APPROVED_FOR_MVP` `[VERIFIED]` |
| **Q-REQ-04** | **Bổ sung Thuật toán AI Liveness Detection cho Camera Mode 2:** Có cần tích hợp kiểm tra chớp mắt / quay mặt (Liveness Check) để chống dùng ảnh in sẵn đặt trước camera không? | Ngăn ngừa triệt để hành vi dùng ảnh chụp in sẵn hoặc điện thoại khác hiển thị ảnh để qua mặt camera selfie. | Tăng thời gian phát triển thêm 2-3 tuần, vượt quá khung thời gian MVP 4 tuần; rủi ro thư viện nhận diện AI không tương thích thiết bị giá rẻ. | **Khuyến nghị: LOẠI TRỪ KHỎI MVP 4 TUẦN.** Chỉ lưu ảnh chân dung thực tế và kết hợp bắt buộc tọa độ GPS Haversine. Việc đối soát khuôn mặt do Quản lý cửa hàng thẩm tra khi phát sinh nghi vấn. | Tech Lead / Security Auditor | `APPROVED_FOR_MVP` (Explicit Exclusion) |
| **Q-REQ-05** | **Xử lý Chấm công khi Mất kết nối Mạng (Offline Attendance Mode):** Nhân viên có được phép lưu bản ghi chấm công cục bộ trên điện thoại và đồng bộ sau khi có mạng không? | Giải quyết tình huống nhân viên đến cửa hàng đúng giờ nhưng mạng WiFi/4G cửa hàng bị đứt cáp quang đột xuất. | Lưu offline mở ra lỗ hổng gian lận chỉnh sửa giờ hệ thống trên điện thoại (System Time Spoofing) để giả mạo đi đúng giờ. | **Khuyến nghị: LOẠI TRỪ KHỎI MVP 4 TUẦN.** Bắt buộc kết nối Online để xác thực giờ máy chủ chuẩn xác. Nếu mất mạng, nhân viên sử dụng luồng Gửi đơn giải trình (`AttendanceAdjustment`) có Quản lý xác nhận trực tiếp. | Product Owner / Tech Lead | `APPROVED_FOR_MVP` (Explicit Exclusion) |

### 7.2. Danh mục Yêu cầu Chưa thể Nghiệm thu do Phụ thuộc hoặc Tiêu chí chưa chốt (Blocked / Pending Final Acceptance)

Bảng dưới đây liệt kê các yêu cầu chức năng hoặc tính năng hiện tại chưa thể tiến hành nghiệm thu cuối cùng (Final Acceptance) do còn phụ thuộc vào quyết định chính sách kinh doanh hoặc thiết kế chi tiết:

| Mã yêu cầu | Phân hệ | Mức ưu tiên | Lý do chưa thể nghiệm thu (Blocking Reasons) | Điều kiện cần để mở khóa nghiệm thu (Unblocking Conditions) | Hành động ứng phó trong MVP 4 tuần |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **REQ-M1-06** | M1 | P1 | Thiếu bảng định mức ca chuẩn hóa (`StoreQuotaConfig`) từ phía vận hành bán lẻ cho từng loại hình cửa hàng. | Cần Product Owner và Store Ops ban hành bảng định mức nhân sự mẫu theo giờ cao điểm/thấp điểm. | Giữ ở trạng thái `P1 - APPROVED_FOR_MVP`. Nếu chưa có cấu hình Quota, hệ thống cho phép xếp ca dựa trên ca tạo thủ công. |
| **REQ-M3-05** | M3 | P1 | Quy chế thời hạn chốt sổ công (Lock Date Policy) và quy trình phúc khảo công của Quản lý trên Mobile chưa có văn bản chính thức. | Cần ban hành chính sách nhân sự: thời hạn gửi giải trình tối đa bao nhiêu ngày sau ca làm việc. | Tạm thời áp dụng quy tắc mặc định: giải trình trong vòng 48h kể từ khi ca kết thúc và trước ngày 01 hàng tháng. |
| **REQ-M4-03** | M4 | P1 | Quy chế phân bổ chi phí lương liên chi nhánh và chính sách phê duyệt 2 chiều giữa 2 Quản lý cửa hàng chưa được Hội đồng phê duyệt. | Cần quy chế hạch toán chi phí nhân sự giữa các chi nhánh của chuỗi cửa hàng. | Hoàn thiện API và flow kỹ thuật; chỉ kích hoạt phân hệ này cho các cửa hàng cùng chủ sở hữu trong giai đoạn MVP. |
| **Camera Mode 1 (Kiosk QR Refresh)** | M3 | P0 (Thành phần) | Chu kỳ tự động làm mới mã QR trên màn hình Kiosk Web chưa chốt giữa 30s, 60s hay giữ nguyên theo TTL token 5 phút (tham chiếu `Q-REQ-01`). | Chờ Tech Lead và Product Owner ký duyệt đề xuất làm mới mỗi 60 giây trên UI Kiosk. | Áp dụng khuyến nghị: Backend dùng TTL 5 phút bảo đảm an toàn mạng, Frontend Kiosk chủ động refresh mỗi 60 giây. |

---

## 8. HỒ SƠ TỔNG KẾT & BÀN GIAO KỸ THUẬT (SPECIFICATION HANDOFF)

1. **Tính Bền vững & Truy vết:** Tài liệu này đóng vai trò là Bản đặc tả yêu cầu chính thức (Requirements Baseline) của hệ thống ShiftSync, kế thừa toàn bộ các phát hiện đã được chứng minh qua mã nguồn tại `SYSTEM_MAP.md`, `CODEBASE_MAP.md` và các báo cáo `AUD-001.*`, `AUD-002`, `WEB-001`, `PHASE-2A/B/C`, `PHASE-3`.
2. **Cam kết Bảo toàn Mã nguồn:** Không có bất kỳ thay đổi nào tác động lên mã nguồn sản phẩm (`src/main/**`, `ShiftSync-Web/**`, `ShiftSync-Mobile/**`) hoặc lịch sử Git trong quá trình lập tài liệu này.
3. **Chuyển giao cho Đội ngũ Triển khai:**
   - Bộ phận Backend: Tham chiếu Mục 3 (M1, M3, M4) và Mục 5 để tiếp tục bảo trì các endpoint API và duy trì độ phủ kiểm thử.
   - Bộ phận Mobile: Tham chiếu Mục 4 (Ma trận chuyên sâu 2 Chế độ Camera) để hoàn thiện trải nghiệm UX/UI của màn hình `AttendanceScreenLive.js`.
   - Bộ phận Web & 3D: Duy trì các ràng buộc đã đóng băng tại Module M2.
