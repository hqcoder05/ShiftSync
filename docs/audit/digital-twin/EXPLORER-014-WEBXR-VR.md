# EXPLORER-014 — Tham quan cửa hàng bằng WebXR VR

Ngày 21/10/2026, branch `quoc-backend`, baseline `c9d4df1`.

## Kết quả

- Trên máy không có kính, nút **Mô phỏng VR** mở ngay góc nhìn người thứ nhất trên scene cửa hàng hiện tại. Chế độ dùng WASD để đi, chuột để xoay nhìn, E để tương tác, F để khóa mục tiêu, V để đổi góc nhìn và Esc để thoát; không cần thiết bị hay cửa sổ giả lập riêng.
- Khi trình duyệt hỗ trợ `immersive-vr`, nút vẫn tải runtime `@react-three/xr` theo yêu cầu rồi cho phép bắt đầu phiên WebXR thật từ thao tác thứ hai. Phiên này dùng tracking headset, tia chọn nhân viên/khu vực/trạm và tia dịch chuyển trên sàn.
- Scene WebGL và GLB hiện tại được dùng chung. Vùng điều khiển desktop ẩn khi đang tham quan để không che góc nhìn; Explore HUD cung cấp nút thoát và bản đồ.
- XR runtime được tải động, không tải `DigitalTwinXR` trong lần mở scene thông thường. Bundle `DigitalTwinXR` 100,37 kB (28,55 kB gzip).

## Kiểm chứng

- `npm run build`: PASS. Vite vẫn phát cảnh báo chunk lớn của bundle hiện hữu; VR runtime được tách riêng thành dynamic chunk.
- Microsoft Edge `Edg/155`, 1920×1080, `/schedule?view=3d`, API/session fixtures: bấm **Mô phỏng VR** vào first-person với cửa hàng GLB, HUD và nhân vật; `window.__playerController.viewMode` là `first_person`, canvas giữ nguyên một WebGL context, không phát sinh page error.
- Playwright giữ phím W 350 ms làm vị trí người chơi đổi từ z=3,8 m xuống z=2,73 m; Explore HUD có nút thoát và bản đồ. Đây là mô phỏng desktop dùng controller nội bộ, không mô phỏng stereo/head tracking.
- Edge không có thiết bị: lượt vào trang bình thường không tải runtime XR. Backend/WebSocket dùng fixtures; kết nối realtime báo 403 do backend không thuộc lượt kiểm tra này.
- Backend/API tiếp tục dùng fixtures hiện có; không thay backend, dữ liệu phân công hoặc database.

## Giới hạn

Chế độ desktop không tạo hình stereo và không có tracking đầu/tay cầm; các khả năng đó chỉ có trong phiên WebXR trên headset tương thích. Chưa có headset để nghiệm thu tracking, chọn bằng controller và teleport thực.
