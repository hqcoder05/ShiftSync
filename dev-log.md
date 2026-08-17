Ngày: 09/08/2026
Việc đã làm: Test đầy đủ 9 test case API Auth (register, login, refresh token) bằng Postman,
kết quả 9/9 Pass, không phát hiện bug. Ghi vào Auth_Test_Report.md
Vấn đề gặp phải: Backend không khởi động được do JWT_SECRET chưa có trong .env và mật khẩu
Postgres không khớp do container cũ còn dữ liệu volume cũ; đã tạo lại .env đúng và chạy
docker compose down -v để reset volume, backend chạy thành công
Kế hoạch tiếp theo: Tuần 3 hoàn thành trọn 4 mục, chuẩn bị Tuần 4 (Employee/Role/Availability/
Store module)
----------------------------------------------------------------------------
## [2026-08-13] - Nhật ký Phát triển Frontend Web (Tuần 4)

### 📌 Tính năng: Employee Management UI (Quản lý Nhân viên)
* **Người thực hiện:** Duyên (Frontend & UX/UI)
* **Mục tiêu:** Xây dựng giao diện Quản lý Nhân viên kết nối API thật (phân trang, tìm kiếm, CRUD).

#### 🔨 Danh sách công việc đã hoàn thành:
1. **Khởi tạo API Service (`src/services/employeeService.js`):**
   * Định nghĩa các phương thức kết nối Backend API: `getEmployees`, `getEmployeeById`, `createEmployee`, `updateEmployee`, `deleteEmployee`.
2. **Xây dựng Component Modal Form (`src/components/Employee/EmployeeModal.jsx`):**
   * Thiết kế form tái sử dụng cho cả 2 thao tác Thêm mới và Chỉnh sửa nhân viên.
   * Xử lý lưu state nội bộ (`formData`) và validation trước khi submit.
3. **Dựng Trang Danh sách (`src/pages/EmployeeListPage.jsx`):**
   * Thiết kế Bảng hiển thị thông tin: ID, Họ tên, Email, Số điện thoại, Chức vụ, Cửa hàng.
   * Tích hợp thanh tìm kiếm real-time và bộ phân trang (Pagination).
   * Xử lý gọi API thật qua `useEffect`, tự động refresh dữ liệu khi tạo/sửa thành công.