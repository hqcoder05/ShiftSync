# FIX-035: Giữ điều hướng dưới ở màn chính Mobile

## Vấn đề

Một số màn chính trên Mobile biến mất thanh điều hướng dưới sau khi người dùng mở từ dashboard hoặc menu. Cụ thể, màn Thông báo đã import thanh điều hướng nhưng không render; Chấm công chưa gắn thanh điều hướng vào màn bình thường.

## Sửa đổi

- Render `BottomNavbar` tại Thông báo với trạng thái `Notification`.
- Gắn `BottomNavbar` tại Chấm công với trạng thái `Attendance` và tăng vùng đệm cuộn để nội dung không bị che.
- Luồng camera chấm công vẫn toàn màn hình có chủ đích, nên không hiển thị thanh điều hướng trong lúc chụp.

## Kiểm tra

- Chạy lint Mobile.
- Xác nhận import, render và `activeRoute` của hai màn bằng kiểm tra tĩnh.
