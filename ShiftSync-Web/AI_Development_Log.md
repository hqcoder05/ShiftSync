# Báo Cáo Sử Dụng AI (AI Development Log) - ShiftSync Web

1. **Công cụ & Mô hình:** Claude (Anthropic - Claude 3.5 Sonnet).

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 07/08/2026.
   * **Mục tiêu:** Xây dựng khung kiến trúc SPA Layout (Header, Sidebar, MainLayout) và cấu hình Router tổng cho 5 phân hệ chức năng trên Web.
   * **Ngữ cảnh:** Dự án cần một cấu trúc layout đồng bộ, dễ mở rộng mã nguồn khi tích hợp các tính năng nghiệp vụ sâu hơn (Lịch làm việc, Điểm danh, Lương, Yêu cầu).

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Hướng dẫn cài react-router-dom, tạo cấu trúc thư mục pages/components/layouts, code Header/Sidebar/MainLayout, tạo 5 trang và nối route trong App.jsx bằng BrowserRouter/Routes/Route."*
   * **Prompt hiệu chỉnh:** *"Yêu cầu tổ chức Layout Route sử dụng Outlet để tối ưu hóa việc re-render các thành phần chung như Sidebar và Header khi chuyển đổi giữa các Route."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * Layouts & Components: `src/layouts/MainLayout.jsx`, `src/components/Header.jsx`, `src/components/Sidebar.jsx`.
   * Routing & App Shell: `src/App.jsx`.
   * Pages: `src/pages/DashboardPage.jsx`, `SchedulePage.jsx`, `AttendancePage.jsx`, `PayrollPage.jsx`, `RequestPage.jsx`.

5. **Kết quả AI trả về:**
   * Khung mã nguồn khởi tạo cho các Component và Page đại diện.
   * Cấu hình Route lồng (Nested Routing) hoàn chỉnh trong `App.jsx` sử dụng `BrowserRouter`, `Routes`, `Route`, và `Outlet`.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Giải pháp kiến trúc Layout Route dùng `<Outlet />` để nhúng các component con.
   * **Chỉnh sửa:** Chuẩn hóa lại tên Component và đường dẫn Route (`/schedule`, `/attendance`, `/payroll`, `/request`) để khớp chính xác với Design System trên Figma và tài liệu phân tích hệ thống.
   * **Loại bỏ:** Tối giản bớt các inline-style dư thừa do AI tự sinh ra, sẵn sàng cho việc tích hợp CSS/Tailwind đồng bộ ở giai đoạn sau.

7. **Lý do chỉnh sửa:**
   * Đảm bảo tính nhất quán về Naming Convention giữa Thiết kế (Figma), Mã nguồn (Codebase) và Cơ sở dữ liệu (Database Backend).
   * Tách biệt phần Routing logic và Styling để dễ bảo trì.

8. **Phương pháp kiểm thử & Xác minh:**
   * **Chạy runtime:** Chạy `npm run dev` trên môi trường Localhost (`http://localhost:5173/`).
   * **Kiểm thử luồng điều hướng:** Bấm chuyển đổi giữa 5 menu trên Sidebar, kiểm tra URL thanh địa chỉ và nội dung render tương ứng trong vùng `<main>`.
   * **Xác minh không lỗi:** Mở Developer Tools (F12) kiểm tra Tab Console, đảm bảo không có cảnh báo Red Flag hay React Warning về key/routing.

9. **Commit tương ứng:**
   * **Commit Hash:** `50b2cefc1a1c566265c92749843f88e2f1cf5034`
   * **Link Commit:** https://github.com/hqcoder05/ShiftSync/commit/9ebaf787a22bd6c539ef7223279f65da38a1e728

   ## Log #2 — Duyên — Màn hình Login Web

1. Công cụ: Claude (Anthropic)
2. Ngày - Mục tiêu: 08/08/2026 - Code hoàn chỉnh màn hình Login Web theo Figma (UI, validate, hiệu ứng tương tác)
3. Prompt: "Hướng dẫn tôi code component React cho màn hình Login (LoginPage.jsx), dựa theo ảnh thiết kế: card nền xanh mint #EAF6EA, input trắng, nút trắng, logo icon dạng thanh ngang màu xanh #4CAF50. Component cần: form input Email + Password, gọi API POST /api/auth/login, validate email/password bằng file dùng chung utils/validators.js để tái sử dụng logic này bên Mobile sau. Sau đó hướng dẫn thêm hiệu ứng tương tác: tách style ra file LoginPage.css riêng, input đổi viền xanh #51A33D khi hover/focus, nút Login khi hover đổi nền xanh + nổi lên (box-shadow, translateY) + hiệu ứng dải sáng quét ngang, dùng cubic-bezier cho chuyển động mượt, thu nhỏ nhẹ khi bấm giữ."
4. Response: AI trả về đầy đủ code LoginPage.jsx (form + gọi API + xử lý lỗi), utils/validators.js (3 hàm: validateEmail, validatePassword, validateLoginForm), LoginPage.css (style + hiệu ứng :hover/:focus/:active dùng transition và pseudo-element ::before cho hiệu ứng dải sáng), cập nhật route /login trong App.jsx
5. File liên quan: src/pages/LoginPage.jsx, src/pages/LoginPage.css, src/utils/validators.js, src/App.jsx
6. Phần chấp nhận/chỉnh sửa: Giữ nguyên toàn bộ cấu trúc và hiệu ứng AI đề xuất
7. Lý do chỉnh sửa: Không có, giữ nguyên bản AI đưa
8. Cách kiểm thử: npm run dev, vào /login, đối chiếu layout với ảnh Figma, test hover/focus/active bằng mắt, test đăng nhập với tài khoản test@shiftsync.com tạo qua Swagger
9. Commit: <điền hash thật sau khi push — lệnh: git log -1 --format="%H">

---

## Log #3 — Duyên — Sửa lỗi hiển thị index.css

1. Công cụ: Claude (Anthropic)
2. Ngày - Mục tiêu: 08/08/2026 - Sửa lỗi "2 đường kẻ dọc" hiển thị toàn trang
3. Prompt: "Trang web hiển thị 2 đường kẻ dọc ở 2 bên màn hình trên mọi trang, tìm nguyên nhân trong file index.css và sửa lại để layout phủ đúng 100% màn hình"
4. Response: Xác định nguyên nhân do file index.css mặc định của Vite có border-inline: 1px solid và width: 1126px cố định trên #root, đưa ra bản index.css đã xóa 2 dòng này, thêm box-sizing: border-box và body { margin: 0 }
5. File liên quan: src/index.css
6. Phần chấp nhận/chỉnh sửa: Giữ nguyên bản sửa AI đưa
7. Lý do chỉnh sửa: Không có
8. Cách kiểm thử: F5 lại trang Dashboard và /login, xác nhận hết đường kẻ dọc ở cả 2 trang
9. Commit:50b2cefc1a1c566265c92749843f88e2f1cf5034

----------------------------------------------------------------------------
## [2026-08-13] - Phát triển Module Employee UI (Web) & Availability UI (Mobile)

### 1. Mục tiêu
* **Employee UI (Web):** Tự thiết kế và lập trình giao diện Quản lý Nhân viên dựa trên Prototype Figma, triển khai các chức năng CRUD, phân trang, tìm kiếm và kết nối trực tiếp với REST API từ Backend.
* **Availability UI (Mobile):** Lập trình màn hình khai báo khung giờ rảnh theo tuần trên React Native (Expo), xử lý logic chọn slot linh hoạt và kết nối API lưu/hiển thị dữ liệu thật.

### 2. AI Prompt Log (Nhật ký tư vấn & hỗ trợ kĩ thuật từ AI)
* **Thao tác 1 (Employee UI - Web):**
  > "Tôi đã phân tích xong luồng Quản lý Nhân viên và chốt cấu trúc UI gồm Bảng danh sách, Ô tìm kiếm và Modal tạo/sửa. Hướng dẫn/gợi ý giúp tôi mẫu khung Component React (`EmployeeListPage`, `EmployeeModal`) kết nối với `employeeService` (Axios) sao cho tối ưu luồng re-render và quản lý State sạch nhất."
* **Thao tác 2 (Availability UI - Mobile):**
  > "Tôi đã thiết kế xong giao diện chọn khung giờ rảnh theo tuần trên Figma. Hướng dẫn tôi cách tổ chức State trong React Native để quản lý danh sách slot theo Thứ trong tuần (MON-SUN) và kết nối với API `saveWeeklyAvailability` đảm bảo trải nghiệm mượt mà trên Mobile."

### 3. Kết quả triển khai & Mã nguồn tạo dựng
* **Dự án Web (`ShiftSync-Web`):**
  * `src/services/employeeService.js`: Xây dựng các hàm gọi REST API (GET, POST, PUT, DELETE) cho Employee.
  * `src/components/Employee/EmployeeModal.jsx`: Modal popup xử lý form nhập/chỉnh sửa thông tin nhân viên.
  * `src/pages/EmployeeListPage.jsx`: Màn hình chính hiển thị danh sách, tích hợp phân trang và tìm kiếm real-time.
* **Dự án Mobile (`ShiftSync-Mobile`):**
  * `services/availabilityService.js`: Dịch vụ tích hợp API lịch rảnh theo tuần.
  * `screens/AvailabilityScreen.js`: Màn hình chọn khung giờ rảnh (Sáng/Chiều/Tối) dạng Tab Bar linh hoạt.

### 4. Checklist Kiểm thử & Ghi nhận Bug (Chuẩn bị test)
| ID Bug / Testcase | Mô tả kịch bản test | Mức độ | Trạng thái | Ghi chú / Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- |
| TC-EMP-01 | Kiểm tra tải danh sách nhân viên từ API thật (Web) | Normal | ⏳ Pending | Chờ kiểm thử khi Backend bật server |
| TC-EMP-02 | Tìm kiếm nhân viên theo tên/email (Web) | Normal | ⏳ Pending | Chờ test phản hồi ô tìm kiếm |
| TC-EMP-03 | Tạo/Sửa nhân viên qua Modal (Web) | High | ⏳ Pending | Chờ test submit form gửi dữ liệu lên DB |
| TC-AVL-01 | Tải lịch rảnh đã đăng ký theo tuần (Mobile) | Normal | ⏳ Pending | Chờ test hiển thị UI trên app Expo |
| TC-AVL-02 | Chọn ca rảnh & bấm Lưu thay đổi (Mobile) | High | ⏳ Pending | Chờ test gọi API lưu lịch rảnh |
-------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------
## [2026-08-23] - Hoàn thiện Module Quản lý Lịch làm việc (Schedule UI) & Tích hợp API Phân ca (Tuần 5)

1. **Công cụ & Mô hình:**
   * Google Antigravity / Gemini (Google) & Claude 3.5 Sonnet.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 23/08/2026.
   * **Mục tiêu:** Phát triển toàn diện giao diện Quản lý Lịch làm việc (`SchedulePage.jsx`, `SchedulePage.css`) chuẩn theo Prototype Figma, xây dựng tầng API `shiftService.js`, và hoàn thiện endpoint xử lý nghiệp vụ phân ca tại Spring Boot Backend (`ShiftController.java`, `ShiftService.java`).
   * **Ngữ cảnh:** Dự án bước vào giai đoạn then chốt (Tuần 5) cần màn hình phân ca trực quan (Timeline Grid), hỗ trợ xem theo Ngày/Tuần/Tháng, Mini Calendar chọn ngày nhanh, bộ lọc nhân viên theo cửa hàng/kỹ năng, và modal tạo/sửa/xóa ca làm việc trực tiếp.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Hướng dẫn xây dựng giao diện SchedulePage bằng React hiển thị bảng lịch phân ca theo nhân viên theo bản thiết kế Figma, có thanh timeline các ngày trong tuần, hiển thị ca trực theo màu sắc, modal thêm ca trực và tích hợp API với Spring Boot backend."*
   * **Prompt hiệu chỉnh:** *"Yêu cầu bổ sung Mini Calendar dropdown dạng popup chọn nhanh tuần/tháng, xử lý tính toán ngày bắt đầu/kết thúc tuần chuẩn ISO, xử lý phân quyền xem theo từng Store, và cập nhật DTO/Service phía Spring Boot backend để hỗ trợ CRUD ca trực đầy đủ các trường (startTime, endTime, storeId, employeeId, skillId, notes, color)."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * **Frontend (`ShiftSync-Web`):**
     * `src/pages/SchedulePage.jsx`: Toàn bộ logic giao diện, quản lý state lịch, timeline phân ca, mini calendar và modal thêm/sửa ca trực.
     * `src/pages/SchedulePage.css`: Bộ styling chi tiết, responsive timeline grid, màu sắc thẻ ca trực theo mã màu chuẩn Figma.
     * `src/services/shiftService.js`: Xây dựng các hàm gọi REST API (`getShiftsForStore`, `createShift`, `updateShift`, `deleteShift`).
     * `src/pages/EmployeesPage.jsx` & `SkillsPage.jsx`: Đồng bộ dữ liệu nhân viên và kỹ năng.
     * `src/assets/icons/`: Bổ sung các icon (`icon-ai.png`, `icon-credit-card.png`, `icon-user.png`, `location_on.png`).
   * **Backend (`shiftsync-backend`):**
     * `controller/ShiftController.java`: Cung cấp RESTful endpoints cho Shift CRUD.
     * `service/ShiftService.java`: Xử lý nghiệp vụ kiểm tra trùng ca, lưu trữ và mapping DTO.
     * `dto/ShiftCreateRequest.java` & `dto/ShiftDTO.java`: Định nghĩa cấu trúc dữ liệu truyền nhận.

5. **Kết quả AI trả về:**
   * Cung cấp giải pháp tính toán ngày/tuần theo chuẩn Monday-first (`getWeekDates`).
   * Mã nguồn hoàn chỉnh cho `SchedulePage.jsx` kết hợp bảng Timeline phân ca trực quan và Mini Calendar picker.
   * File `SchedulePage.css` chứa toàn bộ rules layout grid, flexbox, tooltip, badge trạng thái và hiệu ứng hover.
   * Module `shiftService.js` tương thích với Axios instance của dự án.
   * Mã nguồn backend xử lý logic nghiệp vụ phân ca tại `ShiftService.java`.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Thuật toán tính tuần, logic lọc ca trực theo nhân viên/cửa hàng, bảng mã màu pastel cho từng loại ca (`SHIFT_COLORS`), cấu trúc REST API backend.
   * **Chỉnh sửa:** Điều chỉnh định dạng hiển thị ngày sang tiếng Việt (`DOW_VI`), ánh xạ avatar nhân viên (`AVATAR_MAP`) tương thích với `EmployeesPage`, đồng bộ tên trường dữ liệu giữa Java DTO (`startTime`, `endTime`, `employeeName`) và React state.
   * **Loại bỏ:** Lược bỏ các thư viện lịch bên thứ 3 cồng kềnh (FullCalendar, React-Big-Calendar) để tự xây dựng Custom Calendar Grid thuần túy nhằm bám sát 100% UI Figma và tối ưu hiệu năng.

7. **Lý do chỉnh sửa:**
   * Đảm bảo tính nhất quán dữ liệu giữa Frontend và Backend DTO.
   * Tránh xung đột phụ thuộc (dependency conflict) khi sử dụng các thư viện ngoài không khớp với thiết kế giao diện của dự án.
   * Đảm bảo trải nghiệm người dùng (UX) mượt mà, ngôn ngữ hiển thị thuần Việt phù hợp với bài toán thực tế.

8. **Phương pháp kiểm thử & Xác minh:**
   * **Kiểm thử giao diện (UI/UX):** Khởi chạy `npm run dev`, truy cập `/schedule`, đối chiếu pixel-by-pixel từng thành phần (Header, Mini Calendar, Timeline Grid, Modal) với bản thiết kế Figma.
   * **Kiểm thử luồng tương tác:**
     * Thử nghiệm chuyển đổi qua lại giữa các tuần (Prev/Next/Today).
     * Bấm chọn ngày bất kỳ trên Mini Calendar dropdown để nhảy đến tuần tương ứng.
     * Mở modal thêm ca trực mới, nhập thông tin và kiểm tra hiển thị thẻ ca trên lưới timeline.
     * Chuyển đổi bộ lọc Store/Chi nhánh để kiểm tra lọc danh sách nhân viên tương ứng.
   * **Kiểm thử Console & Network:** Mở F12 kiểm tra không phát sinh React Warning/Error, các request API gửi đi đúng payload JSON.

9. **Commit tương ứng:**
   * **Commit Hash:** `28765c2b5dab17df199e5f2c517660e008e13a8e`
   * **Link Commit:** https://github.com/hqcoder05/ShiftSync/commit/28765c2b5dab17df199e5f2c517660e008e13a8e


