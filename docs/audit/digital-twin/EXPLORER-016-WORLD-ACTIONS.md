# EXPLORER-016 — Thao tác ngay trên bảng 3D
Ngày: 21/10/2026. Tiếp nối và điều chỉnh EXPLORER-015 theo yêu cầu “thao tác cũng phải 3D”.

## Kết quả
- Nút Thao tác thay nội dung trong WorldInfoCard (Html transform), giữ mesh/physicalFrame anchor, billboard, leader, viewport clamp và cuộn nội bộ. Không mở dialog cho staff/workstation/zone.
- SpatialInspector được truyền dưới dạng React content qua DigitalTwinCanvas vào card; giữ callback, API và RBAC. Loại header lặp; footer Quay lại thông tin. Thiết bị thêm/sửa/lưu ngay trong cảnh.
- Escape từ thao tác về thông tin, Escape tiếp đóng card; thay đối tượng reset về thông tin. WASD vẫn dừng và pointer lock được nhả khi card mở.
- Tổng quan/cảnh báo cấp cửa hàng vẫn dùng dialog theo EXPLORER-015; không có đối tượng vật lý để neo. Không WebXR, backend, migration hoặc dependency mới.

## Tri thức và thiết kế
Tái sử dụng EXPLORER-015, scene selection/Planner contracts và skills 3d-web-experience/frontend-design đã đọc. Hướng bảng vận hành trong không gian, giữ theme, font, role colors; DFII 14/15 như hướng đã chốt.

## Kiểm chứng
- Production build PASS, còn cảnh báo chunk lớn có sẵn.
- Node selection/info/occupancy/Planner: 20/20 PASS.
- Edge155: world-info suite mở rộng 45/45 PASS, update/fullscreen 11/11 PASS, Planner 20/20 PASS. Không pageerror/console error.
- Ba loại đối tượng mở thao tác trong card, Escape/back, không resize canvas; first-person input; form thiết bị cuộn và không cắt ở 1366x768 và390x844; lưu fixture qua API hiện có rồi trở lại summary thấy thiết bị mới. Viewport chính1920x1080.
- REST/session/equipment writes là fixtures, realtime dùng DOM event injection; chưa xác nhận backend/STOMP thật. Canvas/WebGL/model thật. Ảnh .playwright-mcp/world-actions-3d-1920.png.
- Không commit/push; bảo tồn các thay đổi sẵn có.

Stale khi thay WorldInfoCard slot/actions, Inspector layout, keyboard capture hoặc workspace selection.
