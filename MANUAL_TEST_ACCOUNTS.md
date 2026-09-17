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

## 2. TÀI KHOẢN NHÂN VIÊN STORE 1 — FLAGSHIP STORE (38 NHÂN SỰ)

| Mã | Email Đăng Nhập | Họ Và Tên | Kỹ Năng & Hạn Dùng | Khung Giờ Rảnh (Availability) | Mục Đích Kiểm Thử QA Thủ Công |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **EMP01** | `emp01@shiftsync.com` | **Nguyễn Minh Anh** | Barista (Chuyên gia), Cashier (Nâng cao) - Vĩnh viễn | Cả tuần (T2 - CN: 06:00 - 23:30) | Nhân viên chuẩn: có ca đang làm việc (Check-in chiều 17/09), người gửi đơn đổi ca (`Shift Swap`), xem thông báo, tải phiếu lương PDF cá nhân. |
| **EMP02** | `emp02@shiftsync.com` | **Trần Quốc Bảo** | Cashier (Chuyên gia), Waiter (Nâng cao) - Vĩnh viễn | Cả tuần (T2 - CN: 06:00 - 23:30) | Đối tác nhận yêu cầu đổi ca (`Shift Swap Responder`). Đăng nhập để chấp nhận đơn đổi ca từ EMP01. |
| **EMP03** | `emp03@shiftsync.com` | **Lê Hoàng Nam** | Barista (Nâng cao), Waiter (Chuyên gia) - Vĩnh viễn | **Chỉ T2, T4, T6** (06:00 - 23:30) | **SCHED-01:** Ràng buộc thứ trong tuần. AutoScheduler chỉ xếp ca T2, T4, T6; tuyệt đối không xếp T3, T5, T7, CN. |
| **EMP04** | `emp04@shiftsync.com` | **Phạm Gia Huy** | Barista (Trung cấp) - Hạn `2027-12-31` | Cả tuần (06:00 - 23:30) | Kiểm thử chứng chỉ kỹ năng có thời hạn còn hiệu lực (Active Temporary Skill). |
| **EMP05** | `emp05@shiftsync.com` | **Võ Minh Khang** | Cashier (Nâng cao), Barista (Sắp hết hạn `2026-09-20`) | **Chỉ Buổi Sáng** (06:00 - 15:30) | **SCHED-01 & Marketplace:** Chỉ rảnh sáng (AutoScheduler không xếp ca trưa/chiều/tối); nhận ca mở (`Claim Open Shift`). |
| **EMP06** | `emp06@shiftsync.com` | **Đặng Tuấn Kiệt** | Waiter (Nâng cao), Barista (**ĐÃ HẾT HẠN `2026-09-10`**) | Cả tuần (06:00 - 23:30) | **SCHED-04:** Chứng chỉ Barista hết hạn; AutoScheduler và UI từ chối xếp vị trí Barista cho EMP06. |
| **EMP07** | `emp07@shiftsync.com` | **Hoàng Đức Thắng** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự cốt lõi đa năng phục vụ AutoScheduler W38 và W39. |
| **EMP08** | `emp08@shiftsync.com` | **Bùi Quang Huy** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | **SCHED-03:** Đang có **ĐƠN NGHỈ PHÉP ĐÃ DUYỆT** ngày `18/09/2026 - 19/09/2026` (W38). Hệ thống không xếp ca 2 ngày này. |
| **EMP09** | `emp09@shiftsync.com` | **Ngô Văn Nam** | Cashier & Waiter (Trung cấp - 2027) | **Chỉ Buổi Tối** (17:30 - 23:30) | **SCHED-01:** Chỉ rảnh tối; kiểm thử xếp ca đêm (Night Shift 18:00 - 23:00). |
| **EMP10** | `emp10@shiftsync.com` | **Đoàn Hải Đăng** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự vận hành tiêu chuẩn. |
| **EMP11** | `emp11@shiftsync.com` | **Dương Minh Trí** | Barista & Waiter (Trung cấp - 2027) | **Chỉ Buổi Sáng** (06:00 - 15:30) | **SCHED-01:** Chỉ rảnh sáng; kiểm thử lọc ca sáng và AutoScheduler. |
| **EMP12** | `emp12@shiftsync.com` | **Phan Thanh Tùng** | Cashier & Waiter (Trung cấp - 2027) | **Chỉ Chiều & Tối** (14:00 - 23:00) | **SCHED-01:** Rảnh chiều/tối; AutoScheduler không xếp ca sáng hoặc ca trưa. |
| **EMP13** | `emp13@shiftsync.com` | **Vũ Quốc Việt** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự đa năng phân bổ vị trí quầy Barista. |
| **EMP14** | `emp14@shiftsync.com` | **Nguyễn Hữu Phúc** | Barista & Waiter (Trung cấp - 2027) | **Chỉ Buổi Tối** (17:30 - 23:30) | **SCHED-01:** Rảnh ca tối. |
| **EMP15** | `emp15@shiftsync.com` | **Đinh Bảo Thắng** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự đa năng phân bổ quầy POS thu ngân. |
| **EMP16** | `emp16@shiftsync.com` | **Trịnh Kim Tuấn** | Barista, Cashier, Waiter (Trung cấp - 2027) | **Chỉ Cuối Tuần** (T7, CN: 06:00 - 23:30) | **SCHED-01:** Chỉ rảnh T7 và CN; các ngày T2 - T6 hoàn toàn không bị xếp ca. |
| **EMP17** | `emp17@shiftsync.com` | **Cao Văn Thịnh** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự phục vụ sảnh tầng trệt. |
| **EMP18** | `emp18@shiftsync.com` | **Mai Quốc Sơn** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự thu ngân khu vực gác lửng / sân thượng. |
| **EMP19** | `emp19@shiftsync.com` | **Tạ Tiến Đạt** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự đa năng phục vụ AutoScheduler. |
| **EMP20** | `emp20@shiftsync.com` | **Đỗ Mạnh Tiến** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự phục vụ ca W38 và W39. |
| **EMP21** | `emp21@shiftsync.com` | **Phạm Thị Cửu (Former)** | Barista (Chuyên gia) | Không có lịch rảnh | **INACTIVE:** Đã nghỉ việc ngày `2026-07-31` (`left_date`). Kiểm thử loại trừ nhân sự đã nghỉ việc. |
| **EMP22** | `emp22@shiftsync.com` | **Trần Văn Định (Suspended)** | Cashier (Trung cấp) | Không có lịch rảnh | **SUSPENDED:** Bị tạm đình chỉ công tác từ `2026-09-01`. Kiểm thử chặn xếp ca và chặn quyền. |
| **EMP23** | `emp23@shiftsync.com` | **Lý Hoàng Phong** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự cốt lõi bổ sung cho W39. |
| **EMP24** | `emp24@shiftsync.com` | **Hà Xuân Vinh** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự cốt lõi bổ sung cho W39. |
| **EMP25** | `emp25@shiftsync.com` | **Lưu Hữu Yên** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | **SCHED-03 (W39):** Có **ĐƠN NGHỈ PHÉP ĐÃ DUYỆT** ngày `22/09/2026 - 23/09/2026`. AutoScheduler tuyệt đối không xếp ca vào 2 ngày này. |
| **EMP26** | `emp26@shiftsync.com` | **Vũ Thanh Hải** | **CHỈ Cashier** (Nâng cao - 2027) | Cả tuần (06:00 - 23:30) | **SCHED-04 (Skill Match):** Chỉ có kỹ năng Cashier. AutoScheduler CHỈ gán vào slot Cashier, không gán Barista/Waiter. |
| **EMP27** | `emp27@shiftsync.com` | **Nguyễn Văn An** | **CHỈ Barista** (Nâng cao - 2027) | Cả tuần (06:00 - 23:30) | **SCHED-04 (Skill Match):** Chỉ có kỹ năng Barista. AutoScheduler CHỈ gán vào slot Barista. |
| **EMP28** | `emp28@shiftsync.com` | **Trần Thị Bích** | **CHỈ Waiter** (Nâng cao - 2027) | Cả tuần (06:00 - 23:30) | **SCHED-04 (Skill Match):** Chỉ có kỹ năng Waiter. AutoScheduler CHỈ gán vào slot Waiter. |
| **EMP29** | `emp29@shiftsync.com` | **Lê Văn Lâm** | Cashier & Waiter (Trung cấp - 2027) | T2 - T6 (06:00 - 23:30) | **SCHED-02 (Part-Time):** Hợp đồng Bán thời gian giới hạn tối đa **25 giờ/tuần**. AutoScheduler không xếp quá 25h. |
| **EMP30** | `emp30@shiftsync.com` | **Chu Văn An** | Barista & Cashier (Trung cấp - 2027) | **0 Khung Giờ Rảnh** | **SCHED-01 (Zero-Availability):** Hoàn toàn không có lịch rảnh. AutoScheduler tuyệt đối KHÔNG xếp bất kỳ ca nào. |
| **EMP31** | `emp31@shiftsync.com` | **Bạch Xuân Trường** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | **SCHED-05 (Blackout Date):** Có ngày chặn làm việc vào Thứ Sáu `2026-09-25`. AutoScheduler không xếp ca vào ngày này. |
| **EMP32** | `emp32@shiftsync.com` | **Triệu Quốc Cường** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự cốt lõi bổ sung cho W39. |
| **EMP33** | `emp33@shiftsync.com` | **Đào Văn Kiên** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự cốt lõi bổ sung cho W39. |
| **EMP34** | `emp34@shiftsync.com` | **Nghiêm Xuân Mạnh** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự cốt lõi bổ sung cho W39. |
| **EMP35** | `emp35@shiftsync.com` | **Quách Gia Bảo** | Barista, Cashier, Waiter (Trung cấp - 2027) | Cả tuần (06:00 - 23:30) | Nhân sự cốt lõi bổ sung cho W39. |
| **EMP99** | `emp99@shiftsync.com` | **Nguyễn Văn Intern** | Cashier & Waiter (Sơ cấp - 2027) | Cả tuần (06:00 - 23:30) | **SCHED-02 & INTERN:** Hợp đồng Thực tập sinh giới hạn tối đa **20 giờ/tuần**. AutoScheduler không xếp quá 20h. |

---

## 3. TÀI KHOẢN NHÂN VIÊN STORE 2 — RIVERSIDE STORE (5 NHÂN SỰ)

| Mã | Email Đăng Nhập | Họ Và Tên | Vai Trò & Kỹ Năng | Đặc Điểm Kiểm Thử QA Thủ Công |
| :---: | :--- | :--- | :--- | :--- |
| **S2_01** | `staff.store2.chris@shiftsync.com` | **Riverside Staff Chris** | Barista Store 2 (Chuyên gia) | **Workforce Proposal:** Ứng viên được Quản lý Store 2 đề cử sang hỗ trợ Store 1. Đăng nhập để xem và phản hồi đề xuất mượn người. |
| **S2_02** | `staff.store2.david@shiftsync.com` | **Riverside Staff David** | Cashier Store 2 (Nâng cao) | Nhân viên Store 2 tiêu chuẩn. Đăng nhập để kiểm tra không nhìn thấy dữ liệu của Store 1. |
| **S2_03** | `staff.store2.emma@shiftsync.com` | **Riverside Staff Emma** | Waiter Store 2 (Nâng cao) | Nhân viên phục vụ Store 2. |
| **S2_04** | `staff.store2.frank@shiftsync.com` | **Riverside Staff Frank** | Barista & Waiter Store 2 | **Store Transfer:** Có lịch sử thuyên chuyển: INACTIVE tại Store 1 (đến 31/05/2026) và ACTIVE tại Store 2 (từ 01/06/2026). |
| **S2_05** | `staff.store2.grace@shiftsync.com` | **Riverside Staff Grace** | Nhân viên mới tuyển | **0-Availability:** Hoàn toàn chưa đăng ký khung giờ rảnh nào. Kiểm thử cách hệ thống hiển thị nhân viên chưa có lịch khả dụng. |
