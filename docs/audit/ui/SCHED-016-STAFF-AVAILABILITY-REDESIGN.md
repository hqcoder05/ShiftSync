# SCHED-016 — Thiết kế lại Khả dụng nhân sự

Ngày: 20/10/2026. Phạm vi: tab `/schedule?tab=availability` và component `StaffAvailabilityPage` dùng độc lập.

## Thay đổi

- Đồng bộ phân cấp tiêu đề, thao tác cửa hàng/in/xếp ca, KPI, điều hướng tuần, bộ lọc, bảng ma trận và chế độ theo khung giờ với hệ giao diện Schedule. Lớp `staff-availability-redesign.css` nạp sau CSS nền, chỉ áp dụng `screen` để không đổi bản in.
- Responsive 390px: KPI hai cột, công cụ xuống dòng, ma trận cuộn ngang trong vùng bảng có thể focus bằng bàn phím. Trang không tràn ngang và cuộn được tới footer.
- Khi chưa có giờ đăng ký, KPI báo “Chưa có lịch rảnh” và có lời dẫn tương ứng, tránh hiển thị sai “100% Kín Lịch”. Khi có slot đã phân công, KPI báo “Đã phân bổ”.
- Giữ nguyên màu nhãn vị trí `.role-*` và màu trạng thái slot. Dọn import và hàm nhắc nhở giả không được gọi; không thay đổi API, backend hoặc dữ liệu.

## Đối chứng

- `npm run build`: PASS (Vite cảnh báo chunk lớn như trước).
- `npx eslint src/pages/StaffAvailabilityPage.jsx`: 0 lỗi, 5 cảnh báo `react-hooks/exhaustive-deps` có sẵn ở logic tải/tổng hợp dữ liệu.
- `git diff --check -- ShiftSync-Web/src/pages/StaffAvailabilityPage.jsx`: PASS. `git diff --check` toàn repo còn trailing whitespace ở file khác đang sửa dở, không thuộc SCHED-016.
- Playwright API/session mock: 1920×1080 sáng/tối và 390×844; trạng thái rỗng không hiện “100% Kín Lịch”; dữ liệu mẫu 3/6 nhân viên, 24 giờ và 3 slot; tìm tên trả 1 hàng, lọc đã nộp trả 3 hàng, chuyển hai view và đổi tuần/về tuần hiện tại đạt. Màu nhãn Pha chế/Thu ngân/Phục vụ/Bếp giữ nguyên; mobile `document.scrollWidth=390`, cuộn tới cuối được.

Giới hạn: test trình duyệt dùng API giả lập, chưa kiểm chứng backend thật hoặc luồng ghi phân ca. Không có commit/push.
