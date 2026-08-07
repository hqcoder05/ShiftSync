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
   * **Commit Hash:** `9ebaf787a22bd6c539ef7223279f65da38a1e728`
   * **Link Commit:** https://github.com/hqcoder05/ShiftSync/commit/9ebaf787a22bd6c539ef7223279f65da38a1e728