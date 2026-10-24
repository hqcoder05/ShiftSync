# EXPLORER-008 — Bố trí cửa hàng theo luồng quán cà phê

Ngày 19/10/2026; quoc-backend, baseline c9d4df1. Tái sử dụng PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP, EXPLORER-006/007. Không ghi DB, không commit/push hoặc sửa backend.

## Vấn đề và thay đổi
- Cách xếp theo bounding box cả cụm làm mất toàn bộ booth và dồn bàn ghế; dùng kích thước API24×16 cho GLB sàn22,2×14,22 còn có thể đưa ghế xuyên tường. Nay lấy giới hạn sàn thật từ Main_Floor_Plinth, xếp từng bộ booth/bistro hoàn chỉnh.
- Giữ ba booth dọc tường phải, bốn bộ bàn đôi ở hai đầu khu khách, xoay bàn chung theo chiều dọc ở giữa; góc lounge gần cửa sổ phía trước. Giữ đủ chín bộ, không tháo rời ghế khỏi bàn.
- Chừa hành lang trung tâm rộng2,2m từ cửa +Z, landing cửa, vùng xếp hàng bên trái; giữ khách bên phải và nhân viên phía sau quầy. Kho/partition/cột được tính vào blockers; khoảng cách mục tiêu giữa bounding boxes các bộ bàn ghế0,8m, mép sàn0,45m. Đây là thông số thiết kế mô hình, không phải chứng nhận quy chuẩn mặt bằng.
- Quầy nhận đồ Service được khôi phục cạnh pha chế, tạo cụm Thu ngân–Pha chế–Nhận đồ. Bàn chưa bind không có dữ liệu nhân sự/thiết bị giả; xóa tag nghiệp vụ cũ nếu mất binding. Tọa độ trạm đã lưu vẫn được giữ.
- Zone decal và nhãn cà phê dựa trên quầy vật lý thay vì zone pad API ở xa. Camera chọn zone cũng focus đúng quầy. Không ghi lại tọa độ zone trong DB; không đổi kế hoạch nghiệp vụ/sức chứa.
- Thêm chỉ dẫn sàn gọi món/thanh toán, nhận đồ và lối đi; không gắn trạng thái nhân sự giả vào chỉ dẫn. SceneLabels dời nhãn zone va nhau kèm leaderline thay vì ẩn mất Thu ngân đang thiếu người; dispose đường dẫn khi zone bị xóa.

## Kiểm chứng
-122/122 spatial tests pass,20 suites; thêm bounds sàn thực, frame zone theo quầy và camera focus zone.
- Build pass; cảnh báo bundle>500kB còn tồn tại.
-33/33 full-page Playwright checkpoints ở1920×1080 với API/session mock, GLB/WebGL thật; không uncaught/console errors. Kiểm tra đủ9 bộ, bounds sàn, khoảng cách giữa các bộ>=0,8m theo AABB, quầy liền nhau, zone Thu ngân đúng quầy, chỉ dẫn sàn, cả hai nhãn ở topdown, raycast/thiết bị/layers/đổi store.
- Ảnh .playwright-mcp/explorer-008-overview.png và explorer-008-topdown.png được judge độc lập kiểm tra theo design-ux: major nhãn Thu ngân đã sửa, không còn blocker/major trực quan trong hai ảnh.

## Giới hạn
Bố trí áp dụng cho mặt bằng GLB quán cà phê mẫu, chưa khảo sát kích thước/luồng khách tại chi nhánh thực tế. Khoảng cách kiểm tra là hình học mô hình, không xác nhận độ rộng sử dụng khi kéo ghế hoặc kiểm định tiếp cận/PCCC. Giữ vị trí API của các trạm đã cấu hình; không tự sắp lại trạm thật trong DB. Điều chỉnh decal/wayfinding trong canvas3D, không thay dữ liệu vùng của sơ đồ2D. Backend Equipment runtime/JWT/persistence còn chưa xác minh như EXPLORER-006.
