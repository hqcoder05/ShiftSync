# SHIFTSYNC — MANUAL QA DATA MAP

> **Bản đồ dữ liệu hạt giống (Master Seed Data Map)**  
> Bản đồ chi tiết ánh xạ từng bản ghi đặc biệt tới mục đích kiểm thử thủ công trên hệ thống ShiftSync.

---

## 1. BẢN ĐỒ NHÂN SỰ ĐẶC BIỆT (SPECIAL STAFF TEST FIXTURES)

| Mã Nhân Sự | UUID Bản Ghi | Email Đăng Nhập | Mục Đích & Vai Trò Nghiệp Vụ | Kịch Bản QA Tương Ứng |
| :--- | :--- | :--- | :--- | :--- |
| **EMP01** | `10000000-0000-0000-0000-000000000001` | `emp01@shiftsync.com` | **Active In-Progress Shift:** Có ca đang làm việc buổi chiều Thứ Năm 17/09/2026 (đã check-in lúc 14:28, check-out là NULL). Khởi tạo đơn đổi ca với EMP02. Có phiếu lương Tháng 8 có thể tải PDF thật. | `QA-ATT-001`<br>`QA-SWAP-001`<br>`QA-PAY-002` |
| **EMP02** | `10000000-0000-0000-0000-000000000002` | `emp02@shiftsync.com` | **Swap Peer:** Nhân viên cùng có kỹ năng Barista; nhận yêu cầu đổi ca từ EMP01 và bấm chấp thuận trên UI. | `QA-SWAP-001` |
| **EMP03** | `10000000-0000-0000-0000-000000000003` | `emp03@shiftsync.com` | **Availability T2-T4-T6:** Chỉ rảnh vào các ngày Thứ Hai, Thứ Tư, Thứ Sáu. Dùng để kiểm thử thuật toán AutoScheduler tuyệt đối không xếp vào T3, T5, T7, CN. | `QA-SCHED-002` |
| **EMP04** | `10000000-0000-0000-0000-000000000004` | `emp04@shiftsync.com` | **Active Temporary Skill:** Kỹ năng Barista có thời hạn đến `2027-12-31`. Đảm bảo hệ thống phân biệt được kỹ năng còn hạn so với kỹ năng hết hạn. | `QA-STAFF-002` |
| **EMP05** | `10000000-0000-0000-0000-000000000005` | `emp05@shiftsync.com` | **Morning Only & Skill Expiring Soon:** Chỉ rảnh ca sáng (06:00 - 12:00); Kỹ năng Barista sắp hết hạn ngày `20/09/2026`. Dùng để kiểm thử nhận ca mở trên Chợ ca (Marketplace Claimer). | `QA-SCHED-002`<br>`QA-OPEN-001` |
| **EMP06** | `10000000-0000-0000-0000-000000000006` | `emp06@shiftsync.com` | **EXPIRED SKILL:** Kỹ năng Barista **đã hết hạn ngày `10/09/2026`** (trước Anchor date 17/09). Dùng để kiểm thử AutoScheduler và xếp ca thủ công từ chối xếp vị trí Barista. | `QA-STAFF-002`<br>`QA-SCHED-003` |
| **EMP08** | `10000000-0000-0000-0000-000000000008` | `emp08@shiftsync.com` | **APPROVED LEAVE CONFLICT:** Đã có đơn nghỉ phép được duyệt ngày `18/09/2026` đến `19/09/2026`. Dùng để kiểm tra AutoScheduler tự động bỏ qua, không xếp ca vào 2 ngày nghỉ này. | `QA-SCHED-004`<br>`QA-LEAVE-003` |
| **EMP09** | `10000000-0000-0000-0000-000000000009` | `emp09@shiftsync.com` | **Evening Only:** Chỉ rảnh buổi tối (18:00 - 23:00). Dùng để kiểm tra gán ca tối tự động. | `QA-SCHED-002` |
| **EMP16** | `10000000-0000-0000-0000-000000000016` | `emp16@shiftsync.com` | **Weekend Only:** Chỉ rảnh Thứ Bảy và Chủ Nhật (07:00 - 23:00). | `QA-SCHED-002` |
| **EMP21** | `10000000-0000-0000-0000-000000000021` | `emp21@shiftsync.com` | **INACTIVE (Former Employee):** Nhân viên cũ, ngày nghỉ việc `left_date = 2026-07-31`. Dùng để kiểm thử bộ lọc nhân viên đã nghỉ và không được xuất hiện trong danh sách xếp ca. | `QA-STAFF-001` |
| **EMP22** | `10000000-0000-0000-0000-000000000022` | `emp22@shiftsync.com` | **SUSPENDED:** Nhân viên bị tạm đình chỉ công tác từ ngày `2026-09-01`. Dùng để kiểm tra lọc nhân sự bị đình chỉ. | `QA-STAFF-001` |
| **EMP99** | `10000000-0000-0000-0000-000000000099` | `emp99@shiftsync.com` | **INTERN (Max Weekly Hours: 20h):** Hợp đồng thực tập sinh; dùng để kiểm thử thuật toán AutoScheduler khống chế không xếp vượt quá 20 giờ/tuần. | `QA-STAFF-003` |
| **S2_01 (Chris)** | `70000000-0000-0000-0000-000000000001` | `staff.store2.chris@shiftsync.com` | **Workforce Proposal Nominee:** Nhân sự Barista của Store 2 được Quản lý Store 2 đề cử sang Store 1 làm việc. Đăng nhập để xem và bấm đồng ý tham gia ca mượn. | `QA-WF-002` |
| **S2_04 (Frank)** | `70000000-0000-0000-0000-000000000004` | `staff.store2.frank@shiftsync.com` | **Store Transfer Record:** Có 2 bản ghi hợp đồng trong lịch sử: INACTIVE tại Store 1 (đến 31/05/2026) và ACTIVE tại Store 2 (từ 01/06/2026). Dùng để kiểm thử lịch sử thuyên chuyển. | `QA-STAFF-001` |
| **S2_05 (Grace)** | `70000000-0000-0000-0000-000000000005` | `staff.store2.grace@shiftsync.com` | **0-Availability:** Nhân viên mới tuyển, chưa hề đăng ký khung giờ rảnh nào. Dùng để kiểm tra cách UI/Scheduler xử lý trường hợp không có lịch rảnh. | `QA-EMPTY-001` |

---

## 2. BẢN ĐỒ VÙNG KHÔNG GIAN 3D (3D STORE ZONES MAP)

### Store 1 — Flagship Store (`11111111-1111-1111-1111-111111111111`)
| Tên Vùng Không Gian | UUID Bản Ghi | Tọa Độ `(x, y, z)` | Kích Thước `(w, d, h)` | Kỹ Năng / Ca Gắn Kèm |
| :--- | :--- | :--- | :--- | :--- |
| **Quầy Bar (Barista Counter)** | `d1000000-0000-0000-0000-000000000001` | `(2.5, 3.0, 0.0)` | `(5.0, 2.0, 2.8)` | Gắn với kỹ năng **Barista** của tất cả các ca Sáng, Chiều, Tối. |
| **Quầy Thu Ngân (Cashier Counter)**| `d1000000-0000-0000-0000-000000000002` | `(6.0, 3.0, 0.0)` | `(3.0, 2.0, 2.8)` | Gắn với kỹ năng **Cashier** của các ca Sáng, Chiều, Tối. |
| **Sảnh Tầng Trệt (Dining Hall)** | `d1000000-0000-0000-0000-000000000003` | `(10.0, 6.0, 0.0)` | `(10.0, 8.0, 3.5)` | Gắn với kỹ năng **Waiter** ca Giữa ca và ca Tối. |
| **Gác Lửng (Mezzanine Lounge)** | `d1000000-0000-0000-0000-000000000004` | `(10.0, 6.0, 3.5)` | `(8.0, 6.0, 2.8)` | **Chiều cao z = 3.5m**; phân bổ nhân viên phục vụ ca tối. |
| **Sân Thượng (Outdoor Patio)** | `d1000000-0000-0000-0000-000000000005` | `(14.0, 8.0, 7.0)` | `(6.0, 6.0, 3.0)` | **Chiều cao z = 7.0m**; phục vụ khu vực ngoài trời. |

---

## 3. BẢN ĐỒ CA LÀM VIỆC & ĐIỂM DANH (SHIFTS & ATTENDANCE MAP)

| Mục Đích Kiểm Thử | UUID Ca / Điểm Danh | Thời Gian / Ngày | Mô Tả Dữ Liệu |
| :--- | :--- | :--- | :--- |
| **Ca Đang Làm Việc (Live Active)** | Shift: `f1000000-0000-0000-0000-000000000029`<br>Att: `e3000000-0000-0000-0000-000000000025` | `2026-09-17`<br>14:30 - 22:30 | Đã check-in lúc 14:28 bởi EMP01, **giờ ra `check_out_time` là NULL**. Dùng để test màn hình giám sát thời gian thực. |
| **Ca Bị Đi Muộn (Late Attendance)** | Shift: `f1000000-0000-0000-0000-000000000015`<br>Att: `e3000000-0000-0000-0000-000000000001` | `2026-09-14`<br>07:00 - 15:00 | Check-in lúc `07:12:00` (muộn 12 phút), trạng thái `LATE`. Có đơn khiếu nại điểm danh gắn kèm. |
| **Ca Về Sớm (Early Leave)** | Shift: `f1000000-0000-0000-0000-000000000010`<br>Att: `e3000000-0000-0000-0000-000000000024` | `2026-09-11`<br>14:30 - 22:30 | Check-out lúc `22:10:00` (về sớm 20 phút), trạng thái `EARLY_LEAVE`. |
| **Ca Bị Hủy (Cancelled Shift)** | Shift: `f1000000-0000-0000-0000-000000000014` | `2026-09-13`<br>14:30 - 22:30 | Trạng thái `CANCELLED`. Kiểm tra hiển thị ca hủy trên bảng lịch sử. |
| **Chợ Ca Mở (Open Shift Marketplace)**| Shift: `f1000000-0000-0000-0000-000000000031` | `2026-09-18`<br>10:00 - 18:00 | Ca Thứ Sáu, cờ `is_open = true`. Dùng để nhân viên EMP05 đăng nhập vào Chợ ca và bấm nhận ca. |
| **Thiếu Hụt Nhân Sự (SCHED-06)** | Shifts: `f1000000-0000-0000-0000-000000000085..87` | `2026-09-21..23`<br>08:00 - 16:00 | Cần 6 nhân sự nhưng Store 2 chỉ có 4 người. Chạy AutoScheduler để kiểm tra xếp tối đa 4 và để hở 2 slot. |

---

## 4. BẢN ĐỒ TÀI CHÍNH & KỲ LƯƠNG (PAYROLL PERIODS MAP)

| Kỳ Lương | UUID Kỳ Lương | Phạm Vi Thời Gian | Trạng Thái | Dữ Liệu Gắn Kèm & Mục Đích QA |
| :--- | :--- | :--- | :---: | :--- |
| **Store 1 — Tháng 08/2026** | `e1000000-0000-0000-0000-000000000001` | `2026-08-01` đến `2026-08-31` | **PAID** | **23 phiếu lương** chi tiết của toàn bộ nhân viên Store 1. Dùng để xem chi tiết lương, tải PDF phiếu lương của EMP01, xuất Excel toàn cửa hàng. |
| **Store 1 — Tháng 09/2026** | `e1000000-0000-0000-0000-000000000002` | `2026-09-01` đến `2026-09-30` | **DRAFT** | **0 phiếu lương (Empty State)**. Dùng để Quản lý kiểm thử tính năng tính lương tự động (`Generate Payroll`) cho kỳ hiện tại. |
| **Store 2 — Tháng 08/2026** | `e1000000-0000-0000-0000-000000000003` | `2026-08-01` đến `2026-08-31` | **PAID** | **4 phiếu lương** của nhân viên Store 2. Dùng để kiểm tra Store Isolation (Manager 1 không thấy được kỳ này). |
