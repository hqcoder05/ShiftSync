# FIX-042 — Dashboard tập trung điều hành

Ngày 25/10/2026.

## Thay đổi

- Dashboard vẫn giữ KPI theo ngày, lịch trực, yêu cầu ưu tiên, lối tắt Schedule/3D/Attendance.
- Khối điểm danh không còn lặp toàn bộ danh sách check-in/check-out từ trang Chấm công. Nó chỉ hiển thị ngoại lệ cần rà soát: đi trễ và vắng mặt.
- Khi không có ngoại lệ, empty state nói rõ đây là trạng thái tốt; liên kết vẫn mở bảng chấm công đầy đủ khi cần điều tra.

## Kiểm chứng

- `npm run build` PASS ngày 25/10/2026.
- Chưa kiểm viewport/Edge hoặc API Docker thật cho biến thể có đi trễ, vắng mặt và dữ liệu rỗng.
