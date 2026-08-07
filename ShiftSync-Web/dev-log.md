# Developer Log - ShiftSync Web

## [Phase I] - Setup Architecture & Base Layout Routing
**Ngày thực hiện:** 07/08/2026  
**Nhánh Git:** `duyen-frontend`  
**Commit Hash:** `9ebaf787a22bd6c539ef7223279f65da38a1e728`

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