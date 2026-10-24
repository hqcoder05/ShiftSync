# SCROLL-018 — Khôi phục cuộn nội dung Định biên

Ngày 20/10/2026. Người dùng cung cấp ảnh Định biên dạng tuần với phần cảnh báo bị cắt ở mép dưới. Trước đó SCROLL-014 chỉ đối chứng cuộn document, chưa kiểm tra mọi vùng cuộn nội bộ.

- `DemandPlanningModal` được render qua portal ra `document.body`; vùng overlay trở thành vùng cuộn dọc duy nhất của cửa sổ. `workspace` và content có chiều cao tự nhiên thay cho container cao cố định có một vùng cuộn lồng. Bảng rộng tiếp tục cuộn ngang bên trong.
- Khóa cuộn trang phía sau trong lúc modal mở và phục hồi giá trị trước đó khi đóng/unmount. Nút đóng neo theo viewport, vẫn dùng được sau khi cuộn cuối. Bỏ `backdrop-filter` vì nó tạo containing block làm nút fixed trôi theo vùng cuộn.
- Playwright dùng API/session mock: dạng tuần 1587×910 wheel tới scrollMax=159, đáy vùng cảnh báo y=847 trong viewport 910; mobile 390×600 cuộn tới đáy, cảnh báo nằm trong viewport và nút đóng ở y=16; phím mũi tên cuộn ngang ma trận. Dạng ngày 1920×600, 390×600 và route `/demand-planning` 1366×768 cuộn đến đáy, nút đóng hiện và body overflow được phục hồi.
- Cuộn bằng wheel tới footer Dashboard, Schedule, Availability, Requests, Settings ở 1366×600; regression SCROLL-014 9/9 PASS; build và diff check phạm vi component PASS. Browser dùng dữ liệu mock, chưa kiểm tra toàn bộ trang/trạng thái hoặc dữ liệu thực của người dùng.
