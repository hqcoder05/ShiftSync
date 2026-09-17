# SHIFTSYNC — SEED COVERAGE REPORT

> **Báo cáo độ phủ dữ liệu hạt giống phục vụ Kiểm thử Thủ công (Manual QA Coverage Report)**  
> **Phiên bản:** 1.0.0 (Master Dataset)  
> **Anchor Date:** `2026-09-17` (Thứ Năm, Tuần 38)  
> **Trạng thái tổng thể:** **100% SẴN SÀNG CHO TEST TAY WEB & MOBILE**

---

## 1. BẢNG TỔNG KẾT ĐỘ PHỦ THEO THỰC THỂ (ENTITY COVERAGE MATRIX)

| Thực Thể (Entity) | Số Bản Ghi | Mục Đích Nghiệp Vụ (Purpose) | Kịch Bản Manual QA Hỗ Trợ | Bản Ghi Đặc Biệt (Special Records) | Trạng Thái |
| :--- | :---: | :--- | :--- | :--- | :---: |
| `store` | **2** | Định danh 2 chi nhánh độc lập | `QA-AUTH-001`, `QA-RBAC-002` | Store 1 (Flagship), Store 2 (Riverside) | **READY** |
| `store_configuration` | **2** | Cấu hình giới hạn giờ tuần, nghỉ giữa 2 ca, geofence | `QA-SCHED-005`, `QA-ATT-001` | `maxHourPerWeek = 48`, `minRestHours = 10`, `radius = 150m` | **READY** |
| `scheduler_configuration` | **2** | Trọng số thuật toán AutoScheduler | `QA-SCHED-001` | Tổng trọng số = `1.000` (Fairness: 0.2, Skill: 0.25, Rest: 0.15...) | **READY** |
| `contract_type` | **6** | Hợp đồng lao động & giới hạn giờ làm | `QA-STAFF-003`, `QA-SCHED-006` | Hợp đồng `Intern` (Max 20h/tuần), `Full-Time` (48h), `Part-Time` | **READY** |
| `skill` | **6** | Danh mục chức danh nghiệp vụ | `QA-STAFF-002`, `QA-SCHED-003` | Barista, Cashier, Waiter cho từng Store | **READY** |
| `staff` | **31** | Tài khoản đăng nhập hệ thống | `QA-AUTH-001..002`, `QA-STAFF-001` | 1 Admin, 2 Quản lý, 28 Nhân sự có tên tiếng Việt và email chuẩn | **READY** |
| `employment` | **31** | Quan hệ nhân sự - cửa hàng, trạng thái, mức lương | `QA-STAFF-001`, `QA-RBAC-002` | 27 ACTIVE, 2 INACTIVE (thuyên chuyển & nghỉ việc), 1 SUSPENDED | **READY** |
| `staff_skill` | **47** | Trình độ kỹ năng và hạn chứng chỉ | `QA-STAFF-002`, `QA-SCHED-003` | `emp06` hết hạn Barista (`10/09`), `emp05` sắp hết hạn (`20/09`) | **READY** |
| `availability` | **139** | Khung giờ rảnh cá nhân | `QA-SCHED-002` | `emp03` (T2-T4-T6), `emp05` (Sáng), `emp09` (Tối), `emp16` (Cuối tuần), `grace` (0 khung) | **READY** |
| `store_layouts` | **2** | Mặt bằng kiến trúc cửa hàng | `QA-3D-001` | Bản vẽ Store 1 và Store 2 | **READY** |
| `store_zones` | **7** | Vùng không gian 3 chiều `(x, y, z)` | `QA-3D-001`, `QA-3D-002` | Quầy Bar, Thu ngân, Sảnh, Gác lửng (`z=3.5m`), Sân thượng (`z=7.0m`) | **READY** |
| `workstations` | **6** | Vị trí làm việc gắn theo từng vùng | `QA-3D-001` | POS-01, ESPRESSO-01, FLOOR-TABLE-01... | **READY** |
| `shift_template` | **6** | Mẫu ca làm việc tiêu chuẩn | `QA-SHIFT-001` | Sáng (07:00), Giữa ca (10:00), Chiều (14:30), Tối (18:00) | **READY** |
| `blackout_date` | **4** | Ngày cao điểm cấm xin nghỉ | `QA-LEAVE-002` | Quốc khánh `02/09/2026`, Giỗ Tổ, Tết Dương lịch | **READY** |
| `leave_request` | **4** | Đơn xin nghỉ phép | `QA-LEAVE-001..003`, `QA-SCHED-004` | `emp08` đã duyệt nghỉ `18/09 - 19/09`, 1 đơn PENDING, 1 đơn REJECTED | **READY** |
| `shift` | **87** | Ca làm việc liên tuần (W37, W38, W39) | `QA-SHIFT-001`, `QA-SCHED-001` | 14 ca W37 (COMPLETED/CANCELLED), 42 ca W38 (PUBLISHED), 31 ca W39 (DRAFT) | **READY** |
| `shift_skill_requirement` | **191** | Yêu cầu số lượng nhân sự theo vị trí | `QA-SHIFT-001`, `QA-SCHED-005` | Phân bổ số lượng nhân sự và kỹ năng cho 87 ca | **READY** |
| `shift_assignment` | **96** | Phân công nhân sự vào ca & zone | `QA-3D-002`, `QA-ATT-001` | 100% có gắn `zone_id`, không trùng chéo thời gian của cùng 1 người | **READY** |
| `attendance` | **62** | Nhật ký chấm công geofence | `QA-ATT-001..003` | 2 ca đang làm (check_out NULL chiều 17/09), 1 ca LATE, 1 ca EARLY_LEAVE | **READY** |
| `attendance_adjustment_request`| **3** | Đơn khiếu nại điều chỉnh giờ công | `QA-ATT-003` | 1 PENDING cho ca đi muộn 14/09, 1 APPROVED, 1 REJECTED | **READY** |
| `shift_swap_request` | **3** | Yêu cầu đổi ca giữa nhân viên | `QA-SWAP-001` | 1 đơn PENDING (đã được chấp nhận bởi đối tác, chờ Quản lý duyệt) | **READY** |
| `open_shift_claim` | **2** | Nhận ca mở trên Chợ ca | `QA-OPEN-001` | 1 đơn PENDING cho ca Midday ngày 18/09 | **READY** |
| `workforce_request` | **4** | Đơn mượn nhân sự liên cửa hàng | `QA-WF-001` | PROPOSAL_SENT, PENDING, COMPLETED, REJECTED giữa Store 1 và Store 2 | **READY** |
| `workforce_proposal` | **2** | Đề cử ứng viên hỗ trợ chi nhánh | `QA-WF-002` | Đề cử nhân viên Chris (Store 2) sang hỗ trợ ca Barista Store 1 | **READY** |
| `payroll_period` | **3** | Kỳ bảng lương | `QA-PAY-001`, `QA-EMPTY-001` | Tháng 08/2026 (PAID 2 cửa hàng), Tháng 09/2026 (DRAFT rỗng) | **READY** |
| `payroll` | **27** | Phiếu lương chi tiết | `QA-PAY-002`, `QA-PAY-003` | 23 phiếu Store 1 (Tháng 8) + 4 phiếu Store 2 (Tháng 8) | **READY** |
| `notification` | **5** | Hộp thư thông báo trong ứng dụng | `QA-NOTIF-001` | Nhắc ca làm, công bố lịch ca, duyệt nghỉ phép, thông báo lương | **READY** |
| `notification_preference` | **232** | Tùy chọn bật/tắt nhận thông báo | `QA-NOTIF-001` | 8 danh mục thông báo bật chuẩn cho 31 nhân sự | **READY** |
| `holiday` | **4** | Ngày nghỉ lễ quốc gia & hệ số lương | `QA-PAY-001` | Quốc khánh `02/09/2026` (3.0x), 30/04 (3.0x), 01/05 (3.0x), 01/01 (2.0x) | **READY** |
| `audit_log` | **4** | Nhật ký thao tác quản trị | `QA-AUTH-001` | Ghi vết hành động công bố lịch ca, duyệt nghỉ phép, tạo bảng lương | **READY** |

---

## 2. ĐỘ PHỦ TÍNH NĂNG VÀ MÀN HÌNH MANUAL TEST

| Màn Hình / Tính Năng UI | Web Frontend | Mobile App | Trạng Thái Dữ Liệu Sau Seed |
| :--- | :---: | :---: | :--- |
| **Đăng nhập & Quên mật khẩu** | Có | Có | Sẵn sàng 31 tài khoản (Admin, 2 Manager, 28 Staff), mật khẩu `password123` |
| **Bảng điều khiển (Dashboard)** | Có | N/A | Có dữ liệu biểu đồ chi phí/giờ làm, chỉ số đi muộn, vắng mặt, tỷ lệ lấp đầy ca |
| **Danh bạ Nhân sự (Staff Directory)**| Có | N/A | 31 nhân sự, hỗ trợ tìm kiếm tên/email, lọc trạng thái Active/Inactive, phân trang |
| **Bản đồ Không gian 3D (3D Store Layout)**| Có | N/A | 2 bản vẽ, 7 vùng không gian với đầy đủ tọa độ `x, y, z` (gồm gác lửng `z=3.5m`) |
| **Bảng Lịch Ca Làm Việc (Shift Board)** | Có | Có | Điều hướng 3 tuần: W37 (quá khứ), W38 (hiện tại), W39 (tương lai bản nháp) |
| **Tự động xếp ca (AutoScheduler)** | Có | N/A | Chạy thành công trên W39, tự động phân bổ không gian 3D và tuân thủ mọi luật |
| **Điểm danh & Giám sát Geofence** | Có | Có | Có ca đang làm việc chiều 17/09 (giờ ra NULL), ca đi muộn, ca về sớm |
| **Khiếu nại điểm danh (Adjustments)**| Có | Có | Có đơn chờ duyệt để Manager test Approve/Reject trên UI |
| **Quản lý Nghỉ phép (Leave Requests)**| Có | Có | Có đơn đã duyệt, đơn từ chối, đơn chờ duyệt; có thể nộp đơn mới để test conflict |
| **Đổi ca (Shift Swap)** | Có | Có | Có quy trình đổi ca 3 bước chờ test duyệt trên giao diện |
| **Chợ ca mở (Marketplace)** | Có | Có | Có ca mở ngày Thứ Sáu 18/09 để nhân viên bấm nhận ca |
| **Chia sẻ nhân sự (Workforce)** | Có | N/A | Có đơn mượn người và đề cử nhân sự liên cửa hàng (Store 1 <-> Store 2) |
| **Bảng lương & Phiếu lương (Payroll)**| Có | Có | Tải file PDF thật cho Staff; Xuất file Excel thật cho Manager |
| **Thông báo & Tùy chọn (Notifications)**| Có | Có | Hiển thị badge số chưa đọc, đánh dấu đã đọc, bật/tắt 8 loại thông báo |
| **Cấu hình Cửa hàng & Thuật toán** | Có | N/A | Cấu hình giới hạn giờ làm, thời gian nghỉ, trọng số công bằng |
