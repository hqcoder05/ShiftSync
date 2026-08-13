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