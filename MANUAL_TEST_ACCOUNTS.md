# SHIFTSYNC — MANUAL TEST ACCOUNTS MATRIX

> **Mật khẩu mặc định cho TOÀN BỘ tài khoản:** `password123`  
> **Anchor Date môi trường:** `2026-09-17` (Thứ Năm)

---

## 1. TÀI KHOẢN HỆ THỐNG & QUẢN LÝ (ADMIN & MANAGERS)

| STT | Email Đăng Nhập | Vai Trò (System Role) | Phạm Vi Cửa Hàng | Mục Đích Kiểm Thử Thủ Công |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `admin@shiftsync.com` | **ADMIN** | **Toàn hệ thống (Store 1 & Store 2)** | Quản trị cửa hàng, xem danh sách toàn bộ nhân sự, cấu hình hệ thống, quản lý danh mục kỹ năng, loại hợp đồng, định mức nhân sự (Headcount Quota), nhật ký kiểm toán (Audit Logs). |
| **2** | `manager@shiftsync.com` | **MANAGER** | **Store 1 (Flagship Store)** | Quản lý ca làm việc Store 1, lập lịch thủ công, chạy thuật toán AutoScheduler, duyệt đơn nghỉ phép, duyệt đổi ca, duyệt khiếu nại điểm danh, xem bảng điều khiển (Dashboard KPI), tính và xuất Excel bảng lương Store 1. |
| **3** | `manager.store2@shiftsync.com` | **MANAGER** | **Store 2 (Riverside Store)** | Kiểm thử tính cô lập cửa hàng (**Store Isolation**): chỉ thấy nhân sự/ca của Store 2; nhận và phản hồi yêu cầu chia sẻ nhân sự liên cửa hàng (**Workforce Requests**); kiểm tra kịch bản thiếu hụt nhân sự (**SCHED-06**). |

---

## 2. TÀI KHOẢN NHÂN VIÊN STORE 1 — FLAGSHIP STORE (23 NHÂN SỰ)

| Mã | Email Đăng Nhập | Họ Và Tên | Kỹ Năng & Hạn Dùng | Khung Giờ Rảnh (Availability) | Mục Đích Kiểm Thử QA Thủ Công |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **EMP01** | `emp01@shiftsync.com` | **Nguyễn Minh Anh** | Barista (Chuyên gia), Cashier (Nâng cao) - Vĩnh viễn | Cả tuần (T2 - CN: 06:00 - 23:00) | Nhân viên chuẩn: có ca đang làm việc (Check-in chiều 17/09), người gửi đơn đổi ca (`Shift Swap`), xem thông báo, tải phiếu lương PDF cá nhân. |
| **EMP02** | `emp02@shiftsync.com` | **Trần Quốc Bảo** | Cashier (Chuyên gia), Waiter (Nâng cao) - Vĩnh viễn | Cả tuần (T2 - CN: 06:00 - 23:00) | Đối tác nhận yêu cầu đổi ca (`Shift Swap Responder`). Đăng nhập để chấp nhận đơn đổi ca từ EMP01. |
| **EMP03** | `emp03@shiftsync.com` | **Lê Hoàng Nam** | Barista (Nâng cao), Waiter (Chuyên gia) - Vĩnh viễn | **Chỉ T2, T4, T6** (07:00 - 22:30) | **SCHED-01:** Kiểm thử thuật toán AutoScheduler chỉ xếp ca vào các ngày T2, T4, T6; tuyệt đối không xếp vào T3, T5, T7, CN. |
| **EMP04** | `emp04@shiftsync.com` | **Phạm Gia Huy** | Barista (Trung cấp) - Có hạn đến `2027-12-31` | Cả tuần (06:00 - 23:00) | Kiểm thử kỹ năng có thời hạn còn hiệu lực (Active Temporary Skill). |
| **EMP05** | `emp05@shiftsync.com` | **Võ Minh Khang** | Cashier (Nâng cao), Barista (Sơ cấp - Sắp hết hạn `2026-09-20`) | **Chỉ Buổi Sáng** (06:00 - 12:00) | **SCHED-01 & Marketplace:** Chỉ rảnh sáng (AutoScheduler không xếp ca chiều/tối); kỹ năng Barista sắp hết hạn; đăng nhập để nhận ca mở (`Claim Open Shift`). |
| **EMP06** | `emp06@shiftsync.com` | **Đặng Tuấn Kiệt** | Waiter (Nâng cao), Barista (**ĐÃ HẾT HẠN `2026-09-10`**) | Cả tuần (06:00 - 23:00) | **SCHED-04:** Chứng chỉ Barista đã hết hạn; kiểm thử AutoScheduler và UI gán ca thủ công phải từ chối xếp vị trí Barista cho EMP06. |
| **EMP07** | `emp07@shiftsync.com` | **Hoàng Đức Thắng** | Barista & Cashier (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân viên tiêu chuẩn phục vụ phân bổ ca W38 và W39. |
| **EMP08** | `emp08@shiftsync.com` | **Bùi Quang Huy** | Waiter & Barista (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | **SCHED-03:** Đang có **ĐƠN NGHỈ PHÉP ĐÃ DUYỆT** ngày `18/09/2026 - 19/09/2026`. Kiểm tra AutoScheduler và xếp ca thủ công không đụng vào 2 ngày này. |
| **EMP09** | `emp09@shiftsync.com` | **Ngô Văn Nam** | Cashier & Waiter (Trung cấp - Hạn 2027) | **Chỉ Buổi Tối** (18:00 - 23:00) | **SCHED-01:** Chỉ rảnh tối; dùng để kiểm thử bộ lọc ca tối và xếp ca ban đêm. |
| **EMP10** | `emp10@shiftsync.com` | **Đoàn Hải Đăng** | Barista & Cashier (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân viên vận hành thường nhật. |
| **EMP11** | `emp11@shiftsync.com` | **Dương Minh Trí** | Waiter & Barista (Trung cấp - Hạn 2027) | **Chỉ Buổi Sáng** (06:00 - 12:00) | Kiểm thử lọc ca sáng và AutoScheduler. |
| **EMP12** | `emp12@shiftsync.com` | **Phan Thanh Tùng** | Cashier & Waiter (Trung cấp - Hạn 2027) | **Chỉ Buổi Chiều** (14:30 - 22:30) | Kiểm thử ca chiều và xoay vòng nhân sự. |
| **EMP13** | `emp13@shiftsync.com` | **Vũ Quốc Việt** | Barista & Cashier (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân sự gán vị trí quầy Barista. |
| **EMP14** | `emp14@shiftsync.com` | **Nguyễn Hữu Phúc** | Waiter & Barista (Trung cấp - Hạn 2027) | **Chỉ Buổi Tối** (18:00 - 23:00) | Nhân sự gán vị trí Sảnh tầng trệt ca tối. |
| **EMP15** | `emp15@shiftsync.com` | **Đinh Bảo Thắng** | Cashier & Waiter (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân sự gán quầy POS thu ngân. |
| **EMP16** | `emp16@shiftsync.com` | **Trịnh Kim Tuấn** | Barista & Cashier (Trung cấp - Hạn 2027) | **Chỉ Cuối Tuần** (T7, CN: 07:00 - 23:00) | **SCHED-01:** Chỉ rảnh T7 và CN; các ngày trong tuần không khả dụng. |
| **EMP17** | `emp17@shiftsync.com` | **Cao Văn Thịnh** | Waiter & Barista (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân viên phục vụ phân bổ không gian tầng trệt. |
| **EMP18** | `emp18@shiftsync.com` | **Mai Quốc Sơn** | Cashier & Waiter (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân viên thu ngân khu vực ban công/sân thượng. |
| **EMP19** | `emp19@shiftsync.com` | **Tạ Tiến Đạt** | Barista & Cashier (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân viên đa năng phục vụ AutoScheduler. |
| **EMP20** | `emp20@shiftsync.com` | **Đỗ Mạnh Tiến** | Waiter & Barista (Trung cấp - Hạn 2027) | Cả tuần (06:00 - 23:00) | Nhân viên phục vụ phân bổ ca W38. |
| **EMP21** | `emp21@shiftsync.com` | **Phạm Thị Cửu (Former)** | Barista (Chuyên gia) | Không có lịch rảnh | **INACTIVE:** Đã nghỉ việc ngày `2026-07-31` (`left_date`). Dùng để test lọc danh sách nhân viên đã nghỉ việc, không được xuất hiện trong xếp ca. |
| **EMP22** | `emp22@shiftsync.com` | **Trần Văn Định (Suspended)** | Cashier (Trung cấp) | Không có lịch rảnh | **SUSPENDED:** Đang bị tạm đình chỉ công tác từ ngày `2026-09-01`. Dùng để kiểm tra chặn đăng nhập hoặc chặn xếp ca. |
| **EMP99** | `emp99@shiftsync.com` | **Nguyễn Văn Intern** | Cashier & Waiter (Sơ cấp) | Cả tuần (06:00 - 23:00) | **SCHED-08 & INTERN:** Hợp đồng thực tập sinh, giới hạn tối đa **20 giờ/tuần**. AutoScheduler không được xếp vượt 20h. |

---

## 3. TÀI KHOẢN NHÂN VIÊN STORE 2 — RIVERSIDE STORE (5 NHÂN SỰ)

| Mã | Email Đăng Nhập | Họ Và Tên | Vai Trò & Kỹ Năng | Đặc Điểm Kiểm Thử QA Thủ Công |
| :---: | :--- | :--- | :--- | :--- |
| **S2_01** | `staff.store2.chris@shiftsync.com` | **Riverside Staff Chris** | Barista Store 2 (Chuyên gia) | **Workforce Proposal:** Ứng viên được Quản lý Store 2 đề cử sang hỗ trợ Store 1. Đăng nhập để xem và phản hồi đề xuất mượn người. |
| **S2_02** | `staff.store2.david@shiftsync.com` | **Riverside Staff David** | Cashier Store 2 (Nâng cao) | Nhân viên Store 2 tiêu chuẩn. Đăng nhập để kiểm tra không nhìn thấy dữ liệu của Store 1. |
| **S2_03** | `staff.store2.emma@shiftsync.com` | **Riverside Staff Emma** | Waiter Store 2 (Nâng cao) | Nhân viên phục vụ Store 2. |
| **S2_04** | `staff.store2.frank@shiftsync.com` | **Riverside Staff Frank** | Barista & Waiter Store 2 | **Store Transfer:** Có lịch sử thuyên chuyển: INACTIVE tại Store 1 (đến 31/05/2026) và ACTIVE tại Store 2 (từ 01/06/2026). |
| **S2_05** | `staff.store2.grace@shiftsync.com` | **Riverside Staff Grace** | Nhân viên mới tuyển | **0-Availability:** Hoàn toàn chưa đăng ký khung giờ rảnh nào. Kiểm thử cách hệ thống hiển thị nhân viên chưa có lịch khả dụng. |
