# SHIFTSYNC — MANUAL QA SCENARIO MATRIX

> **Tài liệu hướng dẫn Test Tay (Manual Testing) toàn diện trên Giao diện Web và Ứng dụng Mobile**  
> **Anchor Date môi trường:** `2026-09-17` (Thứ Năm, Tuần 38)  
> **Mật khẩu chung:** `password123`

---

## 1. NHÓM KỊCH BẢN XÁC THỰC & PHÂN QUYỀN (AUTH & RBAC)

### QA-AUTH-001: Đăng nhập đa vai trò (Multi-Role Login)
* **Role:** ADMIN / MANAGER / STAFF
* **Login Account:**
  * Admin: `admin@shiftsync.com`
  * Manager Store 1: `manager@shiftsync.com`
  * Staff: `emp01@shiftsync.com`
* **Precondition:** Hệ thống backend đang chạy trên port 8080, Frontend Web / Mobile đã kết nối.
* **Screen:** Màn hình Đăng nhập (Login Screen).
* **Action:**
  1. Nhập email và mật khẩu `password123`.
  2. Bấm nút **Đăng nhập** / **Sign In**.
* **Expected Result:**
  * Admin được chuyển hướng vào Dashboard Quản trị toàn hệ thống.
  * Manager Store 1 được chuyển vào Dashboard Quản lý ca của Store 1.
  * Staff được chuyển vào Màn hình Lịch làm việc cá nhân / Ca hôm nay trên Mobile/Web.
* **Relevant Seed Records:** `staff` (`ADMIN_ID`, `MGR_1_ID`, `10000000-...-0001`).

### QA-AUTH-002: Từ chối đăng nhập sai mật khẩu & tài khoản không tồn tại
* **Role:** GUEST / UNAUTHENTICATED
* **Screen:** Login Screen.
* **Action:**
  1. Nhập `admin@shiftsync.com` với mật khẩu sai `wrongpass`.
  2. Nhập email không tồn tại `unknown@shiftsync.com`.
* **Expected Result:**
  * Thông báo lỗi rõ ràng trên UI (Toast message): *Invalid email or password* (HTTP 401).
  * Không cho phép truy cập vào ứng dụng.

### QA-RBAC-001: Kiểm tra quyền truy cập Staff (Staff Privilege Boundary)
* **Role:** STAFF (`emp01@shiftsync.com`)
* **Precondition:** Đã đăng nhập bằng tài khoản Staff.
* **Screen:** Web Navigation Bar & Mobile Drawer.
* **Action:**
  1. Quan sát thanh điều hướng: Các menu Quản trị người dùng (`/users`), Cấu hình cửa hàng (`/stores`), Duyệt bảng lương toàn cửa hàng (`/payroll/generate`) không xuất hiện.
  2. Thử truy cập URL trực tiếp trên trình duyệt Web (ví dụ: `http://localhost:5173/admin/users` hoặc gọi API qua DevTools).
* **Expected Result:**
  * Giao diện chặn và chuyển hướng về trang 403 Forbidden hoặc trang chủ cá nhân.
  * API backend trả về đúng mã lỗi `403 Forbidden`.

### QA-RBAC-002: Kiểm tra tính cô lập dữ liệu cửa hàng (Store Isolation)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`) vs MANAGER Store 2 (`manager.store2@shiftsync.com`)
* **Precondition:** Cả hai Store đều có dữ liệu nhân sự, ca làm, bảng lương độc lập.
* **Screen:** Staff List, Shift Schedule, Payroll Screen.
* **Action:**
  1. Đăng nhập tài khoản `manager@shiftsync.com` (Store 1): Xem danh sách nhân viên và lịch ca.
  2. Đăng xuất, đăng nhập tài khoản `manager.store2@shiftsync.com` (Store 2): Xem danh sách nhân viên và lịch ca.
  3. Thử chuyển Store ID trên URL hoặc dropdown cửa hàng sang Store 1.
* **Expected Result:**
  * Manager Store 1 chỉ thấy 23 nhân viên Store 1 và ca của Store 1 (Flagship).
  * Manager Store 2 chỉ thấy 5 nhân viên Store 2 và ca của Store 2 (Riverside).
  * Manager Store 2 không thể xem hoặc chỉnh sửa dữ liệu Store 1; UI hiển thị thông báo không có quyền truy cập (HTTP 403 Forbidden).

---

## 2. NHÓM KỊCH BẢN QUẢN LÝ NHÂN SỰ & HỢP ĐỒNG (STAFF & EMPLOYMENT)

### QA-STAFF-001: Tìm kiếm, lọc và phân trang danh sách nhân sự (Search, Filter, Pagination)
* **Role:** ADMIN (`admin@shiftsync.com`) hoặc MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Danh sách Nhân viên (Staff Directory / Employee Management).
* **Action:**
  1. **Tìm kiếm theo tên:** Gõ `Minh Anh` vào ô tìm kiếm -> Xem kết quả.
  2. **Tìm kiếm theo email:** Gõ `emp05` -> Xem kết quả.
  3. **Lọc theo trạng thái:** Chọn filter `ACTIVE`, `INACTIVE`, `SUSPENDED`.
  4. **Kiểm tra phân trang:** Store 1 có 23 nhân viên, Store 2 có 5 nhân viên (tổng cộng 31 tài khoản). Chuyển giữa Trang 1 và Trang 2 (nếu page size là 10 hoặc 20).
* **Expected Result:**
  * Tìm kiếm tức thời và chính xác theo tên và email.
  * Lọc `INACTIVE` hiển thị đúng nhân viên cũ **Phạm Thị Cửu (emp21)**.
  * Lọc `SUSPENDED` hiển thị đúng nhân viên tạm đình chỉ **Trần Văn Định (emp22)**.
  * Phân trang chuyển mượt mà, không trùng lặp nhân sự giữa các trang.

### QA-STAFF-002: Chi tiết hồ sơ & Hạn dùng kỹ năng (Skill Expiration Display)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Chi tiết nhân viên (Staff Detail Screen).
* **Action:**
  1. Mở hồ sơ của **Đặng Tuấn Kiệt (emp06)**: Xem danh sách kỹ năng.
  2. Mở hồ sơ của **Võ Minh Khang (emp05)**: Xem danh sách kỹ năng.
* **Expected Result:**
  * Hồ sơ **emp06**: Kỹ năng *Barista* có nhãn cảnh báo **EXPIRED** (Hết hạn ngày `10/09/2026`).
  * Hồ sơ **emp05**: Kỹ năng *Barista* có nhãn cảnh báo **EXPIRING SOON** (Hết hạn ngày `20/09/2026`).
  * UI làm nổi bật màu đỏ/vàng giúp Quản lý nhận diện trực quan chứng chỉ cần gia hạn.

### QA-STAFF-003: Giới hạn hợp đồng Thực tập sinh (Intern Contract Constraint)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Hồ sơ **Nguyễn Văn Intern (emp99)**.
* **Action:**
  1. Xem loại hợp đồng (`Contract Type`): Hiển thị hợp đồng `Intern`.
  2. Xem định mức giờ: Tối đa `20.0 giờ/tuần` (Max Weekly Hours: 20h).

---

## 3. NHÓM KỊCH BẢN LẬP LỊCH CA & TỰ ĐỘNG XẾP CA (SHIFTS & AUTOSCHEDULER)

### QA-SHIFT-001: Điều hướng bảng lịch ca qua các tuần (Weekly Shift Roster Navigation)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Bảng Lịch Ca Làm Việc (Shift Schedule Board / Calendar View).
* **Action:**
  1. **Xem tuần trước (W37: 07/09 - 13/09):** Bấm mũi tên lùi tuần.
  2. **Xem tuần này (W38: 14/09 - 20/09):** Bấm nút *Hôm nay* hoặc mũi tên tới.
  3. **Xem tuần tới (W39: 21/09 - 27/09):** Bấm mũi tên tiến tuần tiếp theo.
* **Expected Result:**
  * **W37 (Lịch sử):** 14 ca ở trạng thái **COMPLETED** (Đã hoàn thành), có 1 ca chiều Chủ Nhật bị **CANCELLED** (Đã hủy).
  * **W38 (Hiện tại):** 28 ca ở trạng thái **PUBLISHED** (Đã công bố), các ca đều đã có nhân viên gán vị trí quầy Bar/Thu ngân.
  * **W39 (Tương lai):** 28 ca ở trạng thái **DRAFT** (Bản nháp), chưa gán nhân viên, sẵn sàng chạy xếp ca tự động.

### QA-SCHED-001: Chạy thuật toán tự động xếp ca (Trigger AutoScheduler)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Bảng Lịch Tuần W39 (`2026-09-21` đến `2026-09-27`).
* **Precondition:** Tuần W39 có 28 ca nháp chưa phân công.
* **Action:**
  1. Bấm nút **Tự động xếp ca** / **Auto Schedule**.
  2. Chọn phạm vi: Từ `2026-09-21` đến `2026-09-27`.
  3. Bấm **Bắt đầu** / **Run Scheduler**.
* **Expected Result:**
  * Hệ thống hiển thị loading và thông báo xếp ca thành công (HTTP 200).
  * 28 ca nháp được điền đầy đủ nhân viên có kỹ năng phù hợp.
  * Nguồn gán hiển thị nhãn **AUTO** (Tự động).

### QA-SCHED-002: Kiểm chứng ràng buộc Lịch rảnh (SCHED-01 Availability Check)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Bảng lịch W39 sau khi chạy AutoScheduler.
* **Action:**
  1. Kiểm tra lịch của **Lê Hoàng Nam (emp03)**: Chỉ rảnh T2, T4, T6.
  2. Kiểm tra lịch của **Võ Minh Khang (emp05)**: Chỉ rảnh buổi sáng (06:00 - 12:00).
  3. Kiểm tra lịch của **Trịnh Kim Tuấn (emp16)**: Chỉ rảnh cuối tuần (T7, CN).
* **Expected Result:**
  * **emp03** chỉ có ca vào Thứ Hai, Thứ Tư, Thứ Sáu. Không có ca nào vào Thứ Ba, Thứ Năm, Thứ Bảy, Chủ Nhật.
  * **emp05** chỉ được xếp vào ca Sáng (07:00 - 15:00). Hoàn toàn không bị xếp vào ca Chiều (14:30) hay ca Tối (18:00).
  * **emp16** chỉ được xếp vào các ca Thứ Bảy và Chủ Nhật.

### QA-SCHED-003: Kiểm chứng loại trừ Kỹ năng hết hạn (SCHED-04 Expired Skill Rejection)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Bảng lịch W39 sau khi chạy AutoScheduler.
* **Action:**
  1. Kiểm tra toàn bộ các ca yêu cầu vị trí **Barista**.
  2. Tìm xem **Đặng Tuấn Kiệt (emp06)** có bị xếp vào vị trí Barista hay không.
* **Expected Result:**
  * **emp06** tuyệt đối KHÔNG xuất hiện ở bất kỳ slot Barista nào (do chứng chỉ đã hết hạn ngày 10/09/2026).
  * **emp06** chỉ có thể được xếp vào vị trí Waiter (do kỹ năng Waiter còn hạn vĩnh viễn).

### QA-SCHED-004: Kiểm chứng loại trừ Đơn nghỉ phép đã duyệt (SCHED-03 Approved Leave Check)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Bảng lịch W38 (Tuần hiện tại).
* **Action:**
  1. Kiểm tra ngày Thứ Sáu `18/09/2026` và Thứ Bảy `19/09/2026`.
  2. Kiểm tra danh sách nhân sự được gán ca trong 2 ngày này.
* **Expected Result:**
  * **Bùi Quang Huy (emp08)** có đơn nghỉ phép được duyệt trong 2 ngày 18/09 và 19/09.
  * **emp08** hoàn toàn không có tên trong bất kỳ ca làm việc nào trong 2 ngày này.

### QA-SCHED-005: Kiểm chứng xử lý thiếu hụt nhân sự tại Store 2 (SCHED-06 Insufficient Staff)
* **Role:** MANAGER Store 2 (`manager.store2@shiftsync.com`)
* **Screen:** Bảng lịch W39 của Store 2 (`2026-09-21` đến `2026-09-23`).
* **Precondition:** Store 2 có 3 ca, mỗi ca yêu cầu 6 nhân sự (2 Barista + 2 Cashier + 2 Waiter), nhưng Store 2 chỉ có 4 nhân viên khả dụng.
* **Action:**
  1. Bấm **Tự động xếp ca** cho khoảng ngày `2026-09-21` đến `2026-09-23`.
* **Expected Result:**
  * Thuật toán chạy thành công, không bị crash hay báo lỗi 500.
  * Xếp tối đa 4 nhân sự khả dụng vào ca.
  * Còn lại 2 vị trí trống (Understaffed) hiển thị rõ trên UI để Quản lý đưa lên Chợ ca hoặc tạo Đơn mượn người liên cửa hàng.

---

## 4. NHÓM KỊCH BẢN KHÔNG GIAN 3D & PHÂN VÙNG CỬA HÀNG (3D SPATIAL ALLOCATION)

### QA-3D-001: Xem bản đồ mặt bằng và các vùng không gian 3D (Store Layout & 3D Zones)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Bản đồ Không gian Cửa hàng (3D Store Layout / Zone Viewer).
* **Action:**
  1. Mở màn hình bố trí cửa hàng Store 1.
  2. Tương tác với mô hình / danh sách phân vùng:
     * **Quầy Bar (Barista Counter):** Tọa độ `(x=2.5, y=3.0, z=0.0)`.
     * **Quầy Thu Ngân (Cashier Counter / POS):** Tọa độ `(x=6.0, y=3.0, z=0.0)`.
     * **Sảnh Tầng Trệt (Dining Hall Ground):** Tọa độ `(x=10.0, y=6.0, z=0.0)`.
     * **Khu Vực Gác Lửng (Mezzanine Lounge):** Tọa độ `(x=10.0, y=6.0, z=3.5)` - **Chiều cao z = 3.5m**.
     * **Sân Thượng Ngoài Trời (Outdoor Patio):** Tọa độ `(x=14.0, y=8.0, z=7.0)` - **Chiều cao z = 7.0m**.
* **Expected Result:**
  * Hiển thị đầy đủ 5 vùng không gian với kích thước và tọa độ thực tế.
  * Phân biệt rõ ràng các tầng không gian theo độ cao `z`.

### QA-3D-002: Kiểm tra phân bổ không gian tự động trong ca làm việc (Shift Zone Assignment)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Chi tiết ca làm việc (Shift Details Modal).
* **Action:**
  1. Chọn bất kỳ ca làm việc nào trong tuần W38 hoặc W39.
  2. Bấm vào từng nhân viên được phân công trong ca.
* **Expected Result:**
  * Mỗi nhân viên đều được gắn kèm một phân vùng cụ thể:
    * Nhân viên Barista được gắn vùng **Quầy Bar (Barista Counter)**.
    * Nhân viên Cashier được gắn vùng **Quầy Thu Ngân (Cashier Counter)**.
    * Nhân viên Waiter được gắn vùng **Sảnh Tầng Trệt** hoặc **Gác Lửng**.
  * Không có nhân viên nào bị thiếu thông tin khu vực làm việc.

---

## 5. NHÓM KỊCH BẢN ĐIỂM DANH & ĐIỀU CHỈNH ĐIỂM DANH (ATTENDANCE & ADJUSTMENTS)

### QA-ATT-001: Giám sát ca làm việc đang diễn ra (Live Checked-in Shift Monitoring)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Giám sát Điểm Danh (Live Attendance / Today's Shifts).
* **Precondition:** Anchor date là `2026-09-17 15:30` (Buổi chiều).
* **Action:**
  1. Mở màn hình điểm danh ca ngày hôm nay (`17/09/2026`).
  2. Xem ca Chiều (Afternoon Shift: 14:30 - 22:30).
* **Expected Result:**
  * Ca Chiều hiển thị trạng thái **Đang diễn ra (In Progress)**.
  * Nhân viên **Nguyễn Minh Anh (emp01)** có giờ vào lúc `14:28:00` (sớm 2 phút), tọa độ geofence chuẩn `(10.7768, 106.7008)`, giờ ra hiển thị dấu gạch ngang `--:--` (chưa check-out).
  * Nhân viên **Trần Quốc Bảo (emp02)** có giờ vào lúc `14:31:00` (đúng giờ), giờ ra `--:--`.

### QA-ATT-002: Kiểm tra các trạng thái điểm danh lịch sử (Present, Late, Early Leave)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Lịch sử Điểm danh (Attendance History).
* **Action:**
  1. Xem ca Sáng ngày Thứ Hai `14/09/2026`: Nhân viên vào lúc `07:12:00` -> Có tag màu vàng cam **LATE** (Đi muộn 12 phút).
  2. Xem ca Chiều ngày Thứ Sáu `11/09/2026`: Nhân viên về lúc `22:10:00` -> Có tag màu tím **EARLY_LEAVE** (Về sớm 20 phút).
  3. Xem các ca khác: Hiển thị tag màu xanh lá **PRESENT** (Đi làm đúng giờ).

### QA-ATT-003: Nộp và duyệt đơn khiếu nại điểm danh (Attendance Adjustment Flow)
* **Role:** STAFF (`emp01@shiftsync.com`) -> MANAGER (`manager@shiftsync.com`)
* **Action:**
  1. **Bước 1 (Staff):** Đăng nhập `emp01@shiftsync.com`. Vào mục *Khiếu nại điểm danh*, chọn ca làm việc ngày 14/09 (ca bị tính LATE), điền lý do: *"Quẹt thẻ bị lỗi máy đọc vân tay, thực tế có mặt lúc 06:58"*, bấm **Gửi đơn**.
  2. **Bước 2 (Manager):** Đăng nhập `manager@shiftsync.com`. Vào mục *Duyệt khiếu nại điểm danh*.
  3. Mở chi tiết đơn của `emp01`: Bấm nút **Chấp thuận (Approve)**.
* **Expected Result:**
  * Staff gửi đơn thành công, đơn có trạng thái **PENDING**.
  * Manager duyệt đơn thành công, trạng thái chuyển sang **APPROVED**.
  * Bản ghi điểm danh của ca đó được cập nhật lại giờ check-in hợp lệ.

---

## 6. NHÓM KỊCH BẢN QUẢN LÝ NGHỈ PHÉP (LEAVE REQUEST WORKFLOW)

### QA-LEAVE-001: Nộp đơn xin nghỉ phép (Staff Leave Submission)
* **Role:** STAFF (`emp05@shiftsync.com`)
* **Screen:** Đơn Nghỉ Phép (Leave Request Screen trên Web/Mobile).
* **Action:**
  1. Bấm nút **Tạo đơn xin nghỉ phép** / **New Leave Request**.
  2. Loại nghỉ phép: Chọn `Nghỉ phép năm (ANNUAL)`.
  3. Ngày bắt đầu: `2026-10-05`.
  4. Ngày kết thúc: `2026-10-06`.
  5. Lý do: *"Khám sức khỏe định kỳ"*.
  6. Bấm **Gửi đơn**.
* **Expected Result:**
  * Thông báo nộp đơn thành công (HTTP 201 Created).
  * Đơn xuất hiện trong danh sách *Đơn của tôi* với trạng thái **PENDING** (Chờ duyệt).

### QA-LEAVE-002: Kiểm tra chặn nộp đơn trùng ngày (Overlapping Leave Conflict Validation)
* **Role:** STAFF (`emp05@shiftsync.com`)
* **Screen:** Leave Request Screen.
* **Action:**
  1. Thực hiện tạo tiếp một đơn nghỉ phép mới cùng khoảng ngày `2026-10-05` đến `2026-10-06`.
  2. Bấm **Gửi đơn**.
* **Expected Result:**
  * Hệ thống chặn lại và báo lỗi: *Leave request dates overlap with existing leave request* (HTTP 409 Conflict).
  * Không tạo ra bản ghi trùng lặp trong cơ sở dữ liệu.

### QA-LEAVE-003: Quản lý duyệt đơn nghỉ phép (Manager Leave Approval)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Quản lý Nghỉ Phép (Leave Approval Screen).
* **Action:**
  1. Mở danh sách đơn nghỉ phép chờ duyệt: Thấy đơn của nhân viên `Võ Minh Khang (emp05)`.
  2. Bấm nút **Phê duyệt (Approve)**.
* **Expected Result:**
  * Trạng thái đơn đổi thành **APPROVED**.
  * Nhân viên nhận được thông báo: *"Đơn nghỉ phép của bạn đã được phê duyệt"*.

---

## 7. NHÓM KỊCH BẢN ĐỔI CA & CHỢ CA MỞ (SWAPS & OPEN SHIFTS)

### QA-SWAP-001: Quy trình đổi ca hoàn chỉnh 3 bước (Full Shift Swap Flow)
* **Role:** STAFF 1 (`emp01@shiftsync.com`) -> STAFF 2 (`emp02@shiftsync.com`) -> MANAGER (`manager@shiftsync.com`)
* **Action:**
  1. **Bước 1 (Staff 1 yêu cầu):** `emp01` chọn ca làm việc ngày 14/09, chọn đổi ca với đồng nghiệp `emp02` (cùng có kỹ năng phù hợp), bấm **Gửi yêu cầu đổi ca**.
  2. **Bước 2 (Staff 2 phản hồi):** `emp02` đăng nhập vào mục *Yêu cầu đổi ca*, thấy yêu cầu từ `emp01`, bấm nút **Đồng ý (Accept)**.
  3. **Bước 3 (Manager phê duyệt):** `manager@shiftsync.com` vào mục *Duyệt đổi ca*, thấy đơn đã được cả 2 nhân viên chấp thuận, bấm **Phê duyệt (Approve)**.
* **Expected Result:**
  * Lịch làm việc tự động hoán đổi tên nhân viên giữa 2 ca.
  * Cả 2 nhân viên đều nhận được thông báo cập nhật ca làm mới.

### QA-OPEN-001: Nhận ca làm mở trên Chợ ca (Claim Open Shift Marketplace)
* **Role:** STAFF (`emp05@shiftsync.com`)
* **Screen:** Chợ Ca Làm Việc (Open Shift Marketplace trên Mobile/Web).
* **Action:**
  1. Mở tab **Chợ ca** / **Marketplace**: Thấy ca làm việc mở ngày Thứ Sáu `18/09/2026` (Ca Midday: 10:00 - 18:00).
  2. Bấm nút **Nhận ca này** / **Claim Shift**.
* **Expected Result:**
  * Hệ thống ghi nhận yêu cầu nhận ca, chuyển trạng thái ca sang chờ quản lý duyệt hoặc tự động gán nếu thỏa mãn tiêu chí kỹ năng.

---

## 8. NHÓM KỊCH BẢN CHIA SẺ NHÂN SỰ LIÊN CỬA HÀNG (WORKFORCE SHARING)

### QA-WF-001: Store 1 yêu cầu mượn nhân sự từ Store 2 (Cross-Store Workforce Request)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Điều phối Nhân sự Liên chi nhánh (Workforce Sharing).
* **Action:**
  1. Chọn một ca thiếu người, bấm **Yêu cầu hỗ trợ từ cửa hàng khác**.
  2. Chọn cửa hàng mục tiêu: **Store 2 (Riverside Branch)**.
  3. Chọn kỹ năng cần: **Barista**.
  4. Bấm **Gửi yêu cầu**.
* **Expected Result:**
  * Store 1 ghi nhận đơn mượn người trong mục **Yêu cầu gửi đi (Outgoing Requests)**.

### QA-WF-002: Store 2 nhận yêu cầu và đề cử nhân sự (Nominate Staff)
* **Role:** MANAGER Store 2 (`manager.store2@shiftsync.com`)
* **Screen:** Workforce Sharing Screen.
* **Action:**
  1. Đăng nhập tài khoản Manager Store 2.
  2. Vào mục **Yêu cầu nhận được (Incoming Requests)**: Thấy đơn từ Flagship Store (Store 1).
  3. Bấm **Đề cử nhân sự**: Chọn nhân viên **Riverside Staff Chris (S2_01)**.
  4. Bấm **Gửi đề cử**.
* **Expected Result:**
  * Đơn chuyển sang trạng thái **PROPOSAL_SENT**.
  * Nhân viên Chris nhận được đề xuất trong danh sách `workforce-proposals`.

---

## 9. NHÓM KỊCH BẢN BẢNG LƯƠNG & XUẤT BÁO CÁO (PAYROLL & EXPORTS)

### QA-PAY-001: Xem danh sách kỳ lương & Chi tiết lương Tháng 08/2026
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Bảng Lương Cửa Hàng (Store Payroll Screen).
* **Action:**
  1. Mở màn hình Bảng lương: Thấy 2 kỳ lương:
     * Kỳ Tháng 08/2026: Trạng thái **PAID** (Đã thanh toán).
     * Kỳ Tháng 09/2026: Trạng thái **DRAFT** (Bản nháp).
  2. Bấm vào kỳ lương Tháng 08/2026: Xem danh sách chi tiết.
* **Expected Result:**
  * Hiển thị đầy đủ **23 phiếu lương** của toàn bộ nhân viên Store 1.
  * Hiển thị chi tiết: Tổng giờ làm (160h), Giờ tăng ca (OT), Mức lương cơ bản theo hợp đồng, Tổng thu nhập thực nhận.

### QA-PAY-002: Tải phiếu lương điện tử PDF thật (Download Digital Payslip PDF)
* **Role:** STAFF (`emp01@shiftsync.com`)
* **Screen:** Phiếu lương của tôi (My Payslips trên Web/Mobile).
* **Action:**
  1. Mở phiếu lương kỳ Tháng 08/2026.
  2. Bấm nút **Tải PDF** / **Download Payslip**.
* **Expected Result:**
  * Trình duyệt tự động tải xuống file `payslip_e2000000-0000-0000-0001-000000000001.pdf`.
  * Mở file PDF: Có định dạng chuẩn, hiển thị logo ShiftSync, thông tin nhân viên Nguyễn Minh Anh, chi tiết giờ công và số tiền lương được tính toán chính xác.

### QA-PAY-003: Quản lý xuất bảng lương ra file Excel thật (Export Store Payroll to Excel)
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Payroll Screen.
* **Action:**
  1. Tại kỳ lương Tháng 08/2026, bấm nút **Xuất báo cáo Excel** / **Export to Excel**.
* **Expected Result:**
  * Trình duyệt tải xuống file `payroll_report_...xlsx` định dạng Microsoft Excel chuẩn OpenXML (kích thước > 5KB).
  * Mở file trong Microsoft Excel / Google Sheets: Hiển thị bảng tổng hợp lương 23 nhân sự, các cột số liệu rõ ràng và công thức tính chính xác.

---

## 10. NHÓM KỊCH BẢN BẢNG ĐIỀU KHIỂN & BIỂU ĐỒ (DASHBOARD & ANALYTICS)

### QA-DASH-001: Kiểm tra các chỉ số KPI trên Dashboard
* **Role:** MANAGER Store 1 (`manager@shiftsync.com`)
* **Screen:** Trang Chủ Quản Lý (Manager Dashboard).
* **Action:**
  1. Xem thẻ chỉ số **Chuyên cần (Attendance Metrics)**: Tỷ lệ đi muộn (`lateRate`), Tỷ lệ vắng mặt (`absentRate`).
  2. Xem thẻ chỉ số **Lập lịch (Scheduling Metrics)**: Tỷ lệ lấp đầy ca (`coverage %`), Số ca mở cần người (`openShiftCount`).
  3. Xem thẻ chỉ số **Chi phí lao động (Payroll Metrics)**: Tổng chi phí nhân sự tháng qua, số giờ công tích lũy.
  4. Xem **Biểu đồ thời gian (Time-series Chart)**: Biểu đồ cột/đường trực quan hóa chi phí và giờ công qua các kỳ.
* **Expected Result:**
  * Các thẻ KPI đều có số liệu thực tế, **TUYỆT ĐỐI KHÔNG CÓ THẺ NÀO BỊ TRẮNG HOẶC HIỂN THỊ NaN**.
  * Biểu đồ thời gian hiển thị điểm dữ liệu rõ ràng của kỳ lương Tháng 8.

---

## 11. NHÓM KỊCH BẢN TRẠNG THÁI RỖNG & THÔNG BÁO (EMPTY STATES & NOTIFICATIONS)

### QA-EMPTY-001: Kiểm tra giao diện trạng thái rỗng (Empty State Testing)
* **Role:** MANAGER Store 2 (`manager.store2@shiftsync.com`)
* **Screen:** Marketplace ca mở hoặc Khiếu nại điểm danh Store 2.
* **Action:**
  1. Đăng nhập Store 2 và mở màn hình Chợ ca mở.
* **Expected Result:**
  * Store 2 chưa có ca mở nào -> Giao diện hiển thị Empty State thân thiện: *"Hiện tại không có ca làm việc mở nào cần nhận"*, có hình minh họa và không bị lỗi vỡ layout.

### QA-NOTIF-001: Trung tâm thông báo & Đánh dấu đã đọc (Notification Center)
* **Role:** STAFF (`emp01@shiftsync.com`)
* **Screen:** Chuông Thông Báo (Notification Bell).
* **Action:**
  1. Bấm vào biểu tượng quả chuông: Hiển thị badge số thông báo chưa đọc (ví dụ: `1`).
  2. Xem danh sách thông báo: Có thông báo nhắc ca làm việc, thông báo công bố lịch ca.
  3. Bấm vào một thông báo: Badge giảm đi 1, thông báo chuyển sang màu đã đọc.
  4. Bấm nút **Đánh dấu tất cả đã đọc (Mark all as read)**.
* **Expected Result:**
  * Badge biến mất, tất cả thông báo chuyển sang trạng thái đã đọc mượt mà.
