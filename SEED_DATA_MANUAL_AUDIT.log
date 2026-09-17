# BÁO CÁO TOÀN DIỆN DỮ LIỆU SEED (MANUAL AUDIT LOG)
> **Hệ thống Quản lý Ca làm việc ShiftSync**
> **Thời gian xuất dữ liệu:** `2026-09-17 10:51:05`
> **Cơ sở dữ liệu:** PostgreSQL 15 (`shiftsync`) trên Docker Container `shiftsync-db`
> **Tài liệu kiểm tra thủ công:** Xuất trực tiếp từ 34 bảng nghiệp vụ thực tế, 100% không fake/mock data.

---

## 1. TỔNG QUAN BẢNG DỮ LIỆU & SỐ LƯỢNG BẢN GHI (DATABASE STATS)
| Tên Bảng                      | Số Bản Ghi |
| ----------------------------- | ---------- |
| attendance                    | 62         |
| attendance_adjustment_request | 3          |
| audit_log                     | 4          |
| availability                  | 248        |
| blackout_date                 | 7          |
| contract_type                 | 6          |
| employment                    | 44         |
| flyway_schema_history         | 0          |
| holiday                       | 4          |
| leave_request                 | 5          |
| notification                  | 5          |
| notification_preference       | 352        |
| open_shift_claim              | 2          |
| payroll                       | 41         |
| payroll_period                | 3          |
| scheduler_configuration       | 2          |
| shift                         | 94         |
| shift_assignment              | 223        |
| shift_skill_requirement       | 212        |
| shift_swap_request            | 3          |
| shift_template                | 6          |
| skill                         | 6          |
| staff                         | 44         |
| staff_requests                | 0          |
| staff_skill                   | 87         |
| store                         | 2          |
| store_configuration           | 2          |
| store_layouts                 | 2          |
| store_templates               | 0          |
| store_zones                   | 7          |
| user_device_tokens            | 0          |
| workforce_proposal            | 2          |
| workforce_request             | 4          |
| workstations                  | 6          |


## 2. CỬA HÀNG & CẤU HÌNH KHÔNG GIAN 3D (STORES & 3D SPATIAL)
### 2.1. Danh sách Cửa hàng & Cấu hình Geofence
| Store ID                             | Tên Cửa Hàng              | Địa Chỉ                                                   | Tọa Độ GPS                | Phân Loại     | Mô Hình     | Bán Kính GPS | Giờ Max/Tuần | Nghỉ Giữa Ca |
| ------------------------------------ | ------------------------- | --------------------------------------------------------- | ------------------------- | ------------- | ----------- | ------------ | ------------ | ------------ |
| 11111111-1111-1111-1111-111111111111 | ShiftSync Flagship Store  | 123 Le Loi, Ben Nghe, District 1, Ho Chi Minh City        | (10.7768890, 106.7008060) | FOOD_BEVERAGE | Coffee Shop | 100m         | 48h/tuần     | 8h nghỉ      |
| 77777777-7777-7777-7777-777777777777 | ShiftSync Riverside Store | 456 Ton Duc Thang, Ben Nghe, District 1, Ho Chi Minh City | (10.7712340, 106.7056780) | FOOD_BEVERAGE | Coffee Shop | 100m         | 48h/tuần     | 8h nghỉ      |


### 2.2. Không gian 3D & Khu vực làm việc (Store Zones)
| Cửa Hàng                  | Khu Vực (Zone)         | Loại Zone | Màu Hex | Kích Thước (W x L x H) | Toạ Độ 3D        | Sức Chứa | Zone ID                              |
| ------------------------- | ---------------------- | --------- | ------- | ---------------------- | ---------------- | -------- | ------------------------------------ |
| ShiftSync Flagship Store  | Barista Counter        | COUNTER   | #FF5733 | 3.0x2.0x1.2            | (4.0, 3.0, 0.0)  | 4        | d1000000-0000-0000-0000-000000000001 |
| ShiftSync Flagship Store  | Dining Hall Ground     | SEATING   | #3357FF | 8.0x6.0x3.0            | (14.0, 8.0, 0.0) | 8        | d1000000-0000-0000-0000-000000000003 |
| ShiftSync Flagship Store  | Mezzanine Balcony      | SEATING   | #F3FF33 | 8.0x5.0x2.5            | (14.0, 8.0, 3.5) | 6        | d1000000-0000-0000-0000-000000000004 |
| ShiftSync Flagship Store  | Outdoor Patio          | SEATING   | #FF33F3 | 5.0x4.0x3.0            | (4.0, 12.0, 0.0) | 4        | d1000000-0000-0000-0000-000000000005 |
| ShiftSync Flagship Store  | POS & Cashier          | COUNTER   | #33FF57 | 2.5x2.0x1.2            | (8.0, 3.0, 0.0)  | 3        | d1000000-0000-0000-0000-000000000002 |
| ShiftSync Riverside Store | Riverside Main Counter | COUNTER   | #FF5733 | 4.0x2.0x1.2            | (4.0, 3.0, 0.0)  | 4        | d2000000-0000-0000-0000-000000000001 |
| ShiftSync Riverside Store | Riverside Seating      | SEATING   | #3357FF | 8.0x6.0x3.0            | (12.0, 8.0, 0.0) | 8        | d2000000-0000-0000-0000-000000000002 |


### 2.3. Vị trí làm việc chi tiết (Workstations)
| Cửa Hàng                  | Khu Vực                | Tên Workstation           | Loại            | Tọa Độ 3D        | Sức Chứa | Trạng Thái | Workstation ID                       |
| ------------------------- | ---------------------- | ------------------------- | --------------- | ---------------- | -------- | ---------- | ------------------------------------ |
| ShiftSync Flagship Store  | Barista Counter        | Espresso Station A1       | BARISTA_BAR     | (4.0, 2.5, 0.9)  | 1        | Hoạt động  | a7000000-0000-0000-0000-000000000001 |
| ShiftSync Flagship Store  | Barista Counter        | Pour-Over Station A2      | BARISTA_BAR     | (4.0, 3.5, 0.9)  | 1        | Hoạt động  | a7000000-0000-0000-0000-000000000002 |
| ShiftSync Flagship Store  | Dining Hall Ground     | Ground Floor Service Desk | SERVICE_DESK    | (14.0, 8.0, 0.0) | 2        | Hoạt động  | a7000000-0000-0000-0000-000000000005 |
| ShiftSync Flagship Store  | POS & Cashier          | POS Register 01           | CASHIER_STATION | (8.0, 2.5, 0.9)  | 1        | Hoạt động  | a7000000-0000-0000-0000-000000000003 |
| ShiftSync Flagship Store  | POS & Cashier          | POS Register 02           | CASHIER_STATION | (8.0, 3.5, 0.9)  | 1        | Hoạt động  | a7000000-0000-0000-0000-000000000004 |
| ShiftSync Riverside Store | Riverside Main Counter | Riverside Main Register   | GENERIC_COUNTER | (4.0, 3.0, 0.9)  | 2        | Hoạt động  | a7000000-0000-0000-0000-000000000006 |


## 3. DANH BẠ TÀI KHOẢN & HỒ SƠ NHÂN SỰ (44 TÀI KHOẢN TOÀN HỆ THỐNG)
> **Mật khẩu chung cho mọi tài khoản:** `Password123!`

| Email                            | Họ Tên                    | Role    | Trạng Thái | Chi Nhánh                 | Loại Hợp Đồng     | Lương / Giờ | Mục Đích Kiểm Thử / Ràng Buộc Nghiệp Vụ                                                             |
| -------------------------------- | ------------------------- | ------- | ---------- | ------------------------- | ----------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| admin@shiftsync.com              | System Administrator      | ADMIN   | ACTIVE     | Toàn hệ thống             | N/A               | N/A         | Super Admin - Toàn quyền cấu hình hệ thống, quản lý chi nhánh toàn quốc                             |
| manager@shiftsync.com            | Store Manager Alice       | MANAGER | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 35 đ        | Manager Store 1 (Flagship) - Phê duyệt ca, xếp lịch, định biên, chấm công, payroll                  |
| emp01@shiftsync.com              | Nguyen Minh Anh           | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 24 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp02@shiftsync.com              | Tran Quoc Bao             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 26 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp03@shiftsync.com              | Le Hoang Nam              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 28 đ        | RÀNG BUỘC HC2: Chỉ rảnh Thứ 2, Thứ 4, Thứ 6 (06:00 - 23:30), T3/T5/T7/CN bận                        |
| emp04@shiftsync.com              | Pham Gia Huy              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 30 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp05@shiftsync.com              | Vo Minh Khang             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 22 đ        | RÀNG BUỘC HC2: Chỉ rảnh Ca Sáng (06:00 - 15:30), chiều & tối không làm được                         |
| emp06@shiftsync.com              | Dang Tuan Kiet            | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 24 đ        | RÀNG BUỘC HC1: Chứng chỉ Barista hết hạn 2026-09-10 (chỉ còn Waiter hợp lệ)                         |
| emp07@shiftsync.com              | Hoang Duc Thang           | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 26 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp08@shiftsync.com              | Bui Quang Huy             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 28 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp09@shiftsync.com              | Ngo Van Nam               | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 30 đ        | RÀNG BUỘC HC2: Chỉ rảnh Ca Tối (17:30 - 23:30), sáng & chiều không làm được                         |
| emp10@shiftsync.com              | Doan Hai Dang             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 22 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp11@shiftsync.com              | Duong Minh Tri            | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 24 đ        | RÀNG BUỘC HC2: Chỉ rảnh Ca Sáng (06:00 - 15:30), chiều & tối không làm được                         |
| emp12@shiftsync.com              | Phan Thanh Tung           | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 26 đ        | RÀNG BUỘC HC2: Chỉ rảnh Chiều & Tối (14:00 - 23:00)                                                 |
| emp13@shiftsync.com              | Vu Quoc Viet              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 28 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp14@shiftsync.com              | Nguyen Huu Phuc           | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 30 đ        | RÀNG BUỘC HC2: Chỉ rảnh Ca Tối (17:30 - 23:30), sáng & chiều không làm được                         |
| emp15@shiftsync.com              | Dinh Bao Thang            | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 22 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp16@shiftsync.com              | Trinh Kim Tuan            | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 24 đ        | RÀNG BUỘC HC2: Chỉ rảnh Cuối Tuần (T7, CN 06:00 - 23:30)                                            |
| emp17@shiftsync.com              | Cao Van Thinh             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 26 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp18@shiftsync.com              | Mai Quoc Son              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 28 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp19@shiftsync.com              | Ta Tien Dat               | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 30 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp20@shiftsync.com              | Do Manh Tien              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 22 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp21@shiftsync.com              | Pham Thi Cuu (Former)     | STAFF   | INACTIVE   | ShiftSync Flagship Store  | Full-Time         | 24 đ        | TRẠNG THÁI: INACTIVE (Cựu nhân viên, nghỉ việc từ 2026-07-31, thuật toán không xếp ca)              |
| emp22@shiftsync.com              | Tran Van Dinh (Suspended) | STAFF   | SUSPENDED  | ShiftSync Flagship Store  | Part-Time         | 22 đ        | TRẠNG THÁI: SUSPENDED (Đình chỉ công tác từ 2026-09-01, thuật toán không xếp ca)                    |
| emp23@shiftsync.com              | Ly Hoang Phong            | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 28 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp24@shiftsync.com              | Ha Xuan Vinh              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 30 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp25@shiftsync.com              | Luu Huu Yen               | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 22 đ        | RÀNG BUỘC HC2: Đã duyệt Đơn Nghỉ Phép ngày 22/09 & 23/09/2026 (tránh xếp ca các ngày này)           |
| emp26@shiftsync.com              | Vu Thanh Hai              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 24 đ        | RÀNG BUỘC HC1: Chỉ có duy nhất kỹ năng Thu ngân - Cashier (chỉ xếp vị trí Thu ngân)                 |
| emp27@shiftsync.com              | Nguyen Van An             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 26 đ        | RÀNG BUỘC HC1: Chỉ có duy nhất kỹ năng Pha chế - Barista (chỉ xếp vị trí Barista)                   |
| emp28@shiftsync.com              | Tran Thi Bich             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 28 đ        | RÀNG BUỘC HC1: Chỉ có duy nhất kỹ năng Phục vụ - Waiter (chỉ xếp vị trí Phục vụ)                    |
| emp29@shiftsync.com              | Le Van Lam                | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 22 đ        | RÀNG BUỘC HC4: Hợp đồng Part-Time tối đa 25 giờ/tuần (thuật toán không vượt 25h)                    |
| emp30@shiftsync.com              | Chu Van An                | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 22 đ        | RÀNG BUỘC HC2: 0 lịch rảnh đăng ký trong tuần W39 (thuật toán không bao giờ xếp ca)                 |
| emp31@shiftsync.com              | Bach Xuan Truong          | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 24 đ        | RÀNG BUỘC HC2: Có Blackout date ngày 25/09/2026 (không xếp ca vào ngày 25)                          |
| emp32@shiftsync.com              | Trieu Quoc Cuong          | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 26 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp33@shiftsync.com              | Dao Van Kien              | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Full-Time         | 28 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp34@shiftsync.com              | Nghiem Xuan Manh          | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Part-Time         | 30 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp35@shiftsync.com              | Quach Gia Bao             | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Seasonal          | 22 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| emp99@shiftsync.com              | Nguyen Van Intern         | STAFF   | ACTIVE     | ShiftSync Flagship Store  | Intern            | 15 đ        | RÀNG BUỘC HC4: Hợp đồng Thực tập sinh (Intern) tối đa 20 giờ/tuần                                   |
| staff.store2.frank@shiftsync.com | Riverside Staff Frank     | STAFF   | INACTIVE   | ShiftSync Flagship Store  | Part-Time         | 22 đ        | Core Pool: Đầy đủ 3 skills (Barista, Cashier, Waiter), rảnh T2-CN 06:00-23:30, sẵn sàng lấp đầy W39 |
| manager.store2@shiftsync.com     | Store Manager Bob         | MANAGER | ACTIVE     | ShiftSync Riverside Store | Store 2 Standard  | 32 đ        | Manager Store 2 (Riverside) - Quản lý chi nhánh 2, kiểm thử kịch bản thiếu nhân sự                  |
| staff.store2.chris@shiftsync.com | Riverside Staff Chris     | STAFF   | ACTIVE     | ShiftSync Riverside Store | Store 2 Standard  | 25 đ        | Store 2 Staff                                                                                       |
| staff.store2.david@shiftsync.com | Riverside Staff David     | STAFF   | ACTIVE     | ShiftSync Riverside Store | Store 2 Part-Time | 22 đ        | Store 2 Staff                                                                                       |
| staff.store2.emma@shiftsync.com  | Riverside Staff Emma      | STAFF   | ACTIVE     | ShiftSync Riverside Store | Store 2 Part-Time | 20 đ        | Store 2 Staff                                                                                       |
| staff.store2.frank@shiftsync.com | Riverside Staff Frank     | STAFF   | ACTIVE     | ShiftSync Riverside Store | Store 2 Standard  | 24 đ        | Store 2 Staff                                                                                       |
| staff.store2.grace@shiftsync.com | Riverside Staff Grace     | STAFF   | ACTIVE     | ShiftSync Riverside Store | Store 2 Part-Time | 20 đ        | Store 2 Staff                                                                                       |


## 4. KỸ NĂNG & CHỨNG CHỈ (SKILLS & CERTIFICATIONS)
### 4.1. Danh mục Kỹ năng theo Chi nhánh
| Chi Nhánh                 | Tên Kỹ Năng | Mô Tả                                                          | Skill ID                             |
| ------------------------- | ----------- | -------------------------------------------------------------- | ------------------------------------ |
| ShiftSync Flagship Store  | Barista     | Chuyen pha che ca phe chuyen nghiep va thuc uong dac biet      | b0000000-0000-0000-0000-000000000001 |
| ShiftSync Flagship Store  | Cashier     | Thu ngan, quan ly hoa don, thanh toan POS va doi soat tien mat | b0000000-0000-0000-0000-000000000002 |
| ShiftSync Flagship Store  | Waiter      | Phuc vu ban, cham soc khach hang tai cho va don dep khu vuc    | b0000000-0000-0000-0000-000000000003 |
| ShiftSync Riverside Store | Barista     | Pha che chuyen nghiep tai cua hang Riverside                   | b0000000-0000-0000-0000-000000000006 |
| ShiftSync Riverside Store | Cashier     | Thu ngan tai cua hang Riverside                                | b0000000-0000-0000-0000-000000000007 |
| ShiftSync Riverside Store | Waiter      | Phuc vu tai cua hang Riverside                                 | b0000000-0000-0000-0000-000000000008 |


### 4.2. Bảng phân bổ kỹ năng & Hiệu lực chứng chỉ nhân viên (Staff-Skill Matrix)
| Email                            | Họ Tên                | Kỹ Năng | Cấp Độ           | Ngày Hết Hạn | Trạng Thái Hiệu Lực |
| -------------------------------- | --------------------- | ------- | ---------------- | ------------ | ------------------- |
| emp01@shiftsync.com              | Nguyen Minh Anh       | Barista | Cấp EXPERT       | Vô thời hạn  | VALID (Hợp lệ)      |
| emp01@shiftsync.com              | Nguyen Minh Anh       | Cashier | Cấp ADVANCED     | Vô thời hạn  | VALID (Hợp lệ)      |
| emp02@shiftsync.com              | Tran Quoc Bao         | Cashier | Cấp EXPERT       | Vô thời hạn  | VALID (Hợp lệ)      |
| emp02@shiftsync.com              | Tran Quoc Bao         | Waiter  | Cấp ADVANCED     | Vô thời hạn  | VALID (Hợp lệ)      |
| emp03@shiftsync.com              | Le Hoang Nam          | Barista | Cấp ADVANCED     | Vô thời hạn  | VALID (Hợp lệ)      |
| emp03@shiftsync.com              | Le Hoang Nam          | Waiter  | Cấp EXPERT       | Vô thời hạn  | VALID (Hợp lệ)      |
| emp04@shiftsync.com              | Pham Gia Huy          | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp05@shiftsync.com              | Vo Minh Khang         | Barista | Cấp BEGINNER     | 2026-09-20   | VALID (Hợp lệ)      |
| emp05@shiftsync.com              | Vo Minh Khang         | Cashier | Cấp ADVANCED     | Vô thời hạn  | VALID (Hợp lệ)      |
| emp06@shiftsync.com              | Dang Tuan Kiet        | Barista | Cấp BEGINNER     | 2026-09-10   | EXPIRED (Hết hạn)   |
| emp06@shiftsync.com              | Dang Tuan Kiet        | Waiter  | Cấp ADVANCED     | Vô thời hạn  | VALID (Hợp lệ)      |
| emp07@shiftsync.com              | Hoang Duc Thang       | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp07@shiftsync.com              | Hoang Duc Thang       | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp07@shiftsync.com              | Hoang Duc Thang       | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp08@shiftsync.com              | Bui Quang Huy         | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp08@shiftsync.com              | Bui Quang Huy         | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp08@shiftsync.com              | Bui Quang Huy         | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp09@shiftsync.com              | Ngo Van Nam           | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp09@shiftsync.com              | Ngo Van Nam           | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp10@shiftsync.com              | Doan Hai Dang         | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp10@shiftsync.com              | Doan Hai Dang         | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp10@shiftsync.com              | Doan Hai Dang         | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp11@shiftsync.com              | Duong Minh Tri        | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp11@shiftsync.com              | Duong Minh Tri        | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp12@shiftsync.com              | Phan Thanh Tung       | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp12@shiftsync.com              | Phan Thanh Tung       | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp13@shiftsync.com              | Vu Quoc Viet          | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp13@shiftsync.com              | Vu Quoc Viet          | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp13@shiftsync.com              | Vu Quoc Viet          | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp14@shiftsync.com              | Nguyen Huu Phuc       | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp14@shiftsync.com              | Nguyen Huu Phuc       | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp15@shiftsync.com              | Dinh Bao Thang        | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp15@shiftsync.com              | Dinh Bao Thang        | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp15@shiftsync.com              | Dinh Bao Thang        | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp16@shiftsync.com              | Trinh Kim Tuan        | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp16@shiftsync.com              | Trinh Kim Tuan        | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp17@shiftsync.com              | Cao Van Thinh         | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp17@shiftsync.com              | Cao Van Thinh         | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp17@shiftsync.com              | Cao Van Thinh         | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp18@shiftsync.com              | Mai Quoc Son          | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp18@shiftsync.com              | Mai Quoc Son          | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp18@shiftsync.com              | Mai Quoc Son          | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp19@shiftsync.com              | Ta Tien Dat           | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp19@shiftsync.com              | Ta Tien Dat           | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp19@shiftsync.com              | Ta Tien Dat           | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp20@shiftsync.com              | Do Manh Tien          | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp20@shiftsync.com              | Do Manh Tien          | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp20@shiftsync.com              | Do Manh Tien          | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp23@shiftsync.com              | Ly Hoang Phong        | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp23@shiftsync.com              | Ly Hoang Phong        | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp23@shiftsync.com              | Ly Hoang Phong        | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp24@shiftsync.com              | Ha Xuan Vinh          | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp24@shiftsync.com              | Ha Xuan Vinh          | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp24@shiftsync.com              | Ha Xuan Vinh          | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp25@shiftsync.com              | Luu Huu Yen           | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp25@shiftsync.com              | Luu Huu Yen           | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp25@shiftsync.com              | Luu Huu Yen           | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp26@shiftsync.com              | Vu Thanh Hai          | Cashier | Cấp ADVANCED     | 2027-12-31   | VALID (Hợp lệ)      |
| emp27@shiftsync.com              | Nguyen Van An         | Barista | Cấp ADVANCED     | 2027-12-31   | VALID (Hợp lệ)      |
| emp28@shiftsync.com              | Tran Thi Bich         | Waiter  | Cấp ADVANCED     | 2027-12-31   | VALID (Hợp lệ)      |
| emp29@shiftsync.com              | Le Van Lam            | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp29@shiftsync.com              | Le Van Lam            | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp30@shiftsync.com              | Chu Van An            | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp30@shiftsync.com              | Chu Van An            | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp31@shiftsync.com              | Bach Xuan Truong      | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp31@shiftsync.com              | Bach Xuan Truong      | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp31@shiftsync.com              | Bach Xuan Truong      | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp32@shiftsync.com              | Trieu Quoc Cuong      | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp32@shiftsync.com              | Trieu Quoc Cuong      | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp32@shiftsync.com              | Trieu Quoc Cuong      | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp33@shiftsync.com              | Dao Van Kien          | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp33@shiftsync.com              | Dao Van Kien          | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp33@shiftsync.com              | Dao Van Kien          | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp34@shiftsync.com              | Nghiem Xuan Manh      | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp34@shiftsync.com              | Nghiem Xuan Manh      | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp34@shiftsync.com              | Nghiem Xuan Manh      | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp35@shiftsync.com              | Quach Gia Bao         | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp35@shiftsync.com              | Quach Gia Bao         | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp35@shiftsync.com              | Quach Gia Bao         | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| emp99@shiftsync.com              | Nguyen Van Intern     | Cashier | Cấp BEGINNER     | 2027-12-31   | VALID (Hợp lệ)      |
| emp99@shiftsync.com              | Nguyen Van Intern     | Waiter  | Cấp BEGINNER     | 2027-12-31   | VALID (Hợp lệ)      |
| staff.store2.chris@shiftsync.com | Riverside Staff Chris | Barista | Cấp EXPERT       | Vô thời hạn  | VALID (Hợp lệ)      |
| staff.store2.david@shiftsync.com | Riverside Staff David | Cashier | Cấp ADVANCED     | Vô thời hạn  | VALID (Hợp lệ)      |
| staff.store2.emma@shiftsync.com  | Riverside Staff Emma  | Waiter  | Cấp ADVANCED     | Vô thời hạn  | VALID (Hợp lệ)      |
| staff.store2.frank@shiftsync.com | Riverside Staff Frank | Barista | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| staff.store2.frank@shiftsync.com | Riverside Staff Frank | Waiter  | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |
| staff.store2.grace@shiftsync.com | Riverside Staff Grace | Cashier | Cấp INTERMEDIATE | 2027-12-31   | VALID (Hợp lệ)      |


## 5. LỊCH RẢNH ĐĂNG KÝ HÀNG TUẦN (AVAILABILITY)
Tổng số bản ghi availability trong database: **248 bản ghi**.

| Email                            | Họ Tên                    | Số Khung Giờ Đăng Ký | Các Ngày Đăng Ký       | Khoảng Thời Gian Rảnh |
| -------------------------------- | ------------------------- | -------------------- | ---------------------- | --------------------- |
| emp01@shiftsync.com              | Nguyen Minh Anh           | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp02@shiftsync.com              | Tran Quoc Bao             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp03@shiftsync.com              | Le Hoang Nam              | 3                    | T2, T4, T6             | 06:00:00 -> 23:30:00  |
| emp04@shiftsync.com              | Pham Gia Huy              | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp05@shiftsync.com              | Vo Minh Khang             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 15:30:00  |
| emp06@shiftsync.com              | Dang Tuan Kiet            | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp07@shiftsync.com              | Hoang Duc Thang           | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp08@shiftsync.com              | Bui Quang Huy             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp09@shiftsync.com              | Ngo Van Nam               | 7                    | T2, T3, T4, T5, T6, T7 | 17:30:00 -> 23:30:00  |
| emp10@shiftsync.com              | Doan Hai Dang             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp11@shiftsync.com              | Duong Minh Tri            | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 15:30:00  |
| emp12@shiftsync.com              | Phan Thanh Tung           | 7                    | T2, T3, T4, T5, T6, T7 | 14:00:00 -> 23:00:00  |
| emp13@shiftsync.com              | Vu Quoc Viet              | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp14@shiftsync.com              | Nguyen Huu Phuc           | 7                    | T2, T3, T4, T5, T6, T7 | 17:30:00 -> 23:30:00  |
| emp15@shiftsync.com              | Dinh Bao Thang            | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp16@shiftsync.com              | Trinh Kim Tuan            | 2                    | T7                     | 06:00:00 -> 23:30:00  |
| emp17@shiftsync.com              | Cao Van Thinh             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp18@shiftsync.com              | Mai Quoc Son              | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp19@shiftsync.com              | Ta Tien Dat               | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp20@shiftsync.com              | Do Manh Tien              | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp21@shiftsync.com              | Pham Thi Cuu (Former)     | 0                    | None                   | Không có lịch rảnh    |
| emp22@shiftsync.com              | Tran Van Dinh (Suspended) | 0                    | None                   | Không có lịch rảnh    |
| emp23@shiftsync.com              | Ly Hoang Phong            | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp24@shiftsync.com              | Ha Xuan Vinh              | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp25@shiftsync.com              | Luu Huu Yen               | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp26@shiftsync.com              | Vu Thanh Hai              | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp27@shiftsync.com              | Nguyen Van An             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp28@shiftsync.com              | Tran Thi Bich             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp29@shiftsync.com              | Le Van Lam                | 5                    | T2, T3, T4, T5, T6     | 06:00:00 -> 23:30:00  |
| emp30@shiftsync.com              | Chu Van An                | 0                    | None                   | Không có lịch rảnh    |
| emp31@shiftsync.com              | Bach Xuan Truong          | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp32@shiftsync.com              | Trieu Quoc Cuong          | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp33@shiftsync.com              | Dao Van Kien              | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp34@shiftsync.com              | Nghiem Xuan Manh          | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp35@shiftsync.com              | Quach Gia Bao             | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| emp99@shiftsync.com              | Nguyen Van Intern         | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:30:00  |
| manager.store2@shiftsync.com     | Store Manager Bob         | 0                    | None                   | Không có lịch rảnh    |
| manager@shiftsync.com            | Store Manager Alice       | 0                    | None                   | Không có lịch rảnh    |
| staff.store2.chris@shiftsync.com | Riverside Staff Chris     | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:00:00  |
| staff.store2.david@shiftsync.com | Riverside Staff David     | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:00:00  |
| staff.store2.emma@shiftsync.com  | Riverside Staff Emma      | 7                    | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:00:00  |
| staff.store2.frank@shiftsync.com | Riverside Staff Frank     | 14                   | T2, T3, T4, T5, T6, T7 | 06:00:00 -> 23:00:00  |
| staff.store2.grace@shiftsync.com | Riverside Staff Grace     | 0                    | None                   | Không có lịch rảnh    |


## 6. NGHỈ PHÉP, BLACKOUT DATES & NGÀY LỄ (TIME OFF)
### 6.1. Đơn xin nghỉ phép (Leave Requests)
| Email               | Họ Tên          | Từ Ngày    | Đến Ngày   | Loại Nghỉ | Trạng Thái | Lý Do                      |
| ------------------- | --------------- | ---------- | ---------- | --------- | ---------- | -------------------------- |
| emp13@shiftsync.com | Vu Quoc Viet    | 2026-09-10 | 2026-09-10 | EMERGENCY | REJECTED   | Viec ca nhan dot xuat      |
| emp08@shiftsync.com | Bui Quang Huy   | 2026-09-18 | 2026-09-19 | ANNUAL    | APPROVED   | Nghi phep viec gia dinh    |
| emp09@shiftsync.com | Ngo Van Nam     | 2026-09-21 | 2026-09-22 | SICK      | PENDING    | Nghi kham suc khoe dinh ky |
| emp07@shiftsync.com | Hoang Duc Thang | 2026-09-22 | 2026-09-22 | ANNUAL    | APPROVED   | Nghi phep ca nhan          |
| emp25@shiftsync.com | Luu Huu Yen     | 2026-09-22 | 2026-09-23 | ANNUAL    | APPROVED   | Nghi phep W39 (SCHED-04)   |


### 6.2. Ngày Blackout (Blackout Dates)
| Email               | Họ Tên           | Ngày Blackout | Lý Do                             |
| ------------------- | ---------------- | ------------- | --------------------------------- |
| emp08@shiftsync.com | Bui Quang Huy    | 2026-09-08    | Past Approved Leave               |
| emp08@shiftsync.com | Bui Quang Huy    | 2026-09-18    | Approved Annual Leave             |
| emp08@shiftsync.com | Bui Quang Huy    | 2026-09-19    | Approved Annual Leave             |
| emp07@shiftsync.com | Hoang Duc Thang  | 2026-09-22    | Approved Future Leave             |
| emp25@shiftsync.com | Luu Huu Yen      | 2026-09-22    | Approved Annual Leave W39         |
| emp25@shiftsync.com | Luu Huu Yen      | 2026-09-23    | Approved Annual Leave W39         |
| emp31@shiftsync.com | Bach Xuan Truong | 2026-09-25    | Personal Blackout Date (SCHED-04) |


### 6.3. Ngày Lễ (Holidays)
| Ngày Lễ    | Tên Ngày Lễ             | Hệ Số Lương | Holiday ID                           |
| ---------- | ----------------------- | ----------- | ------------------------------------ |
| 2026-01-01 | New Year's Day          | 2.00x       | f8000000-0000-0000-0000-000000000001 |
| 2026-04-30 | Reunification Day       | 3.00x       | f8000000-0000-0000-0000-000000000002 |
| 2026-05-01 | International Labor Day | 3.00x       | f8000000-0000-0000-0000-000000000003 |
| 2026-09-02 | Vietnam National Day    | 3.00x       | f8000000-0000-0000-0000-000000000004 |


## 7. QUẢN LÝ LỊCH CA & TỰ ĐỘNG XẾP CA (SHIFTS & SCHEDULES)
| Nhóm Tuần                                | Trạng Thái Ca | Số Lượng Ca | Số Slot Đã Gán Nhân Viên |
| ---------------------------------------- | ------------- | ----------- | ------------------------ |
| W37 (Lịch quá khứ cũ)                    | COMPLETED     | 13          | 26                       |
| W37 (Lịch quá khứ cũ)                    | CANCELLED     | 1           | 0                        |
| W38 (Lịch quá khứ đã hoàn thành)         | PUBLISHED     | 42          | 70                       |
| W39 (Lịch Tuần Này - Draft AutoSchedule) | DRAFT         | 38          | 127                      |


### 7.1. Chi tiết các ca DRAFT tuần W39 (Sẵn sàng chạy AutoScheduler)
> Tuần W39 bao gồm **28 ca tại Store 1 (84 slots)** và **3 ca tại Store 2 (18 slots)**, tất cả ở trạng thái `DRAFT` và `assigned_slots = 0`.
| Ngày Ca    | Chi Nhánh                 | Khung Giờ           | Trạng Thái | Yêu Cầu Vị Trí & Định Biên        |
| ---------- | ------------------------- | ------------------- | ---------- | --------------------------------- |
| 2026-09-21 | ShiftSync Flagship Store  | 06:00:00 - 14:30:00 | DRAFT      | Barista: 2, Cashier: 1, Waiter: 2 |
| 2026-09-21 | ShiftSync Flagship Store  | 07:00:00 - 15:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-21 | ShiftSync Flagship Store  | 10:00:00 - 18:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-21 | ShiftSync Flagship Store  | 14:30:00 - 22:30:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-21 | ShiftSync Flagship Store  | 18:00:00 - 23:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-21 | ShiftSync Riverside Store | 08:00:00 - 16:00:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-22 | ShiftSync Flagship Store  | 06:00:00 - 14:30:00 | DRAFT      | Barista: 2, Cashier: 1, Waiter: 2 |
| 2026-09-22 | ShiftSync Flagship Store  | 07:00:00 - 15:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-22 | ShiftSync Flagship Store  | 10:00:00 - 18:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-22 | ShiftSync Flagship Store  | 14:30:00 - 22:30:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-22 | ShiftSync Flagship Store  | 18:00:00 - 23:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-22 | ShiftSync Riverside Store | 08:00:00 - 16:00:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-23 | ShiftSync Flagship Store  | 06:00:00 - 14:30:00 | DRAFT      | Barista: 2, Cashier: 1, Waiter: 2 |
| 2026-09-23 | ShiftSync Flagship Store  | 07:00:00 - 15:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-23 | ShiftSync Flagship Store  | 10:00:00 - 18:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-23 | ShiftSync Flagship Store  | 14:30:00 - 22:30:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-23 | ShiftSync Flagship Store  | 18:00:00 - 23:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-23 | ShiftSync Riverside Store | 08:00:00 - 16:00:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-24 | ShiftSync Flagship Store  | 06:00:00 - 14:30:00 | DRAFT      | Barista: 2, Cashier: 1, Waiter: 2 |
| 2026-09-24 | ShiftSync Flagship Store  | 07:00:00 - 15:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-24 | ShiftSync Flagship Store  | 10:00:00 - 18:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-24 | ShiftSync Flagship Store  | 14:30:00 - 22:30:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-24 | ShiftSync Flagship Store  | 18:00:00 - 23:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-25 | ShiftSync Flagship Store  | 06:00:00 - 14:30:00 | DRAFT      | Barista: 2, Cashier: 1, Waiter: 2 |
| 2026-09-25 | ShiftSync Flagship Store  | 07:00:00 - 15:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-25 | ShiftSync Flagship Store  | 10:00:00 - 18:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-25 | ShiftSync Flagship Store  | 14:30:00 - 22:30:00 | DRAFT      | Barista: 2, Cashier: 2, Waiter: 2 |
| 2026-09-25 | ShiftSync Flagship Store  | 18:00:00 - 23:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-26 | ShiftSync Flagship Store  | 06:00:00 - 14:30:00 | DRAFT      | Barista: 3, Cashier: 1, Waiter: 2 |
| 2026-09-26 | ShiftSync Flagship Store  | 07:00:00 - 15:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-26 | ShiftSync Flagship Store  | 10:00:00 - 18:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-26 | ShiftSync Flagship Store  | 14:30:00 - 22:30:00 | DRAFT      | Barista: 3, Cashier: 2, Waiter: 2 |
| 2026-09-26 | ShiftSync Flagship Store  | 18:00:00 - 23:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-27 | ShiftSync Flagship Store  | 06:00:00 - 14:30:00 | DRAFT      | Barista: 3, Cashier: 1, Waiter: 2 |
| 2026-09-27 | ShiftSync Flagship Store  | 07:00:00 - 15:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-27 | ShiftSync Flagship Store  | 10:00:00 - 18:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |
| 2026-09-27 | ShiftSync Flagship Store  | 14:30:00 - 22:30:00 | DRAFT      | Barista: 3, Cashier: 2, Waiter: 2 |
| 2026-09-27 | ShiftSync Flagship Store  | 18:00:00 - 23:00:00 | DRAFT      | Barista: 1, Cashier: 1, Waiter: 1 |


## 8. DỮ LIỆU CHẤM CÔNG (ATTENDANCE & TIME TRACKING)
Tổng số bản ghi chấm công thực tế trong database: **62 bản ghi** (Tuần W38).

| Nhân Viên             | Ngày       | Ca Kế Hoạch         | Giờ Vào Thực Tế | Giờ Ra Thực Tế | Trạng Thái Chấm Công | Khoảng Cách GPS Tới Cửa Hàng |
| --------------------- | ---------- | ------------------- | --------------- | -------------- | -------------------- | ---------------------------- |
| Hoang Duc Thang       | 2026-09-07 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Nguyen Minh Anh       | 2026-09-07 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Doan Hai Dang         | 2026-09-07 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Pham Gia Huy          | 2026-09-07 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Bui Quang Huy         | 2026-09-08 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Tran Quoc Bao         | 2026-09-08 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Duong Minh Tri        | 2026-09-08 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Vo Minh Khang         | 2026-09-08 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Le Hoang Nam          | 2026-09-09 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Ngo Van Nam           | 2026-09-09 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Dang Tuan Kiet        | 2026-09-09 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Phan Thanh Tung       | 2026-09-09 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Hoang Duc Thang       | 2026-09-10 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Pham Gia Huy          | 2026-09-10 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Doan Hai Dang         | 2026-09-10 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Pham Gia Huy          | 2026-09-10 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Bui Quang Huy         | 2026-09-11 | 07:00:00 - 15:00:00 | 07:00:00        | 22:10:00       | EARLY_LEAVE          | 9.9m                         |
| Nguyen Minh Anh       | 2026-09-11 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Duong Minh Tri        | 2026-09-11 | 14:30:00 - 22:30:00 | 14:30:00        | 22:10:00       | EARLY_LEAVE          | 9.9m                         |
| Vo Minh Khang         | 2026-09-11 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Ngo Van Nam           | 2026-09-12 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Tran Quoc Bao         | 2026-09-12 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Dang Tuan Kiet        | 2026-09-12 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Phan Thanh Tung       | 2026-09-12 | 14:30:00 - 22:30:00 | 14:30:00        | 22:30:00       | PRESENT              | 9.9m                         |
| Hoang Duc Thang       | 2026-09-13 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Le Hoang Nam          | 2026-09-13 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Hoang Duc Thang       | 2026-09-14 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.9m                         |
| Nguyen Minh Anh       | 2026-09-14 | 07:00:00 - 15:00:00 | 07:12:00        | 15:00:00       | LATE                 | 9.9m                         |
| Riverside Staff Chris | 2026-09-14 | 07:00:00 - 15:00:00 | 07:00:00        | 15:00:00       | PRESENT              | 9.3m                         |
| Tran Quoc Bao         | 2026-09-14 | 10:00:00 - 18:00:00 | 10:00:00        | 18:00:00       | PRESENT              | 9.9m                         |

> *(Hiển thị mẫu 30 / 62 bản ghi chấm công thực tế tuần W38)*

### 8.1. Yêu cầu Giải trình / Điều chỉnh Chấm công (Attendance Adjustment Requests)
| Nhân Viên       | Ngày Ca    | Giờ Vào Đề Nghị           | Giờ Ra Đề Nghị            | Trạng Thái | Lý Do                                                       |
| --------------- | ---------- | ------------------------- | ------------------------- | ---------- | ----------------------------------------------------------- |
| Nguyen Minh Anh | 2026-09-07 | 2026-09-07 06:58:00+00:00 | 2026-09-07 15:02:00+00:00 | PENDING    | Ket xe do mua lon, co mat 06:58 nhung may cham cong bao loi |
| Tran Quoc Bao   | 2026-09-07 | 2026-09-07 07:00:00+00:00 | 2026-09-07 15:00:00+00:00 | APPROVED   | Quen quet the checkout khi het ca                           |
| Nguyen Minh Anh | 2026-09-07 | 2026-09-07 14:00:00+00:00 | 2026-09-07 22:30:00+00:00 | REJECTED   | Xin dieu chinh vi ly do ca nhan                             |


## 9. ĐỔI CA, NHẬN CA & ĐIỀU PHỐI LIÊN CHI NHÁNH (MARKETPLACE & WORKFORCE)
### 9.1. Yêu cầu đổi ca (Shift Swap Requests)
| Người Yêu Cầu   | Người Được Đề Nghị | Ca Của Người Yêu Cầu  | Ca Muốn Đổi           | Trạng Thái | Phản Hồi Đồng Nghiệp |
| --------------- | ------------------ | --------------------- | --------------------- | ---------- | -------------------- |
| Nguyen Minh Anh | Tran Quoc Bao      | 2026-09-14 (07:00:00) | 2026-09-14 (10:00:00) | PENDING    | Đã đồng ý            |
| Le Hoang Nam    | Pham Gia Huy       | 2026-09-14 (14:30:00) | 2026-09-14 (18:00:00) | PENDING    | Chờ phản hồi         |
| Vo Minh Khang   | Dang Tuan Kiet     | 2026-09-07 (07:00:00) | 2026-09-07 (14:30:00) | APPROVED   | Đã đồng ý            |


### 9.2. Yêu cầu Điều phối Nhân sự liên Chi nhánh (Workforce Requests)
| Chi Nhánh Yêu Cầu         | Chi Nhánh Hỗ Trợ          | Ngày Ca    | Khung Giờ Ca        | Trạng Thái       | Người Tạo Đơn       |
| ------------------------- | ------------------------- | ---------- | ------------------- | ---------------- | ------------------- |
| ShiftSync Flagship Store  | ShiftSync Riverside Store | 2026-09-07 | 07:00:00 - 15:00:00 | COMPLETED        | Store Manager Alice |
| ShiftSync Riverside Store | ShiftSync Flagship Store  | 2026-09-14 | 07:00:00 - 15:00:00 | MANAGER_REJECTED | Store Manager Bob   |
| ShiftSync Flagship Store  | ShiftSync Riverside Store | 2026-09-14 | 07:00:00 - 15:00:00 | PROPOSAL_SENT    | Store Manager Alice |
| ShiftSync Flagship Store  | ShiftSync Riverside Store | 2026-09-14 | 10:00:00 - 18:00:00 | PENDING          | Store Manager Alice |


## 10. KỲ LƯƠNG & BẢNG LƯƠNG (PAYROLL)
### 10.1. Các Kỳ lương (Payroll Periods)
| Chi Nhánh                 | Tên Kỳ Lương                | Từ Ngày    | Đến Ngày   | Trạng Thái | Số Phiếu Lương | Tổng Chi Phí Lương |
| ------------------------- | --------------------------- | ---------- | ---------- | ---------- | -------------- | ------------------ |
| ShiftSync Riverside Store | Kỳ 2026-08-01 -> 2026-08-31 | 2026-08-01 | 2026-08-31 | PAID       | 5              | 17,760 đ           |
| ShiftSync Flagship Store  | Kỳ 2026-08-01 -> 2026-08-31 | 2026-08-01 | 2026-08-31 | PAID       | 36             | 156,768 đ          |
| ShiftSync Flagship Store  | Kỳ 2026-09-01 -> 2026-09-30 | 2026-09-01 | 2026-09-30 | DRAFT      | 0              | 0 đ                |


### 10.2. Bảng lương chi tiết nhân viên (Mẫu 20 bản ghi)
| Nhân Viên        | Kỳ Lương                 | Tổng Giờ | Giờ OT | Giờ Lễ | Lương Cơ Bản | Lương OT | Lương Ngày Lễ | Tổng Thực Nhận |
| ---------------- | ------------------------ | -------- | ------ | ------ | ------------ | -------- | ------------- | -------------- |
| Ha Xuan Vinh     | 2026-08-01 -> 2026-08-31 | 160.0h   | 8.0h   | 8.0h   | 4,800 đ      | 360 đ    | 480 đ         | 5,640 đ        |
| Ta Tien Dat      | 2026-08-01 -> 2026-08-31 | 184.0h   | 0.0h   | 0.0h   | 5,520 đ      | 0 đ      | 0 đ           | 5,520 đ        |
| Le Hoang Nam     | 2026-08-01 -> 2026-08-31 | 184.0h   | 8.0h   | 0.0h   | 5,152 đ      | 336 đ    | 0 đ           | 5,488 đ        |
| Ngo Van Nam      | 2026-08-01 -> 2026-08-31 | 168.0h   | 8.0h   | 0.0h   | 5,040 đ      | 360 đ    | 0 đ           | 5,400 đ        |
| Nghiem Xuan Manh | 2026-08-01 -> 2026-08-31 | 176.0h   | 0.0h   | 0.0h   | 5,280 đ      | 0 đ      | 0 đ           | 5,280 đ        |
| Pham Gia Huy     | 2026-08-01 -> 2026-08-31 | 160.0h   | 0.0h   | 8.0h   | 4,800 đ      | 0 đ      | 480 đ         | 5,280 đ        |
| Nguyen Huu Phuc  | 2026-08-01 -> 2026-08-31 | 176.0h   | 0.0h   | 0.0h   | 5,280 đ      | 0 đ      | 0 đ           | 5,280 đ        |
| Mai Quoc Son     | 2026-08-01 -> 2026-08-31 | 176.0h   | 8.0h   | 0.0h   | 4,928 đ      | 336 đ    | 0 đ           | 5,264 đ        |
| Ly Hoang Phong   | 2026-08-01 -> 2026-08-31 | 184.0h   | 0.0h   | 0.0h   | 5,152 đ      | 0 đ      | 0 đ           | 5,152 đ        |
| Nguyen Van An    | 2026-08-01 -> 2026-08-31 | 184.0h   | 8.0h   | 0.0h   | 4,784 đ      | 312 đ    | 0 đ           | 5,096 đ        |
| Le Van Lam       | 2026-08-01 -> 2026-08-31 | 168.0h   | 0.0h   | 0.0h   | 5,040 đ      | 0 đ      | 0 đ           | 5,040 đ        |
| Dao Van Kien     | 2026-08-01 -> 2026-08-31 | 168.0h   | 8.0h   | 0.0h   | 4,704 đ      | 336 đ    | 0 đ           | 5,040 đ        |
| Bui Quang Huy    | 2026-08-01 -> 2026-08-31 | 160.0h   | 0.0h   | 8.0h   | 4,480 đ      | 0 đ      | 448 đ         | 4,928 đ        |
| Tran Thi Bich    | 2026-08-01 -> 2026-08-31 | 160.0h   | 0.0h   | 8.0h   | 4,480 đ      | 0 đ      | 448 đ         | 4,928 đ        |
| Phan Thanh Tung  | 2026-08-01 -> 2026-08-31 | 160.0h   | 8.0h   | 8.0h   | 4,160 đ      | 312 đ    | 416 đ         | 4,888 đ        |
| Hoang Duc Thang  | 2026-08-01 -> 2026-08-31 | 184.0h   | 0.0h   | 0.0h   | 4,784 đ      | 0 đ      | 0 đ           | 4,784 đ        |
| Vu Quoc Viet     | 2026-08-01 -> 2026-08-31 | 168.0h   | 0.0h   | 0.0h   | 4,704 đ      | 0 đ      | 0 đ           | 4,704 đ        |
| Tran Quoc Bao    | 2026-08-01 -> 2026-08-31 | 176.0h   | 0.0h   | 0.0h   | 4,576 đ      | 0 đ      | 0 đ           | 4,576 đ        |
| Trieu Quoc Cuong | 2026-08-01 -> 2026-08-31 | 160.0h   | 0.0h   | 8.0h   | 4,160 đ      | 0 đ      | 416 đ         | 4,576 đ        |
| Dang Tuan Kiet   | 2026-08-01 -> 2026-08-31 | 176.0h   | 8.0h   | 0.0h   | 4,224 đ      | 288 đ    | 0 đ           | 4,512 đ        |

> *(Hiển thị mẫu 20 / 41 phiếu lương đã tính toán)*

## 11. CẤU HÌNH THUẬT TOÁN TỰ ĐỘNG XẾP CA (SCHEDULER CONFIGURATION)
| Chi Nhánh                 | Trọng Số Công Bằng | Trọng Số Kỹ Năng | Trọng Số Giờ Làm | Trọng Số Giờ Nghỉ | Trọng Số Lịch Rảnh |
| ------------------------- | ------------------ | ---------------- | ---------------- | ----------------- | ------------------ |
| ShiftSync Flagship Store  | 10.0%              | 30.0%            | 20.0%            | 10.0%             | 30.0%              |
| ShiftSync Riverside Store | 10.0%              | 30.0%            | 20.0%            | 10.0%             | 30.0%              |


## 12. HƯỚNG DẪN KIỂM THỬ THỦ CÔNG (MANUAL QA TEST GUIDE)
### 12.1. Đăng nhập kiểm thử các Role & Chi nhánh
- **Admin:** `admin@shiftsync.com` / `Password123!` -> Truy cập toàn quyền Quản lý Chi nhánh, Cấu hình hệ thống, Audit.
- **Manager Chi nhánh 1:** `manager@shiftsync.com` / `Password123!` -> Xem & Xếp lịch Store Flagship, phê duyệt đổi ca, chấm công, tính lương.
- **Manager Chi nhánh 2:** `manager.store2@shiftsync.com` / `Password123!` -> Xem & Xếp lịch Store Riverside, test kịch bản thiếu nhân sự.
- **Nhân viên (Staff):** Đăng nhập bất kỳ email nào từ `emp01@shiftsync.com` đến `emp31@shiftsync.com`, `emp99@shiftsync.com` / `Password123!`.

### 12.2. Kiểm thử Tự động xếp ca (Auto-scheduler)
- **Bước 1:** Đăng nhập bằng `manager@shiftsync.com`.
- **Bước 2:** Vào màn hình **Lịch làm việc (Schedule)**, chọn tuần hiện tại (W39: `21/09/2026 - 27/09/2026`).
- **Bước 3:** Nhấn nút **Auto-schedule**. Thuật toán OptaPlanner / Solver sẽ phân bổ nhân sự vào 28 ca (84 slots) thỏa mãn 100% các ràng buộc cứng (Hard Constraints) và tối ưu điểm số mềm (Soft Constraints).
- **Bước 4:** Kiểm tra trực quan màu sắc ca theo tông **Pastel** cùng họa tiết sọc chéo `diagonal stripes` đặc trưng.

### 12.3. Kiểm thử Không gian 3D & Phân bổ Vị trí (3D Spatial Allocation)
- Mở tab/màn hình **3D Store Layout**, quan sát các Zone (Quầy Bar, Thu Ngân, Phục Vụ Ngoài Trời, v.v.) với kích thước WxLxH và tọa độ 3D thực tế.
- Nhân viên xếp ca sẽ hiển thị trực quan tại đúng Workstation và Zone tương ứng.
