# FIX-040 — Hàng đợi xử lý Chấm công & Phép

Ngày 25/10/2026. Phạm vi là presentation của `AttendancePageLive`; không đổi endpoint, quyền hay luồng duyệt.

## Thay đổi

- Thay banner “đi trễ” dài bằng một hàng đợi điều hành compact chỉ hiện cho manager: đi trễ, thiếu check-out của ca đã qua, giải trình chờ duyệt và đơn nghỉ chờ duyệt.
- Mỗi ô là nút điều hướng tới vùng xử lý đúng. Ca đang diễn ra không bị suy diễn là thiếu check-out.
- Giữ bảng chấm công là nguồn dữ liệu chi tiết, còn hàng đợi chỉ tổng hợp các việc cần quyết định. Empty state có số `0`, không tạo cảnh báo giả.

## Kiểm chứng

- `npm run build` PASS ngày 25/10/2026; `git diff --check` không có lỗi whitespace (chỉ có cảnh báo chuyển LF/CRLF từ working tree).
- Chưa kiểm thử browser/Edge hoặc API Docker thật trong lượt này; số lượng queue phụ thuộc danh sách attendance, adjustments và leave đã tải từ backend.
