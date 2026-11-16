# FIX-037: Skeleton thay cho spinner toàn màn hình

## Vấn đề

Spinner toàn màn hình không thể hiện cấu trúc nội dung đang tải và làm ứng dụng có cảm giác bị treo khi mạng chậm.

## Sửa đổi

- Tạo `ContentSkeleton` có nhịp mờ nhẹ, tôn trọng cài đặt giảm chuyển động của thiết bị.
- Dùng skeleton khi lazy-load màn hình, ở Thông báo và Chấm công.
- Giữ spinner nhỏ cho hành động cục bộ như gửi, lưu hoặc làm mới để không che toàn bộ màn hình.

## Kiểm tra

- Export Expo Web để xác nhận bundle Mobile thành công.
