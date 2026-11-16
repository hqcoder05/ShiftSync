# FIX-034: Tạo ca và vị trí/kỹ năng

## Vấn đề

- Biểu mẫu tạo/sửa ca hiển thị nhiều trường nhưng thiếu phân cấp trực quan, phản hồi về thời lượng và ngữ cảnh lưu chưa rõ.
- Trang Vị trí & kỹ năng có nhiều style nội tuyến, bảng đơn giản, chưa có trạng thái tải trực quan hoặc hướng dẫn khi chưa có dữ liệu.

## Thiết kế

- Nhóm biểu mẫu ca thành phần thiết lập, nhận diện và bàn giao; làm rõ thời lượng, trạng thái khóa và ý nghĩa lưu nháp.
- Cập nhật biểu mẫu vị trí theo cùng hệ màu và phản hồi tương tác; giữ nguyên các API tạo, sửa, xóa và lịch hiệu lực lương.
- Thêm dải tóm tắt, skeleton, empty state và alert có thể đóng cho danh sách vị trí.
- Dùng bố cục một cột/bottom sheet ở màn hình hẹp, kiểm soát tràn ngang và giữ focus ring cho bàn phím.

## Xác nhận

- `npm run lint` và `npm run build` tại `ShiftSync-Web` đạt sau khi thay đổi.
- Playwright kiểm tra biểu mẫu tạo lịch tại viewport 390px, không có tràn ngang toàn trang.
