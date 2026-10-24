# EXPLORER-013 — Thiết kế lại model cửa hàng Oak & Moss

Ngày: 19/10/2026. Branch làm việc: `quoc-backend`; baseline tham chiếu `c9d4df1`.

## Yêu cầu và tri thức tái sử dụng

Người dùng yêu cầu thiết kế lại model 3D của store, sau khi chấp thuận Crew V2. Đọc PROJECT_CONTEXT/TASK_MEMORY trước mã nguồn, tra CODEBASE_MAP/AUDIT_INDEX. Tái sử dụng EXPLORER-008 (cụm POS–Barista–Pickup, chín bộ bàn ghế), EXPLORER-010 (geometry footprint/collision/physical zone frame/teleport), EXPLORER-011 (Spatial Planner) và EXPLORER-012 (nhân vật). Áp dụng skill 3d-web-experience và quy trình kiểm tra render của design-ux.

Giữ các thay đổi có sẵn trong working tree. Không reset/checkout/stash/commit/push, không đổi backend/schema/API hay ghi dữ liệu nghiệp vụ thật.

## Sản phẩm đã triển khai

- Model **Oak & Moss**: gỗ sồi sáng, xanh rêu, kem ấm, chi tiết đất nung/kim loại. Làm mới hình học của toàn bộ kiến trúc, quầy, thiết bị, bàn ghế và decor; không chỉ thay màu asset cũ.
- Sàn có dải gỗ và đường ghép ván, mảng đá khu làm việc. Tường sau có wainscot, nan gỗ, thương hiệu, menu chữ dạng geometry và kệ cốc; tranh, cây, cửa kính, cửa vào mở và đèn treo. Tường trước/phải chủ động cắt thấp/kính để xem nội thất từ isometric. Đây là model minh họa, không phải bản đo chi nhánh thực.
- Cụm quầy giữ thu ngân liền pha chế và pickup, chân âm/tấm nan/mặt đá bo cạnh, máy POS/đọc thẻ/in hóa đơn, máy espresso/hai máy xay/chậu rửa và cốc. Có model tủ bánh riêng trong semantic Kitchen, vẫn bị ẩn nếu không bind trong ứng dụng chính như contract hiện hành.
- Ba banquette cạnh kính, bốn bàn bistro hai ghế, một bàn chung sáu ghế và một góc lounge: đủ chín bộ. Kho có lối vào và kệ. Hai cột chuyển về phía sau x=±9,6 m, z=−6,5 m để tránh quầy/bàn/đường đi. Regression kiểm tra cột không giao mọi quầy vật lý trong fixture.
- `CafeStoreModel.js` là nguồn dựng, `scripts/generate-store-v2.mjs` xuất `public/models/store-v2/shiftsync-cafe.glb`. Asset gốc `ShiftSync_CoffeeShop_DigitalTwin.glb` được giữ nguyên. Font Helvetiker từ Three.js r185 được lưu cùng license gốc; file FONT-LICENSE.txt đi kèm GLB.
- `DEFAULT_DIGITAL_TWIN_GLB_URL` đã trỏ asset mới nên Interactive Store, Planner Spatial và tham quan cùng dùng model mới. Giữ tên root `ShiftSync_Store_DigitalTwin`, 4 Workstation keys, 6 Zone keys, Main_Floor_Plinth, partition/column/customer group contract. Saved API workstation positions tiếp tục là nguồn vị trí authoritative, model không ghi đè chúng.
- Geometry được gộp theo material trong từng đơn vị semantic; không gộp hai workstation hoặc hai bộ bàn ghế. Mesh con có prefix Baked_ để không bị hiểu nhầm là workstation/cột thứ hai. Wall meshes kế thừa wall metadata cho X-Ray; extractGlbObstacles chỉ tạo một blocker cho mỗi wall group. Materials V2 giữ nguyên palette đã soạn, bỏ bước thay vật liệu legacy cho riêng storeDesignVersion≥2.

## Kích thước và chi phí đã đo

| Chỉ số | Kết quả |
| --- | ---: |
| Sàn model | 22,20 × 14,22 m |
| Chiều cao tường sau | 3,50 m |
| GLB mới | 1.649.892 bytes |
| GLB cũ, giữ nguyên | 6.624.416 bytes |
| Giảm dung lượng | khoảng 75,1% |
| Mesh trong asset | 169 |
| Tam giác trong asset | 39.858 |
| Preview một frame có đèn/bóng | 189 calls / 41.893 triangles |

Chỉ số preview không đại diện toàn bộ scene ứng dụng, vốn thêm nhân viên/tags/zone và có lighting khác. Chưa kết luận FPS trên thiết bị khác, chưa thêm LOD/Draco hoặc kiểm chứng nhiều nhân viên.

## Kiểm chứng

- `node --test` các test thuộc spatial-workspace và schedule-planner: **144/144 PASS**, 20 suites. Ba test asset mới kiểm tra URL/version/palette/geometry budget/finite positions; đủ chín bộ, bounds sàn, lối giữa, clearance, vị trí trạm không đổi, arrangement repeatability; cột không cắt quầy, wall blockers không trùng và landing cửa vào còn trống. Các bộ integration cũ đã đổi sang asset mới để kiểm chứng model thực sự dùng trong ứng dụng.
- `npm run build`: **PASS**, 10,22 giây. GLB và FONT-LICENSE đã nằm trong dist/models/store-v2. Cảnh báo chunk >500 kB vẫn còn.
- Playwright **1920×1080** trên GLB/WebGL thật: Store Explorer **33/33**, experience/collision/teleport/V/loading/error/retry **14/14**, Planner **20/20**, preview **11/11**. Tổng **78 checkpoints**. Dữ liệu nghiệp vụ/session/API dùng browser mock, không kiểm chứng backend thật hoặc ghi DB. Preview không gọi API và ghi rõ không có dữ liệu phân công.
- Preview kiểm tra camera poses, aria-pressed/aria-busy, toggle wall/ceiling objects thật, kéo xoay, wheel zoom; width390px có toàn bộ model bounds nằm trong viewport và không horizontal document overflow. Trả browser về1920×1080.
- Trong kiểm tra hình ảnh đã thấy vị trí cột cũ cắt quầy và camera hẹp crop model; cả hai được sửa và chụp lại, bổ sung assertion tương ứng.
- Lần Store journey đầu khi khởi động lại Vite lạnh báo console assertion; rerun sau server sẵn sàng đạt33/33 với consoleErrors=[] và errors=[]. Script nay kèm nội dung console khi assertion fail để chẩn đoán. Không bỏ assertion.
- `git diff --check` trên toàn spatial-workspace phát hiện trailing whitespace có sẵn ở PlayerController.js:197, ngoài phạm vi task; không sửa file này. Các file model mới không có trailing whitespace.
- Judge độc lập xem bốn ảnh final: không thấy blocker/major trực quan; cụm pickup–pha chế–thu ngân liên tục, cột không cắt quầy, lối vào thông và palette thống nhất. Heuristics trạng thái/real-world/consistency/recognition/efficiency/aesthetics/help đạt qua ảnh, control đạt theo trace; prevention/recovery unknown qua ảnh (được kiểm riêng bằng tests). Minor: narrow fit toàn bộ nhưng model nhỏ, có thể thêm hướng dẫn chạm. Không suy ra kích thước/đủ seating từ ảnh; dùng assertions hình học đối chứng.

## Xem trước và bằng chứng

- `http://127.0.0.1:3000/store-preview.html`: xem trực tiếp không cần session, có Toàn cảnh/Mặt bằng/Xem quầy, Tường & kính, Đèn treo, kéo xoay và zoom. Đây là trang review cho Vite dev, tham chiếu /src/, chưa phải entry preview được bundle cho production. Ứng dụng chính production đã build với model mới.
- `.playwright-mcp/store-013-overview.png`, `store-013-counter.png`, `store-013-top.png`, `store-013-narrow.png`: render GLB thật, không phải concept image. `store-013-in-app.png`: route /schedule thật, API mock, model/nhân vật thật.

## Giới hạn

Model mẫu 22,2×14,22 m, chưa đo đạc chi nhánh hoặc chứng nhận kiến trúc/xây dựng. Bố trí trạm đã lưu của từng cửa hàng vẫn ưu tiên dữ liệu API; những tọa độ tùy chỉnh khác có thể cần quản lý chỉnh tiếp. Khi GLB lỗi, ứng dụng vẫn dùng môi trường procedural giản lược có thông báo/retry; không khẳng định fallback giống hoàn toàn model mới. Không nâng trạng thái toàn hệ thống lên fully implemented.

## Xác nhận áp dụng vào ứng dụng chính

Người dùng yêu cầu tiếp “áp dụng đi”. Đối chiếu default model mới và F&B category gate, thêm SchedulePage URL /schedule?view=3d để vào thẳng workspace (state initializer và search effect). Không đổi mặc định lịch tuần, phân quyền hoặc auth guard. Bốn kiểm tra runtime đạt: URL mở3D, scene thật version2/design=Oak & Moss, reload giữ3D/model, nút Về lịch ca thoát được. Kết thúc trong main app3D,1920×1080, ảnh store-013-applied.png. Dữ liệu nghiệp vụ/session/API vẫn là browser fixture.

Chạy lại144/144 tests, build PASS2,39giây (chunk warning còn), Store33/33 PASS. Một lần Store automation timeout chờ workstation inspector, quan sát thấy Zone được chọn trong lúc đổi camera; retry đạt33/33, không bỏ assertions hay đổi logic để bỏ qua lỗi.
