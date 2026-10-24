# EXPLORER-015 — Bảng thông tin trong cảnh 3D

Ngày 21/10/2026 · branch `quoc-backend` · baseline tri thức `c9d4df1`.

## Kết quả

- Click nhân viên, trạm hoặc khu vực mở một bảng neo trong không gian bằng R3F/Drei `Html transform`. Bảng quay về camera, giữ chữ theo kích thước màn hình, tối đa 360×440px và cuộn nội dung bên trong.
- Điểm neo lấy từ mesh nhân viên/trạm hoặc `physicalFrame` khu vực. Cache độ lệch vật lý theo mesh để không rung theo hoạt ảnh thở; đường nối vẫn đi theo nhân vật đang di chuyển. Khi đối tượng ra ngoài khung, có nút đưa về khung nhìn.
- Bỏ cột chi tiết và phần canvas bị thu hẹp. Bảng cung cấp thông tin ca/giới tính/điểm danh hoặc định biên/nhân sự/thiết bị; nút Thao tác mở Inspector hiện có trong hộp giữa màn hình. Tổng quan và cảnh báo cũng dùng hộp này.
- Hộp thao tác có focus trap, Esc, đóng bằng nền, khôi phục focus và body overflow. Đặt theo viewport để nội dung không bị cắt trên mobile và vẫn dùng được trong fullscreen.
- Gỡ `DigitalTwinXR.jsx`, mọi state/nút/kiểm tra headset, CSS VR và dependency `@react-three/xr`. Giữ một nút **Tham quan 3D**, luôn mở first-person trên mọi build.
- Tham quan hỗ trợ click model và E. Khi bảng/hộp mở, controller nhả pointer lock và tạm dừng input; Esc đóng bảng trước khi thoát tham quan. Request pointer lock bị hủy do mở bảng được xử lý, không phát sinh promise rejection.
- Không thay API, backend, migration hoặc assets. Tái sử dụng EXPLORER-003/010/013, CREW-027 và các skill frontend-developer, frontend-design, 3d-web-experience, senior-frontend. Hướng thiết kế bảng vận hành trong không gian, giữ theme/màu vị trí, DFII 14/15.

## Contract frontend

- `spatialInfoModel.js`: lựa chọn `{type, id}` với type staff/workstation/zone; resolve lại thành `{type,id,data}` từ snapshot mới nhất. Staff dùng assignment identity trước staff identity; thiếu entity trả null.
- `WorldInfoCard` nhận selection mới nhất, mesh arrays, dữ liệu ca/điểm danh/occupancy và callback đóng/mở thao tác. Thiết bị tải bằng API hiện có, abort khi đổi selection.
- `SpatialWorkspace` đóng selection khi đổi cửa hàng/ngày/ca hoặc entity biến mất. Click trong Planner vẫn gọi callback chọn zone; chế độ kéo trạm không mở bảng thông tin.
- `PlayerController.setPaused` xóa phím đang giữ và nhả chuột; `lookAtTarget` hỗ trợ đưa đối tượng ngoài khung về góc nhìn khi tham quan. Layer labels chạy sau avatar animation để không bị tag cũ đè lên bảng.

## Kiểm chứng

- Build production PASS. Bundle hiện hữu vẫn có cảnh báo chunk lớn; build mới không tạo chunk XR/emulator.
- Node: 20/20 PASS (`spatialInfoModel`, `sceneSelection`, `workstationOccupancy`, `plannerModel`); trong đó 4 test mới bảo vệ snapshot/identity/physical frame/attendance isolation.
- Edge 155, 1920×1080: `scripts/test-world-info.browser.cjs` 38/38 PASS. Click thật trên canvas cả ba loại, dialog/overview, Esc, orbit drag, 1366×768 và 390×844, WASD, click trong first-person, nhả pointer lock, E, tạm dừng di chuyển, không request XR; không console/page errors.
- `scripts/test-world-info-updates.browser.cjs` 11/11 PASS: DOM event kích hoạt REST refresh, tên/giới tính mới trong bảng đang mở, nhân vật đi và đường nối đi theo, tên dài, fullscreen, dữ liệu thiếu, xóa phân công, đổi cửa hàng/ngày và form thiết bị hiện có.
- Planner Edge regression 20/20 PASS, bao gồm click zone 3D, bản nháp, eligibility revalidation và apply qua API fixture.
- Kiểm tra riêng dialog mobile 390×844: nằm hoàn toàn trong viewport, Tab giữ focus trong hộp, Esc đóng và body overflow khôi phục.
- ESLint các module mới PASS. Các controller canvas/explore cũ vẫn có cảnh báo/lỗi React compiler refs/immutability/dependencies ngoài phần mới. `git diff --check` còn whitespace cũ tại PlayerController; không dọn thay đổi ngoài phạm vi.

## Bằng chứng và giới hạn

- Ảnh `.playwright-mcp/world-info-final-1920.png`, `world-info-mobile.png`, `world-info-updates.png`.
- Browser dùng WebGL/GLB thật nhưng session và REST là fixture; realtime được kích hoạt bằng DOM event, chưa kiểm chứng STOMP/backend thật. Không có ghi dữ liệu thật hoặc commit/push.
- Chỉ nhân viên, trạm và khu vực mở bảng. Nội thất trang trí không có bảng riêng. Tương tác mouse-look trên desktop không phải stereo/head tracking.
- Stale khi đổi selection identity, mapping mesh/physical frame, order animation/labels, controller input hoặc Inspector actions.
