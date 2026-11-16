# FIX-033: Thư viện mẫu ca

## Vấn đề

Màn Mẫu ca chỉ là bảng và biểu mẫu cơ bản, chưa cho biết số mẫu đang dùng, mức phù hợp với giờ hoạt động, hay trạng thái khi chưa có dữ liệu/lỗi tải. Lỗi nhập liệu chỉ hiện qua toast nên khó nhận ra ngữ cảnh cần sửa.

## Thiết kế

- Giữ bảng dữ liệu làm trung tâm, thêm một dải tóm tắt nhỏ thay vì chồng nhiều thẻ.
- Đưa biểu mẫu vào luồng tạo/chỉnh sửa rõ ràng, với xem trước thời lượng và lỗi ngay dưới trường dữ liệu.
- Bổ sung skeleton, empty state, error state, phản hồi nhấn nút và bố cục một cột cho màn hình hẹp.
- Giữ bảng có thể cuộn ngang bên trong vùng chứa trên mobile, không tạo tràn ngang toàn trang.

## Xác nhận

- `npm run lint` và `npm run build` tại `ShiftSync-Web` đạt.
- Playwright kiểm tra trạng thái thư viện trống, mở biểu mẫu, lỗi tên bắt buộc, và viewport 390px; không có tràn ngang ở trang.
