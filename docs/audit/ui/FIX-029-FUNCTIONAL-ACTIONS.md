# FIX-029 — Sửa các nút và luồng điều hướng đã xác nhận

Ngày: 22/10/2026. Tái sử dụng FUNC-028, LIVE-024 và NAV-027. Bảo tồn working tree trên quoc-backend; không commit/push.

## Thay đổi

- Chuông thông báo: duyệt/từ chối chỉ đổi trạng thái sau khi API thành công. Khi lỗi, hiển thị thông báo và giữ nguyên yêu cầu. Trường hợp không xác định được yêu cầu/chi nhánh không được coi là thành công. Đánh dấu đã đọc không xóa needsAction; thao tác lỗi không cập nhật UI. Ghi nhớ các yêu cầu tổng hợp đã đọc trong phiên để polling không đưa chúng về chưa đọc. Không trừ bộ đếm lặp khi một mục đã đọc.
- Giữ sourceType gốc tại MainLayout và xuyên qua Navbar để thông báo lịch/chi viện mở đúng module.
- /time-workforce giữ tab nghỉ phép/giải trình qua LegacyRequestRedirect; /marketplace/history mở FILLED. /schedule/auto mở hộp cấu hình hiện có, điền ngày đầu/cuối tuần như nút Gợi ý AI và tiêu thụ query action bằng replace.
- /schedule/templates nay là trang Mẫu ca thực, có tải danh sách và tạo/sửa/xóa qua API shift-templates hiện có. Có trạng thái tải/lỗi/thử lại, xác nhận xóa, giữ form khi lưu lỗi, hủy request khi đổi cửa hàng hoặc rời trang, quyền truy cập ManagerRoute. Không thêm API/migration. Bảng cuộn ngang bên trong ở mobile.
- Theo dõi 3D: resolve employee identity ra avatar root trong scene; liên kết lại khi avatar được dựng lại, bỏ đối tượng đã rời scene. Camera theo world position, không dùng local position. Người dùng xoay camera sẽ tạm ngừng theo dõi và không bị tự bật lại. Nút đang theo dõi đổi thành Dừng theo dõi, trạng thái đúng theo nhân viên được chọn. Dừng khi nhân viên không còn trong displayStaff.

## Kiểm chứng

- Build production PASS, còn cảnh báo chunk lớn có sẵn.
- Node16/16 PASS: CameraManager hiện có, resolve avatar root, world transforms, model thay thế, di chuyển, dừng theo dõi, mapping thông báo gốc và legacy links.
- ESLint các module mới ShiftTemplatesPage/cameraTargets và tests PASS; không tuyên bố đã làm sạch lint toàn codebase.
- Edge1920 với backend Docker thật: legacy leave/adjustments/history đúng đường dẫn; menu auto mở modal và điền19–25/10; Mẫu ca GET200 (DB hiện0mẫu), mở form3trường và Hủy thành công.
- Theo dõi nhân viên thật ca15/10: camera tới đúng avatar, sai số so với offset cấu hình khoảng0,00071 đơn vị; summary còn hiển thị, nút Dừng theo dõi hoạt động và về Theo dõi NV.
- Tab kiểm thử riêng dùng dữ liệu đọc từ backend: mọi request ghi bị intercept. Approve500 giữ3/3yêu cầu; mark-all-read200 giữ3/3yêu cầu; phát sự kiện refresh vẫn3/3. Không duyệt/từ chối hoặc markread thật trong DB.
- CRUD mẫu ca chạy trong tab riêng có GET ban đầu từ backend và mirror response chỉ cho test: lưu500 giữ form, tạo201/sửa200/xóa204 và refresh danh sách PASS. Bốn request ghi bị intercept, không tạo mẫu thử trong PostgreSQL. Chưa xác nhận CRUD mẫu ca qua browser ghi DB thật.
- Mẫu ca kiểm tra1920/1366/390; mobile sau layout ổn định document width375≤390, bảng cuộn nội bộ345/580. Trả trình duyệt1920 về schedule3D, ca15/10, không có HTTP/WebSocket mock trên tab người dùng. Tab thử đã đóng.

## Giới hạn

Không chạy tự động xếp lịch, không duyệt yêu cầu thật để kiểm thử. Không đổi backend/DB/schema/dependencies. Mẫu ca quản lý cấu hình tên và giờ; không tự tạo ca làm việc hoặc tự phân công nhân viên.
