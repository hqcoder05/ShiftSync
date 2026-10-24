# SCHED-015 — Thiết kế lại giao diện Schedule

Ngày 20/10/2026. Branch `quoc-backend`, baseline `c9d4df1`. Theo yêu cầu dùng `design-taste-frontend` và `senior-frontend`, thiết kế lại phần lập lịch 2D ở `/schedule`, giữ nguyên màu nhận diện vị trí và sọc chéo của ô ca.

## Thay đổi

- Thêm tiêu đề điều hành và số liệu thật (nhân viên, số ca trong khoảng đang xem); gom hệ thống tab, chế độ ngày/tuần/3D/Planner, hành động và điều hướng ngày thành các tầng rõ ràng.
- Tinh chỉnh bảng phân công: cột nhân viên cố định khi cuộn ngang, khoảng hàng/cột rộng, tiêu đề ngày rõ, chú giải sọc chéo và trạng thái rỗng có hành động thêm nhân viên hoặc xóa bộ lọc.
- Màn hình hẹp dùng khoảng ngày rút gọn và cuộn ngang bên trong bảng; tăng chiều rộng mỗi ngày để giờ và vị trí trong ô ca đọc được. Các hộp thoại và bộ lọc dùng theme tokens, có focus ring.
- Không thay `getShiftPositionColor`, `ROLE_PASTEL_MAP`, `PRESET_COLORS` hoặc `repeating-linear-gradient` inline của ô ca. Chế độ 3D/Planner giữ layout toàn màn hình; tab Khả dụng giữ các màu vị trí và bố cục riêng của phân hệ đó.

## Đối chứng

- `npm run build` PASS (còn cảnh báo bundle >500kB đã có trước).
- Playwright tại 1920×1080 với session/API mock: 32 ô ca, 4 màu vị trí khác nhau và tất cả còn `repeating-linear-gradient`; không tràn ngang. Ngày ↔ Tuần và form thêm ca hoạt động. `?view=3d` ẩn header/footer và không cuộn tài liệu.
- Tại 390×844: document không tràn ngang, bảng cuộn nội bộ, nhãn giờ nằm trong chiều rộng ô ca. Trạng thái rỗng mở đúng form thêm nhân viên. Bộ lọc ở dark theme có chữ sáng trên nền tối.
- `npx eslint src/pages/SchedulePage.jsx` còn 28 errors + 1 warning trong file cũ, ở phần import/state/effect và handler trước đoạn render được sửa; không phát sinh báo lỗi ở JSX/CSS mới. `git diff --check` PASS.
- Ảnh kiểm tra cuối: `.playwright-mcp/schedule-redesign-final-1920.png`, `.playwright-mcp/schedule-redesign-mobile-final.png`. Tab Khả dụng chỉ hiển thị tiêu đề riêng của nó, không lặp tiêu đề board. Kiểm tra này dùng API/session mock, chưa kiểm chứng dữ liệu thực hoặc thiết bị cảm ứng thật.
