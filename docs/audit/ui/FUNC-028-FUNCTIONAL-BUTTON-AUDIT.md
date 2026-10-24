# FUNC-028 — Rà soát nút và điều hướng web (22/10/2026)

Rà soát chọn lọc source các trang chính và camera/notification handlers, tái sử dụng LIVE024/NAV027. Không kết luận đã kiểm mọi nút. Không bấm mutation dữ liệu backend.

## Xác nhận bằng mã nguồn
1. MainLayout.handleAction catch vẫn đặt needsAction=false/read=true và giảm unread khi API approve/reject thất bại: UI che yêu cầu chưa xử lý. Ưu tiên cao.
2. MainLayout.handleMarkAllRead đặt needsAction=false cho mọi item, trộn trạng thái đọc và xử lý nghiệp vụ; sau markall tabYêu cầu có thể mất pending items dù chưa duyệt.
3. SpatialWorkspace.handleFollowStaff truyền cameraFocusTarget.employee, OverviewCameraController FOLLOW chỉ nhận cameraFocusTarget.avatar. Không resolve avatar ở bridge này. CameraController follow còn dùng local position thay world position. Kế hoạch trước đã bị user hủy; chưa sửa.
4. Navbar Mẫu ca→/schedule/templates và Xếp ca tự động→/schedule/auto; App redirect cả2→/schedule không query/state. SchedulePage showAutoScheduleModal khởi tạo false, chỉ click riêng mới mở. Menu không mở chức năng hứa trên nhãn.
5. App /time-workforce→/attendance không giữ querytab; deep link ?tab=leave/adjustments bị mất tab. /marketplace/history→/marketplace cũng mất tabFILLED.
6. MainLayout.fetchCounts chuẩn hóa backendtype thành swap/leave/open_shift/attendance/system và bỏ typegốc trước khi gửi Navbar; sourceType ở Navbar lúc này đã normalized. Schedule/workforce notification có thể rơi dashboard hoặc marketplaceOPEN thay đúngmodule. NAV027 sửaNavbar chưa đủ tại boundaryMainLayout.

## Đã loại trừ
- Điều chuyển ở3D gọi POSTassign không tự nó là lỗi: ShiftAssignmentService nhánh existing+requestedZoneId thực sự cập nhật zone, publish ASSIGNMENT_MOVED, returnDTO. Không đưa giả thuyết cũ vào findings.
- SettingsPage Xếp ca ngay nằm trong Live UI Preview; không tính là nút nghiệp vụ thực chưa nối.
- Marketplace nút Chờ đối tác đồng ý là disabled hợp lý.

Chưa sửa source trong lượt audit. Báo cáo không thay kiểm thử mutation/permission/error-path runtime.
