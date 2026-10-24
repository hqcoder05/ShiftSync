# Kiểm chứng toàn trang mới nhất

## EXPLORER-004 — Docker read + full-page Playwright mock (19/10/2026)

- Người dùng cho phép tạo mock, đọc Docker và chạy Playwright; sau đó yêu cầu test web trên màn hình rộng. Viewport chính đã chuyển **1920×1080** và trình duyệt được giữ ở kích thước này.
- Tái sử dụng EXPLORER-002/003 và các component hiện hữu. Docker read-only xác nhận 3 container backend/PostgreSQL/Redis đang chạy, Flyway mới nhất V42. Không restart container, migrate DB hoặc ghi dữ liệu nghiệp vụ.
- Tạo `scripts/explorer-full-mock.browser.cjs`: mở route `/schedule` thật, mock API và session chỉ tại trình duyệt, render canvas WebGL/GLB/avatar thật. Quan sát scene/camera qua R3F root để đo kết quả; chọn đối tượng qua mouse clicks trên canvas, chuyển mode và cửa hàng qua UI. Không gọi callback component thay cho hành vi người dùng.
- Full journey đạt **20/20 checkpoints** ở 1920×1080: GLB/avatar, orthographic, bấm workstation mở đúng inspector, ca/nhân sự/có mặt, thiết bị + POST mock, camera trạm đúng tọa độ đã chuyển, click Zone đổi camera, clear selection, Overview, ba lớp độc lập và khôi phục, đổi store trống không mang nhân sự/trạm/thiết bị cũ, không uncaught/console error. Equipment GET chỉ phát sinh một lần khi chọn trạm; một POST tạo fixture. Không chứng minh HTTP/JWT/JPA hoặc backend Equipment runtime.
- Lỗi runtime đã tìm và sửa: callback chọn cha Zone xóa workstation/staff; callback chọn trạm gọi lại controller dẫn tới RangeError tràn stack; raycast ăn vật thể ẩn hoặc model node chưa bind; top-down tiếp tục transition cũ; GLB loader không trả semantic layers khiến Furniture toggle không đổi scene; SchedulePage gọi handleStoreChange chưa định nghĩa; duplicate key `/settings` trên Navbar. Chuyển shadow sang PCFShadowMap để hết cảnh báo deprecation trong bản Three.js đang dùng.
- Sửa fit trang thực: CommandHeader wrap, KPI ribbon cuộn nội bộ, schedule action capsule wrap và Navbar thu gọn sớm hơn. Trang hẹp từng scrollWidth878 ở viewport390; sau sửa scrollWidth375. Đây là kiểm tra bổ sung trước khi người dùng yêu cầu ưu tiên màn hình rộng. Ở desktop cuối cùng: innerWidth1920, document.scrollWidth1905, không tràn ngang.
- File ứng dụng: SpatialWorkspace.jsx, components/canvas/DigitalTwinCanvas.jsx, camera/CameraManager.js, scene/DigitalTwinModelLoader.js, utils/sceneSelection.js (mới), pages/SchedulePage.jsx và .css, components/header/CommandHeader.jsx, components/kpi/StaffingKpiBar.jsx, store-explorer.css, components/navbar/Navbar.jsx và navbar.css. Test mới/bổ sung: sceneSelection.test.js, CameraManager.test.js, DigitalTwinModelLoader.test.js. Hai script browser hiện có dùng viewport rộng chính.
- Kiểm chứng cuối: **110/110 spatial tests PASS**; build PASS (1.79s, chunk warning >500kB vẫn còn); full-page mock journey20/20 PASS, không console/uncaught error. Thêm regression test cho hủy fly-to khi sang top-down và semantic layer index thật từ asset GLB.
- Ảnh: `.playwright-mcp/explorer-full-initial.png`, `explorer-full-verified.png`, `explorer-full-empty.png`; chụp từ trang/canvas thật dùng dữ liệu mock, không phải scene dùng dữ liệu Docker.
- Giới hạn: backend vẫn V42, chưa kiểm chứng API Equipment mới với xác thực thật/persistence. Camera đạt tọa độ và chuyển mode trong fixture, chưa bảo đảm đường bay tránh mọi vật thể ở mọi layout. Không nâng trạng thái tổng thể lên FULLY_IMPLEMENTED; vẫn PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS.

---

# Cập nhật giao diện mới nhất

## EXPLORER-003 — Hoàn thiện giao diện Store Explorer (19/10/2026)

- Tái sử dụng EXPLORER-001/002, policy quản lý theo canEditLayout và contract GET/POST/PUT Equipment; không sửa backend hoặc dependency.
- Thiết kế lại SpatialToolbar: tên cửa hàng, các góc nhìn luôn nhận biết được, nút khu vực/trạm disable khi thiếu target, ba công tắc Nội thất/Nhân sự/Điểm danh trực tiếp. Tùy chọn nâng cao giữ lọc kỹ năng, heatmap, xuyên tường, các lớp khác, mô phỏng và bố trí trạm. Đóng tùy chọn bằng Escape hoặc click ra ngoài.
- Inspector có nhóm chuyển Thông tin trạm / Nhân sự & ca / Thiết bị; truy cập thiết bị ngay mà không phải cuộn qua tọa độ. Trên màn hình nhỏ chuyển thành bảng dưới; camera xuống dòng thay vì cắt nút. Màu theo token theme hiện tại (--ss-surf, --ss-tx, --ss-mu, --ss-line, --ss-ac).
- Equipment: form thêm/sửa đầy đủ tên/mã/loại/trạng thái/ghi chú; validation độ dài/bắt buộc, giữ draft khi lỗi, báo trùng mã/không có quyền/lỗi API, khóa lưu đồng thời, phản hồi thành công. Chỉ ADMIN/MANAGER được sửa, và không sửa khi đang mô phỏng. Viewer chỉ xem; default quyền UI là false.
- Key component theo store/trạm để reset form, tránh trạng thái lưu/draft rò khi đổi cửa hàng. Request đọc vẫn có abort và stale-response guard.
- Sửa ưu tiên selection: chọn Zone bỏ staff/workstation cũ; chọn Workstation bỏ staff cũ và mở inspector. Nút xem trạm dùng workstation thực, bỏ đối tượng WS_PREMIUM_01 dựng sẵn. Lọc kỹ năng dùng tên phù hợp matcher hiện tại.
- File: SpatialToolbar.jsx, SpatialInspector.jsx, WorkstationEquipment.jsx, store-explorer.css (mới), SpatialWorkspace.jsx, services/layoutService.js; script kiểm thử scripts/test-store-explorer-ui.browser.cjs (mới).
- Kiểm chứng: npm run build PASS (935ms, cảnh báo chunk lớn vẫn còn); 105/105 spatial tests PASS; browser component suite cũ 7/7 tình huống PASS; suite UI mới 10/10 tình huống PASS (camera callbacks/pressed, lớp độc lập, Escape, empty, create, edit status, duplicate, API error giữ draft, viewer, mobile overflow).
- Ảnh .playwright-mcp/explorer-ui-wide.png (1440x1000, light manager), explorer-ui-narrow.png (390x844, light manager), explorer-ui-dark.png (390x844, dark viewer). Đánh giá độc lập theo skill design-ux đã phát hiện contrast/overflow/discoverability ở lần đầu; đã sửa, render lại và không còn blocker/major được quan sát trong fixture. Không suy rộng đánh giá này sang page/canvas thật.
- Lưu ý kiểm thử: route fixture chỉ dùng trong browser, không tạo nghiệp vụ giả hoặc ghi DB. Nút camera kiểm chứng callback và trạng thái UI, không chứng minh chuyển động/collision camera. Ảnh là component integration không có scene 3D. Backend container cũ và yêu cầu đăng nhập vẫn là giới hạn từ EXPLORER-002; V43 chưa triển khai vĩnh viễn. Trạng thái hệ thống: PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS.

---

# Interactive Store Explorer — EXPLORER-002

Ngày: 19/10/2026. Branch `quoc-backend`, HEAD `c9d4df15bd1ba3d802d297eb45312af40eaacd40`.
Trạng thái: **PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS**.

## Tri thức tái sử dụng và phân loại trước triển khai

Đã đọc PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP, AUDIT_INDEX và báo cáo EXPLORER-001; kiểm tra lại nguồn liên quan và working tree. Giữ mọi thay đổi sẵn có, không đổi branch, commit/push hoặc thêm dependency.

| Yêu cầu | Trước EXPLORER-002 | Sau triển khai và bằng chứng |
|---|---|---|
| Click Zone tự focus | Đã có callback và CameraManager từ EXPLORER-001 | Giữ nguyên; unit camera pass; chưa kiểm chứng canvas thật |
| Inspector nhân viên, ca và attendance | Đã có một phần, ghép suy diễn sai trạm/người | Chỉ nhận assignment có workstationId; bỏ suy diễn từ zone và attendance của người khác cùng trạm; regression pass |
| Equipment | Chưa có entity/API, chỉ có dòng thông báo | Thêm model, migration, API và component lấy dữ liệu thực; kiểm thử service, quyền và component pass |
| Furniture/Workforce/Attendance độc lập | Đã có, lỗi Attendance ở procedural fallback | Truyền options attendance/selection đầy đủ cả GLB và procedural; unit lớp/tag pass |
| Overview/Zone/Workstation | Đã có | Giữ camera manager; thêm xóa selection/focus khi entity biến mất; reset store đã có |
| Workforce đúng trạm | Avatar mới chỉ theo Zone | Avatar có assignment trạm dùng tọa độ trạm; trạm không tồn tại không render nhân viên ở trạm khác |
| Đồng bộ dữ liệu thật | Có API layout/zone/workstation/shift/attendance | Thêm nhánh equipment; hủy request khi đổi store/trạm, không dùng dữ liệu fixture trong ứng dụng |

## Thiết kế và API mới

Không tìm thấy model inventory/equipment trong nguồn backend. Chọn quan hệ một workstation có nhiều thiết bị; store ownership đi qua workstation, tránh nhân đôi store_id và rủi ro lệch ownership. Mã thiết bị duy nhất **trong workstation**, có thể trùng giữa hai trạm; chưa phải sổ tài sản duy nhất toàn cửa hàng. Trạng thái: `OPERATIONAL`, `MAINTENANCE`, `OUT_OF_SERVICE`, `RETIRED`. Tên/mã/loại bắt buộc, notes tùy chọn. PUT thay đầy đủ nội dung; dùng RETIRED thay cho API xóa thiết bị. Chưa có luồng chuyển thiết bị giữa các trạm hoặc lịch sử bảo trì, không thêm các nghiệp vụ ngoài yêu cầu.

Migration `V43__workstation_equipment.sql` chỉ tạo bảng mới, FK tới workstation, unique(workstation_id, code), CHECK status. Không sửa/xóa dữ liệu hiện có, không seed thiết bị. Khi xóa workstation, equipment của nó bị xóa theo cascade, cùng vòng đời trạm. Unique DB bảo vệ race tạo trùng; GlobalExceptionHandler hiện có trả 409 khi vi phạm constraint.

Base: `/api/stores/{storeId}/workstations/{workstationId}/equipment`

- `GET`: danh sách theo mã; ADMIN hoặc người có employment ACTIVE trong store, theo policy đọc workstation hiện tại.
- `POST`: tạo/gắn thiết bị vào trạm; ADMIN hoặc MANAGER thuộc store.
- `PUT /{equipmentId}`: cập nhật tên/mã/loại/trạng thái/notes, cùng quyền POST; kiểm tra equipment thuộc trạm.
- Ví dụ body: `{ "name": "<tên thực tế>", "code": "<mã thực tế>", "type": "<loại thực tế>", "status": "OPERATIONAL", "notes": null }`.
- Response: `id`, `workstationId`, `name`, `code`, `type`, `status`, `notes`. Danh sách rỗng trả `[]`; trạm không tồn tại 404; trạm khác store 403; sai validation 400; trùng mã 409.

Frontend Equipment chỉ đọc API, trình bày trạng thái, loading/empty/error, retry. Mount ở inspector khi chọn workstation. AbortController và key store/trạm chặn phản hồi cũ; không tải lại khi rerender cùng key. Furniture 3D không trở thành thiết bị inventory.

Thay đổi có chủ ý so với tri thức cũ: bỏ zone-fallback tự gán người vào workstation. Zone membership không chứng minh đang được phân công một trạm cụ thể. Nhân sự chỉ phân công Zone vẫn hiển thị tại Zone; không xuất hiện như người đã gán trạm. Attendance ưu tiên assignment ID; fallback staff chỉ nhận bản ghi không có assignment ID và có cùng shift ID. Không lấy attendance bất kỳ theo workstation.

## File tạo hoặc sửa trong EXPLORER-002

- `shiftsync-backend/src/main/java/com/shiftsync/layout/entity/Equipment.java`
- `shiftsync-backend/src/main/java/com/shiftsync/layout/dto/EquipmentRequest.java`
- `shiftsync-backend/src/main/java/com/shiftsync/layout/dto/EquipmentDto.java`
- `shiftsync-backend/src/main/java/com/shiftsync/layout/repository/EquipmentRepository.java`
- `shiftsync-backend/src/main/java/com/shiftsync/layout/service/EquipmentService.java`
- `shiftsync-backend/src/main/java/com/shiftsync/layout/controller/EquipmentController.java`
- `shiftsync-backend/src/main/resources/db/migration/V43__workstation_equipment.sql`
- `shiftsync-backend/src/test/java/com/shiftsync/layout/EquipmentServiceTest.java`
- `shiftsync-backend/src/test/java/com/shiftsync/layout/EquipmentAuthorizationTest.java`
- `ShiftSync-Web/src/services/layoutService.js`
- `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`
- `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx`
- `ShiftSync-Web/src/features/spatial-workspace/components/WorkstationEquipment.jsx`
- `ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx`
- `ShiftSync-Web/src/features/spatial-workspace/components/canvas/AvatarLayer.jsx`
- `ShiftSync-Web/src/features/spatial-workspace/components/canvas/WorkstationLayer.jsx`
- `ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.js`
- `ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.test.js`
- `ShiftSync-Web/src/features/spatial-workspace/DigitalTwinRegression.test.js`
- `scripts/test-workstation-equipment.browser.cjs`

Tài liệu cập nhật: báo cáo này, `docs/agent-memory/CHANGELOG.md`, `CODEBASE_MAP.md`, `TASK_MEMORY.md`.

## Kiểm thử thực tế

| Kiểm thử | Kết quả |
|---|---|
| Toàn bộ spatial `node --test` (danh sách qua rg) | **105/105 pass**, 0 fail. Test cũ zone-fallback được đổi thành yêu cầu không suy diễn trạm; thêm test chống ghép nhầm attendance |
| `npm run build` lần cuối | **PASS**, 915 ms; còn cảnh báo chunk >500 kB |
| `mvn test -Dtest=EquipmentServiceTest,EquipmentAuthorizationTest,ShiftAssignmentServiceTest` | **28/28 pass**: service 5, method-security authorization 4, assignment regression 19 |
| PostgreSQL migration | **PASS** `BEGIN; <V43>; SELECT count(*); ROLLBACK;` trên container shiftsync-db; bảng tạo thành công, 0 records, sau rollback bảng không tồn tại. Chưa kiểm chứng Flyway startup/JPA persistence end-to-end |
| Browser component Equipment | **7/7 tình huống pass**: loading, empty, chuyển store/trạm và phản hồi cũ, thiết bị/trạng thái, API lỗi, retry, clear selection. Script `scripts/test-workstation-equipment.browser.cjs`; fixture chỉ được chặn ở browser test, không lưu DB |
| Browser toàn bộ `/schedule` | Redirect `/login`, chưa có authenticated session; không kiểm chứng canvas/GLB/camera thực tế |
| Diff whitespace trên tracked files task chính | PASS; không sửa lỗi whitespace sẵn có ở các file ngoài scope |

Authorization tests chạy Spring method-security proxy thật và StoreAccessService mock cho membership; service tests xác minh workstation thuộc store và equipment thuộc workstation. Đây không phải HTTP/JWT hoặc database integration test. Browser component dùng route fixture nên không phải bằng chứng API thật hoạt động trên container đang chạy.

## Giới hạn và việc còn lại

1. Backend container đang chạy bản cũ. V43 **chưa áp dụng vĩnh viễn**, chưa restart/deploy; cần khởi động backend bằng mã mới để Flyway chạy trước khi UI dùng endpoint mới. Hiện môi trường cũ có thể trả lỗi Equipment và UI sẽ hiển thị error/retry đúng thiết kế.
2. Chưa có session đăng nhập hợp lệ để kiểm chứng canvas với dữ liệu thật. Không bypass RBAC hoặc chèn token. Cần chạy các journey Overview → Zone → Workstation, click, đổi store, bật/tắt từng lớp với Manager hợp lệ.
3. Camera có fly-to và presets hiện hữu; chưa có bằng chứng đường bay tránh mọi vật thể GLB, nhất là trạm sát tường hoặc layout bất thường. Không tuyên bố đã đáp ứng tuyệt đối tiêu chí không xuyên vật thể.
4. Avatar tọa độ trạm đã sửa ở nguồn và build đạt, chưa kiểm chứng trực quan trong WebGL. Equipment service và quyền đã có test, nhưng HTTP/JWT, Flyway startup và persistence thực tế còn cần kiểm chứng cùng backend mới.
5. Furniture vẫn theo GLB/procedural đã có, không có kho nội thất theo từng bản ghi. Không dùng inventory mới để giả định nội thất 3D.

Vì các giới hạn kiểm chứng runtime còn tồn tại, chưa đánh dấu FULLY_IMPLEMENTED.

---

## Lịch sử EXPLORER-001 (giữ lại để truy vết; kết luận equipment bên dưới đã được EXPLORER-002 thay thế)

# Interactive Store Explorer — Audit & Implementation

**Ngày:** 19/10/2026  
**Branch:** `quoc-backend`  
**Baseline:** `c9d4df1`  
**Kết luận:** `PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS`

## Tóm tắt

ShiftSync đã có workspace Three.js/R3F gắn dữ liệu zone, workstation, ca/phân công và điểm danh. Source trước task còn thiếu thao tác tự focus camera khi click zone, công tắc Attendance độc lập, trạng thái chọn trạm dễ nhận biết, và phân biệt mô hình GLB quán cà phê với các loại cửa hàng khác. Các khoảng trống frontend có thể khắc phục an toàn đã được sửa.

Backend có API cho layout, zones, workstations, assignments và attendance. Không tìm thấy entity hoặc API quản lý danh sách thiết bị gắn với workstation. Không thêm migration/quan hệ thiết bị vì việc đó làm thay đổi mô hình và hợp đồng dữ liệu ngoài bằng chứng hiện có. Thiết bị vẫn là khoảng trống nghiệp vụ.

Build và 61 test spatial liên quan đều đạt. Không xác minh được journeys trong canvas thật: trình duyệt mở trang login, nhưng hai tài khoản seed được thử đều bị backend từ chối; không có cơ chế test session được hỗ trợ khác và không dùng cách bỏ qua RBAC. Vì vậy các tương tác UI vẫn cần xác minh trực tiếp sau khi có tài khoản Manager test hợp lệ.

## Ma trận truy vết F1–F5

| Yêu cầu | Trạng thái | Bằng chứng hiện tại | Tác động / nguyên nhân | Giải pháp và phụ thuộc | Cách xác minh |
|---|---|---|---|---|---|
| **F1 — Workspace 3D mở và nhận dữ liệu cửa hàng** | **PARTIAL** | `/schedule` render `Store3DCanvas` tại `ShiftSync-Web/src/pages/SchedulePage.jsx`; canvas dùng R3F, `ZoneVisualizationLayer`, `WorkstationLayer`, `AvatarLayer` trong `ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx`. API layout/workstations/zones ở `LayoutController`; shifts và attendance ở controllers tương ứng. Toạ độ API được đổi sang trục Three.js bởi `toThreeCoords` trong `spatial.constants.js`. | Workspace dựa vào dữ liệu zone/workstation thực; nội thất zone vẫn được tạo theo quy tắc nghiệp vụ từ tên/loại zone, không có bảng furniture. Trước sửa, GLB cà phê được nạp không phân biệt loại cửa hàng. Runtime canvas chưa được mở do login test không thành công. | Đã truyền `store.category` đến workspace; chỉ dùng coffee shop GLB cho `FOOD_BEVERAGE`, còn loại khác dùng shell procedural và zone/workstation dữ liệu thật. Không có furniture inventory để dựng nội thất chính xác theo từng bản ghi. | Mở `/schedule` với Manager; kiểm tra F&B dùng GLB, loại khác dùng shell procedural; so vị trí zone/workstation với API; thử store không có zone/trạm và lỗi API. Chưa chạy được journey này trong browser. |
| **F2 — Chọn Zone tự đưa camera đến đúng khu vực** | **PARTIAL** | `DigitalTwinCanvas` raycast xác định zone từ `userData`; `SpatialWorkspace.handleFocusZone` gọi `FOCUS_ZONE`; `CameraManager` đổi tọa độ bằng `toThreeCoords` và fly-to; có test CameraManager cho focus mode. | Trước sửa, callback click zone chỉ set selection, không gọi focus; cần thêm thao tác “Zoom cận cảnh”. | Đã nối chọn zone trong 3D canvas tới `handleFocusZone`. Toạ độ lưu API (X dài, Y rộng, Z cao) được chuyển đúng sang Three.js (X, Z mặt sàn, Y độ cao). Không cần backend mới. | Trong canvas click 2 zone liên tiếp, quan sát camera dừng tại tâm từng zone; kiểm tra target qua tọa độ và thử zone thiếu/không hợp lệ. Test camera có, browser journey chưa xác minh. |
| **F3 — Chọn Workstation và xem nhân sự, ca, thiết bị** | **PARTIAL** | Canvas raycast workstation → `selectedWorkstation` → `SpatialInspector`. `resolveWorkstationOccupancies` ghép assignment (trực tiếp workstation hoặc fallback zone) với attendance. Inspector có nhân viên, skill, trạng thái có mặt/theo lịch, sức chứa. API attendance DTO trả staff, zone, workstation, check-in/out; assignment DTO trả staff/zone/workstation. | Ca đang xem không được trình bày rõ ở trạm; không có danh sách thiết bị gắn theo quan hệ workstation. `Workstation` chỉ có tên/mã/loại/toạ độ/sức chứa/trạng thái. | Đã thêm thông tin ngày và giờ của ca được chọn vào inspector; thêm nhãn rõ rằng chưa có dữ liệu thiết bị cho trạm. Không tạo dữ liệu nhân viên/ca giả. Thiết bị cần xác định schema/ownership/API nghiệp vụ trước migration. | Click hai workstation, đối chiếu inspector với API và ca đang chọn; xác minh trường hợp không phân công, chưa điểm danh, lỗi API; kiểm tra equipment khi backend có capability. Browser chưa chạy được. |
| **F4 — Toggle Furniture, Workforce, Attendance độc lập** | **PARTIAL** | Toolbar gọi `setLayers`; `showFurniture` điều khiển nội thất zone/GLB, `showStaff` điều khiển avatar. Attendance hiện diện qua màu/nhãn workstation từ dữ liệu occupancy. | Trước sửa không có `showAttendance`; attendance và workforce/furniture không có đủ ba nút độc lập theo yêu cầu. | Đã thêm `showAttendance` vào `DEFAULT_LAYERS`, nút toolbar và prop xuống `WorkstationLayer`; khi tắt lớp, tag bỏ thông tin có mặt và trở về trạng thái phân công trung tính. Giữ nguyên Furniture/Workforce độc lập. | Unit test kiểm tra state toggle độc lập; test tag kiểm tra option attendance/selection; browser cần tắt/bật từng lớp và quan sát objects. |
| **F5 — Overview, Zone, Workstation** | **PARTIAL** | `CameraManager` hỗ trợ Overview, Top-down, focus zone, focus workstation; toolbar đã có Overview và các nút focus trong inspector. | Trước sửa, Zone/Workstation không có nút chế độ riêng dễ nhận biết trên toolbar; selection workstation không làm nổi bật tag. Chưa xác minh runtime lặp chế độ. | Đã thêm nút `Khu vực` và `Trạm` có trạng thái `aria-pressed` khi entity được chọn; tag workstation được viền tím khi selected. Nút chỉ hiện khi target hợp lệ, nên thiếu target không gây mode rỗng. Đổi store sẽ xoá selection và đưa camera về Overview. | Chuyển Overview → Zone → Workstation → Overview nhiều lần; target không còn thì nút focus biến mất; đổi store để xác minh không rò selection. Unit camera tests đạt, browser chưa xác minh. |

## Root cause và thay đổi đã làm

1. **Zone selection không đồng nghĩa camera focus:** canvas chỉ cập nhật selected entity. Callback riêng cho 3D giờ gọi focus preset; thao tác từ các UI 2D không tự đổi mode.
2. **Attendance không phải lớp hiển thị độc lập:** trước đó nó chỉ ảnh hưởng màu/nhãn occupancy. `showAttendance` hiện điều khiển phần overlay điểm danh trên tag, độc lập với Furniture và avatar Workforce.
3. **Workstation thiếu feedback chọn:** prop selection chưa dùng khi dựng tag. Tag hiện có viền khác màu khi trạm đang chọn và dựng lại khi selection đổi.
4. **Mô hình demo không theo loại cửa hàng:** mọi store trước đây nạp coffee shop GLB. Category giờ đi từ store/template đến workspace; loại khác không nạp GLB cà phê.
5. **Thông tin inspector:** hiển thị ca đang chọn và nêu rõ thiết bị chưa được hệ thống quản lý; không suy diễn `workstationType` thành inventory thiết bị.
6. **Store context:** khi đổi store, selection zone/staff/workstation và focus target được xoá, camera trở về Overview.

Các file ứng dụng chỉnh trong task: `SpatialWorkspace.jsx`, `SpatialToolbar.jsx`, `SpatialInspector.jsx`, `state/spatialViewStore.js`, `components/canvas/DigitalTwinCanvas.jsx`, `CoffeeShopModel.jsx`, `WorkstationLayer.jsx`, `scene/FurnitureBuilder.js`, `scene/FurnitureBuilder.test.js`, `state/spatialViewStore.test.js`, `SchedulePage.jsx`, `Store3DManager.jsx`.

Không chỉnh backend. Đã đối chiếu `layout/entity/Workstation.java`, DTO, `LayoutController`, `ShiftAssignmentResponseDTO`, `AttendanceDTO` và migration spatial. Backend có store isolation cho endpoint đọc nhưng không có equipment entity/relationship/API.

## Kiểm thử và runtime

| Lệnh / journey | Kết quả |
|---|---|
| `node --test` với 9 file spatial: store, FurnitureBuilder, CameraManager, R3F integration, model loader, scene/resource, occupancy, drag controller, PlayerController | **61 passed, 0 failed** |
| `npm run build` | **PASS**, lần chạy cuối thành công trong 887ms. Có cảnh báo chunk lớn hơn 500 kB (index JS ~2.04 MB trước gzip); không phát sinh lỗi build. |
| `git diff --check` | Exit code 1 do 4 dòng trailing whitespace trong diff: 2 dòng `Header.jsx`, 1 dòng `PlayerController.js`, 1 dòng `ShiftAssignmentRepository.java`. Các file này có chỉnh sửa trước task và không thuộc file task này chỉnh; không tự ý sửa/xóa thay đổi của người dùng. |
| Browser tại `http://127.0.0.1:3000/` | Trang login hiển thị. Quick-fill manager và tài khoản seed admin đều trả “Sai email hoặc mật khẩu”. Không đăng nhập thành công, nên không tuyên bố đã xác minh scene/interactions thật. |
| Browser console | Không ghi nhận warn/error tại trang login. Đây không phải bằng chứng cho runtime canvas. |
| E2E framework | `package.json` không khai báo Playwright/Cypress hay script E2E. Không cài dependency theo ràng buộc task. |
| Backend tests | Không chạy vì không sửa backend; ngoài ra chưa xác minh API integration qua UI. |

## Giới hạn còn lại và thứ tự tiếp theo

1. **Ưu tiên cao:** cung cấp Manager test account hợp lệ để chạy Journey A–F trên browser, kiểm tra chuyển camera và visibility thực tế.
2. **Ưu tiên cao:** xác định yêu cầu và nguồn dữ liệu cho thiết bị (entity, trạm sở hữu thiết bị, trạng thái thiết bị, quyền xem, endpoint); sau đó mới triển khai migration/API và UI.
3. **Ưu tiên vừa:** bổ sung dữ liệu furniture layout theo store nếu cần tránh quy tắc nội thất suy ra từ tên zone.
4. **Ưu tiên vừa:** cấu hình E2E hiện có nếu tổ chức muốn regression browser tự động; hiện chưa có dependency hay script trong package.

## Git và phạm vi

Branch vẫn là `quoc-backend`, HEAD `c9d4df1`. Working tree vốn đã có nhiều tracked modifications và untracked files trước task; không reset/checkout/stash/commit/clean hay stage thay đổi. `git diff --stat` là tổng thay đổi từ baseline, không thể coi là phần riêng của task này. Các cập nhật task này chỉ nằm trong những file liệt kê ở trên cùng báo cáo này; backend không được sửa.
