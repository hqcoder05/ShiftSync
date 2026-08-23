# Developer Log - ShiftSync Web

## [Phase I] - Setup Architecture & Base Layout Routing
**Ngày thực hiện:** 07/08/2026  
**Nhánh Git:** `duyen-frontend`  
**Commit Hash:** `50b2cefc1a1c566265c92749843f88e2f1cf5034`

---

### 1. Công việc đã thực hiện
* Khởi tạo dự án Web Frontend sử dụng **Vite + React Core**.
* Xây dựng luồng Điều hướng (Routing system) sử dụng `react-router-dom` (v6) với kiến trúc **Nested Routes**.
* Thiết lập cấu trúc thư mục chuẩn cho dự án SPA: `src/components`, `src/layouts`, `src/pages`.
* Xây dựng `MainLayout` tích hợp các thành phần tái sử dụng: `Header` và `Sidebar` điều hướng.
* Khởi tạo 5 module trang chính theo yêu cầu Figma: `DashboardPage`, `SchedulePage`, `AttendancePage`, `PayrollPage`, `RequestPage`.
* Đã kiểm thử giao diện tĩnh và luồng render component trên môi trường local, commit và push thành công lên GitHub repository.

---

### 2. Vấn đề Kỹ thuật & Giải pháp (Technical Challenge)
* **Vấn đề:** Trong quá trình thiết lập React Router v6, cần đảm bảo các trang con (`pages`) được render linh hoạt bên trong khung `MainLayout` mà không làm re-render lại thành phần `Header` và `Sidebar` khi chuyển trang.
* **Giải pháp:** Áp dụng pattern **Layout Route** kết hợp với thẻ `<Outlet />` của `react-router-dom`. Việc này giúp giữ nguyên trạng thái khung giao diện chung, tối ưu hiệu năng render của DOM tree và chuẩn hóa cấu trúc ứng dụng.

---

### 3. Kế hoạch tiếp theo
* Kiểm tra và chốt trạng thái dự án `ShiftSync-Mobile` trên repository nhóm.
* Chuyển sang **Phase III**: Xây dựng UI & Form Handling cho màn hình Authentication (Login/Register) trên cả 2 nền tảng Web và Mobile.
------------------------------------------------------------------------

# log 2

Ngày: 08/08/2026
Việc đã làm: Code hoàn chỉnh màn hình Login Web (form, validate, kết nối API auth thật), thêm
hiệu ứng hover/focus/active cho input và nút Login, sửa lỗi index.css gây hiển thị đường kẻ
dọc toàn trang
Vấn đề gặp phải: index.css mặc định của Vite có border-inline + width cố định trên #root gây
lỗi hiển thị viền dọc ở mọi trang, đã xóa 2 dòng đó để layout phủ đúng 100% màn hình
Kế hoạch tiếp theo: Sang Mục IV - Test API Auth đầy đủ bằng Postman, ghi Auth_Test_Report.md

----------------------------------------------------------------------------------------------
## [2026-08-23] - Nhật ký Phát triển Frontend Web & Backend API (Tuần 5)

### 📌 Tính năng: Reports / Staff Requests Management & Backend API Integration (Quản lý Yêu Cầu & Duyệt Chợ Ca)
* **Người thực hiện:** Duyên (Frontend & Fullstack)
* **Mục tiêu:** Phát triển toàn diện giao diện Quản lý Yêu cầu & Duyệt Chợ ca (`RequestPage.jsx`, `RequestPage.css`) theo tài liệu `Duyệt Chợ ca.docx` và mockup Figma; xây dựng module Backend Spring Boot REST API (`/api/requests`) với Flyway Migration V10 kết nối CSDL PostgreSQL; cập nhật `requestService.js` gọi API thật.
* **Nhánh Git:** `duyen-frontend`
* **Commit Hash:** `1956e82`

---

#### 🔨 1. Công việc đã thực hiện:
1. **Phát triển Giao diện Quản lý Yêu cầu (`RequestPage.jsx`, `RequestPage.css`):**
   * Thiết kế Thanh công cụ Capsule bo tròn (`border-radius: 9999px`) tích hợp:
     * Nút Lịch tuần màu xanh ngọc (`#ccfbf1`, `#0f766e`) kèm Mini-Calendar popover.
     * Vạch phân cách `|`.
     * Nút **"Tạo yêu cầu"** tone màu vàng hổ phách sang trọng (`#FEF3C7`, `#FDE68A`, `#92400E`) kèm icon xoay khi hover.
   * Xây dựng Bảng dữ liệu Yêu cầu sạch đẹp: Hiển thị đầy đủ Avatar người gửi, cột Trạng thái dạng chữ thuần gọn gàng (`Đã phê duyệt`, `Đã từ chối`, `Đang chờ phê duyệt`), loại bỏ các chấm màu và khung viền thừa.
   * Xây dựng bộ lọc thông minh (Checkbox loại yêu cầu, Checkbox trạng thái duyệt, Smart Search tìm kiếm tức thì theo từ khóa).
   * Xây dựng Modal xem chi tiết và phê duyệt/từ chối trực tiếp.
   * Xây dựng Modal Tạo yêu cầu hỗ trợ gửi đến Quản lý chi nhánh khác (`Target Store`).
   * Tinh chỉnh Navbar chung (`Header.jsx`, `Header.css`): Đặt box active màu đen `#1E1E1E`, phóng to icon Reports.
2. **Xây dựng Module Backend Spring Boot (`shiftsync-backend`):**
   * Viết Flyway Migration `V10__create_staff_requests_table.sql` khởi tạo bảng `staff_requests` kèm 3 Index tối ưu truy vấn.
   * Tạo JPA Entity `StaffRequest.java`, DTOs (`StaffRequestDTO`, `StaffRequestCreateDTO`, `StaffRequestStatusUpdateDTO`), Repository `StaffRequestRepository.java`.
   * Xây dựng Service `StaffRequestService.java` xử lý nghiệp vụ duyệt/từ chối và nạp dữ liệu mẫu ban đầu.
   * Xây dựng Controller `StaffRequestController.java` cung cấp đầy đủ REST API: `GET /api/requests`, `POST /api/requests`, `PUT /api/requests/{id}/status`.
3. **Tích hợp Tầng Dịch vụ Frontend (`requestService.js`):**
   * Kết nối Axios instance gọi trực tiếp API Backend thật kèm cơ chế sao lưu `localStorage` an toàn.

---

#### 💡 2. Vấn đề Kỹ thuật & Giải pháp (Technical Challenge):
* **Vấn đề:** Đảm bảo hệ thống hoạt động liên tục (zero downtime), cho phép người dùng kiểm thử giao diện mượt mà ngay cả khi môi trường Backend CSDL đang bảo trì hoặc chưa khởi động.
* **Giải pháp:** Áp dụng mô hình **Dual Persistence Layer** trong `requestService.js`: ưu tiên gọi REST API thật từ Backend Spring Boot; nếu mạng gián đoạn hoặc máy chủ chưa bật, hệ thống tự động fallback đọc/ghi đệm từ `localStorage` mà không làm crash hay gián đoạn trải nghiệm người dùng.

---

#### 🚀 3. Kế hoạch tiếp theo:
* Kết nối luồng gửi yêu cầu ca làm từ ứng dụng Mobile (`ScheduleScreen.js` / `RequestScreen.js`) truyền thẳng lên Web Quản lý để duyệt ca tức thì theo thời gian thực.