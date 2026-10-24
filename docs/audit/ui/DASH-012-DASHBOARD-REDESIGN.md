# DASH-012 — Thiết kế lại Dashboard vận hành

Ngày: 20/10/2026. Branch `quoc-backend`, baseline `c9d4df1`. Phạm vi: giao diện Web `/dashboard` và `/`.

## Kết quả

- Bố cục mới đặt ngữ cảnh cửa hàng, hành động mở không gian 3D và phân công ca ở đầu trang; dải lọc ngày/nhân viên/xuất CSV ở hàng riêng.
- Bốn thẻ chỉ số phân biệt lượt phân công, yêu cầu, điểm danh và **dự toán** nhân công. Thẻ phân công không còn báo độ phủ 100% khi ngày không có ca. Từ “lượt phân công” khớp số dòng nhân sự trong timeline; lịch xếp được tách rõ khỏi điểm danh thực tế.
- Lịch phân công, sơ đồ mặt bằng, hàng đợi duyệt và điểm danh cùng tầng nội dung. Biểu đồ 7 ngày nằm ở tầng kế tiếp; khi chưa có số liệu sẽ có trạng thái rỗng và lối vào lịch làm việc, thay cho đồ thị 0 kéo dài.
- Thẻ yêu cầu có tên tác vụ riêng cho nút Duyệt/Từ chối để điều hướng bằng bàn phím và công cụ hỗ trợ. Hai cặp nút đổi dạng lịch/biểu đồ dùng `aria-pressed`. Bố cục hỗ trợ 1920, 1440 và 390 px, palette sáng/tối, `prefers-reduced-motion`.
- Sửa lời dẫn của timeline ngày khác để không gọi nhầm “hôm nay”.

## Nguồn và hợp đồng đã tái sử dụng

- `ShiftSync-Web/src/pages/DashboardPage.jsx` tiếp tục lấy store, shifts, attendance, skills, requests, layout/zones qua các service hiện có và đưa về `Dashboard` data contract. Luồng optimistic approval/rollback, date/employee filter và CSV được giữ.
- `Dashboard.jsx` tổ chức lại nội dung; `dashboard-redesign.css` chỉ bổ sung lớp trình bày sau `dashboard.css` đang giữ theme tokens, chart/timeline/spatial styles. `ShiftTimeline.jsx` chỉ đổi nhãn trạng thái rỗng.
- Dựa trên NAV-011 (Navbar + store context), EXPLORER-013 (`/schedule?view=3d`) và CODEBASE_MAP cho nguồn dữ liệu Spatial. Không đổi backend, database, dependency hoặc asset 3D.

## Đối chứng

- `npm run build`: PASS (2633 modules, 935 ms ở lần build đầu; cảnh báo chunk >500 kB vốn có).
- ESLint riêng `Dashboard.jsx` và `ShiftTimeline.jsx`: PASS. `DashboardPage.jsx` còn lỗi lint có sẵn tại effect gọi `reloadLiveData`; task này không sửa nguồn dữ liệu đó.
- `scripts/test-dashboard-redesign.browser.cjs`: **24/24** kiểm tra trên ứng dụng routed thật, API/session trong trang được mock. Bao gồm dữ liệu có ca/yêu cầu/điểm danh và rỗng, 1920×1080, 1440×900, 390×844, light/dark, tab lịch/sơ đồ/biểu đồ, employee filter, CSV, ngày trước/sau, URL 3D, duyệt nghỉ phép; không có page error. Lệnh PUT duyệt chỉ đi vào route mock, không ghi backend.
- Ảnh: `.playwright-mcp/dashboard-redesign-preview.png` (viewport 1920), `dashboard-redesign-populated.png` (toàn trang có dữ liệu), `dashboard-redesign-empty-wide.png`, `dashboard-redesign-mobile.png`, `dashboard-redesign-dark.png`.

## Giới hạn

- Chưa đối chứng phiên đăng nhập/API thật. Nếu các API cũ lỗi, `DashboardPage` có thể giữ danh sách rỗng mà chưa hiển thị lý do; task này tập trung giao diện.
- Dự toán nhân công vẫn dùng công thức đã có trong `DashboardPage` (giờ xếp trong ngày × 30.000 đ), không phải bảng lương thực tế.
- Chưa kiểm tra bằng screen reader hoặc thiết bị cảm ứng thật. Cảnh báo bundle lớn của ứng dụng chưa được xử lý trong phạm vi này.
