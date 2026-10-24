# EXPLORER-006 — Giao diện và bố trí cửa hàng

Ngày 19/10/2026. Branch quoc-backend, baseline c9d4df1. Kế thừa PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP và EXPLORER-005. Bảo toàn working tree; không commit/push, không ghi DB.

## Thay đổi
- Gộp header cửa hàng/ngày/ca, bỏ các thanh lịch lặp trong Explorer. Thêm navigator entity và toàn màn hình; canvas, inspector, timeline vừa màn hình1920×1080. Ngày dd/MM/yyyy, dữ liệu workspace/API dùng ISO date.
- Timeline theo giờ ca, hỗ trợ qua đêm; phân biệt phân công theo mốc giờ với điểm danh theo dữ liệu đã tải. Theme sáng/tối thống nhất, sửa tương phản KPI/cảnh báo. Nhãn3D theo kích thước màn hình và giảm chồng lấn.
- StoreArrangement.js bố trí cụm bàn ghế GLB tránh hành lang vào bên trái, trạm/cột và mép sàn; ẩn cụm không đủ chỗ. Tính lại lặp được và giữ nguyên tọa độ trạm từ API. Ẩn quầy mẫu không gắn dữ liệu, tránh dựng nội thất procedural trùng GLB.
- Nhân viên đứng ngoài mặt quầy, giãn vị trí cùng trạm và quay về quầy. Camera focus thử hướng tránh cột/tường, chuyển động theo thời gian khung hình. Kéo trạm có lưới và snap0,25m, dùng lưu/hủy hiện có.

## Kiểm chứng
- Spatial tests:117/117 pass,20 suites; thêm placement/idempotence, staff anchor, tọa độ trạm, ca qua đêm và camera tránh cột.
- npm run build:pass, còn cảnh báo bundle lớn hơn500kB.
- scripts/explorer-full-mock.browser.cjs:26/26 checkpoints pass; route /schedule,1920×1080, WebGL/GLB thật, API/session mock.56 requests; không console/uncaught errors. Bao gồm raycast, camera, thiết bị GET/POST mock, layers độc lập, đổi store, layout và timeline.
- Ảnh .playwright-mcp/explorer-006-light.png và explorer-006-dark.png; có đánh giá độc lập, đã sửa KPI và nút Zoom3D.
- git diff --check toàn working tree còn whitespace có sẵn tại Header.jsx, PlayerController.js và ShiftAssignmentRepository.java; không sửa ngoài phạm vi.

## Giới hạn
Toàn bộ Explorer vẫn PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS. Đợt này hoàn tất giao diện và bố trí hiển thị, không ghi lại tọa độ cửa hàng trong DB. Khoảng trống hình học theo bounding box/fixture chưa xác nhận mặt bằng thực tế từng chi nhánh. Docker đã đọc ở EXPLORER-004 còn FlywayV42; EquipmentV43 chưa được kiểm chứng qua backend đang chạy. Journey mock không chứng minh JWT, persistence hoặc migration thực. Chưa triển khai undo/redo và collision đầy đủ khi người dùng kéo trạm.
