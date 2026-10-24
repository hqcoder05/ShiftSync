# EXPLORER-009 — Kiểm tra trải nghiệm Interactive Store

Ngày19/10/2026; branch quoc-backend, baseline c9d4df1. Skill được người dùng gọi: 3d-web-experience. Tái sử dụng PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP, EXPLORER-008 và script full-page hiện có. Đây là audit; không sửa mã ứng dụng, không ghi DB hoặc commit/push.

**Kết luận: NEEDS_FIXES.** Toàn cảnh và tương tác quản lý chính hoạt động; chưa nghiệm thu trải nghiệm tham quan vì dữ liệu vị trí và collision chưa đồng bộ với bố trí mới.

## Môi trường và phương pháp
- Playwright trên route /schedule ở1920×1080, Intel Iris Xe / ANGLE Direct3D11, pixel ratio1. API/session mock tại trình duyệt; scene WebGL/GLB thật. Không dùng mock để xác nhận backend/JWT/persistence.
- Chạy lại scripts/explorer-full-mock.browser.cjs:33/33 checkpoints pass, không console/uncaught errors trong journey này. Bộ33 bước chưa bao phủ teleport, V, collision bàn ghế và consistency2D.
- Thao tác bổ sung bằng UI/chuột/phím: sơ đồ2D và quay lại3D, zoom wheel, fullscreen, tham quan WASD, V, menu dịch chuyển Thu ngân, Escape, di chuyển qua booth, resize390×844 rồi trả về1920×1080.
- Cố ý trì hoãn một request GLB4,5giây; một lần khác trả503 cho GLB, sau đó reload phục hồi tải bình thường. Lỗi request/console trong kiểm tra503 là lỗi được chủ động tạo, không phải kết quả của journey33 bước.
- Không chạy lại unit/build vì không sửa ứng dụng; bằng chứng122 tests và build của EXPLORER-008 vẫn là lần gần nhất.

## Phát hiện được xác nhận

| ID | Mức | Bằng chứng trực tiếp | Nguyên nhân / hướng sửa |
|---|---|---|---|
| UX3D-01 | P1 | Trong tham quan, menu Dịch chuyển→Thu ngân đưa player tới(5,0,3.4), nhưng quầy POS thực ở(-1.84,0,-2). Player bị kẹt tại vị trí này khi giữ D/W dù keys.right=true. | SpatialWorkspace.jsx:753 vẫn dùng tọa độ zone API cũ và offset cố định; PlayerController thêm zone box ở(5,2), nơi không còn quầy. Dùng cùng nguồn tọa độ vật lý cho teleport, minimap, focus và collision; tìm điểm đứng trống trước quầy. |
| UX3D-02 | P1 | Từ cửa, đi D rồi W: player đi qua booth giữa. Các mẫu position(9.523,0,0.374),(9.523,0,0.008),(9.523,0,-0.423) nằm trong booth bounds x8.7..10.5,z-0.7..0.7. | extractGlbObstacles chỉ lấy cột/quầy/vách; không lấy bàn/ghế. rebuildObstacles đồng thời thêm cột procedural và GLB, zone box cũ, cả Kitchen bị ẩn. Dùng bounds world-space của vật thể hiện hữu/visible sau bố trí, bỏ collision ma/trùng. |
| UX3D-03 | P1 | Sơ đồ2D hiển thị Thu ngân theo tọa độ API bên khu khách;3D đã chuyển decal zone về quầy bên trái. Hai chế độ không cùng một mặt bằng. | TwoDSpatialSchematic.jsx:137 đọc zone.x/zone.y; frame3D dùng getCoffeeZoneFrame. Cần model vị trí hiển thị dùng chung cho2D/3D/minimap, không tự tạo thêm dữ liệu nghiệp vụ. |
| UX3D-04 | P2 | Click nút Góc nhìn đổi controller→third_person, label→thứ3, FOV68. Nhấn V lần tiếp theo controller→first_person nhưng label vẫn thứ3, FOV vẫn68; lần V tiếp controller lại third_person. | Callback onToggleView của FirstPersonController được gắn trong effect khởi tạo chỉ phụ thuộc kích thước layout; giữ closure handleTogglePlayerView cũ. Đồng bộ mode bằng giá trị callback hoặc cập nhật callback/ref và dùng state setter phù hợp. |
| UX3D-05 | P2 (skill: HIGH loading) | Delay GLB4,5giây: canvas hiển thị nhưng không có loading text, role=status/progressbar hay aria-busy. Khi GLB503, procedural fallback vẫn render243 meshes, người dùng không thấy thông báo mô hình đã lỗi hoặc nút retry. | CoffeeShopModel có loadError nội bộ/console.warn nhưng không trình bày trạng thái cho người dùng. Thêm trạng thái tải và lỗi/retry với thông báo đang dùng mô hình đơn giản. |

Ảnh bằng chứng: .playwright-mcp/explorer-009-2d.png, explorer-009-explore.png, explorer-009-collision.png, explorer-009-walkthrough.png, explorer-009-loading.png và explorer-009-model-fallback.png. Tọa độ/đồng bộ mode/collision được xác nhận bằng đọc state sau thao tác UI, không chỉ suy luận từ ảnh.

## Các phần đạt
-33 checkpoint hồi quy: click raycast đúng trạm, focus camera, orthographic, equipment GET/POST mock, layer độc lập, đổi store không mang selection/nhân sự/thiết bị cũ;9 bộ bàn ghế và nhãn POS/Barista còn đủ.
- WASD di chuyển từ spawn(0,0,3.8) tới(0,0,1.511); Escape thoát tham quan khi không còn lock. Pointer lock được kích hoạt bằng click canvas. Nút đổi góc nhìn hoạt động; lỗi riêng ở đồng bộ phím V.
- Zoom wheel thay camera từ(20.4,20.4,16.8) sang(16.616,16.709,13.684). Fullscreen thực sự hoạt động, khung1918×1078.
-390×844 kiểm tra bổ sung: document.scrollWidth390; workspace374×768, canvas372×434, DPR1 trong phiên desktop resize này. Không thay thế kiểm tra touch/GPU điện thoại thật. Trình duyệt đã trả1920×1080, mô hình tải bình thường.

## Hiệu năng và độ bền
- Lấy mẫu requestAnimationFrame3,015giây:181 frames≈60FPS trên Iris Xe, cảnh overview. Đây là đo ngắn trên một máy, không phải benchmark mọi thiết bị.
- Renderer info:930 draw calls,103.358 triangles,777 geometries,16 textures; buffer1562×793,DPR1. Triangle count trong mục tiêu desktop của skill, nhưng draw calls cao; nên gộp vật liệu và instance các đối tượng lặp trước khi tăng chi tiết.
- GLB6.624.416bytes≈6,32MiB; vượt mức lý tưởng5MB của skill. Loader không cấu hình Draco/KTX2/Meshopt ở module này. Cần đo chi phí tải/giải mã rồi tối ưu asset, tránh chỉ nén truyền tải mà tăng draw calls.
- SceneLabels duyệt scene và cấp phát vector/box mỗi frame, cập nhật leader geometry mỗi frame dù camera đứng yên; nên cache label registry và tái dùng bộ nhớ khi tối ưu.
- Canvas chưa có fallback WebGL riêng, DPR cho phép1..2; reduced-motion hiện chỉ tắt CSS transitions của toolbar/inspector. Chưa mô phỏng thiết bị không WebGL, context loss hoặc DPR2 điện thoại; đây là các khoảng trống xác minh, không ghi nhận là lỗi runtime đã tái hiện.

## Ưu tiên
1. Đồng bộ vị trí giữa3D/2D/teleport/minimap và collision, loại collision ma, bổ sung bàn ghế visible; kiểm thử đi bộ tới quầy và qua khu khách.
2. Sửa V và thêm kiểm tra state/UI/FOV cùng mode.
3. Bổ sung tải/lỗi/retry mô hình; sau đó tối ưu draw calls, asset và cấp phát per-frame.

Giới hạn còn giữ: API mock; Equipment backend Docker/JWT/persistence chưa xác minh. Không coi33/33 journey là nghiệm thu mọi chế độ của Interactive Store.
