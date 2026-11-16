# FIX-036: Giới hạn thời gian chờ Dashboard Mobile

## Vấn đề

Dashboard chỉ tắt loading toàn màn hình khi toàn bộ API (ca làm, lương, thông báo, chấm công và hồ sơ) hoàn tất. Một request chậm có thể khiến người dùng thấy spinner tới 20 giây.

## Sửa đổi

- Khởi chạy tải hồ sơ song song với các API Dashboard khác.
- Hiển thị khung Dashboard sau tối đa 850 ms; các thẻ dữ liệu tiếp tục cập nhật khi request nền hoàn tất.
- Giảm timeout API mặc định từ 20 giây còn 12 giây để lỗi kết nối được phản hồi sớm hơn.

## Phạm vi

- Không thay đổi logic đăng nhập, refresh token hoặc dữ liệu lưu cục bộ.
- API refresh token vẫn dùng timeout chuyên biệt 10 giây.
