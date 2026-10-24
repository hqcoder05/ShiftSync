# ShiftSync — Audit & Verification Index (AUDIT INDEX)
Mã tài liệu: `docs/agent-memory/AUDIT_INDEX.md`  
Cập nhật lần cuối: 24/10/2026 | Danh mục tra cứu nhanh các đợt kiểm toán và sửa lỗi

---

## 1. Bảng tra cứu Danh mục Kiểm toán & Sửa lỗi (Audits & Remediation Index)

| Task / Audit ID | Báo cáo chi tiết | Phạm vi (Scope) | Kết luận cốt lõi | Vấn đề còn mở (Open Findings) | Trạng thái chứng cứ & Baseline | Điều kiện tài liệu trở nên lỗi thời (Stale Trigger) |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **AUD-001.1** | [AUD-001.1_INVENTORY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-001.1_INVENTORY.md) | Rà soát toàn diện hiện trạng mã nguồn Digital Twin Web & Backend | Lập danh mục toàn bộ component, API endpoint, và phát hiện các khoảng trống What-If | Phát hiện thiếu xử lý SWAP & LEAVE trong simulation | `[VERIFIED]` (Baseline ban đầu) | Tái cấu trúc cấu trúc thư mục hoặc đổi tên component. |
| **AUD-001.2** | [AUD-001.2_FINDINGS.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-001.2_FINDINGS.md) | Phân tích luồng dữ liệu, diff types, và rủi ro đồng thời | Xác định 4 loại diff What-If: `ASSIGN`, `TRANSFER`, `SWAP`, `LEAVE_ABSENCE`. Phát hiện nguy cơ partial persistence | SWAP chưa được hỗ trợ atomic ở backend | `[VERIFIED]` (Baseline ban đầu) | Thay đổi giao thức hoặc format của diff object trong `simulationStore`. |
| **AUD-001.3** | [AUD-001.3_CONCURRENCY_AUDIT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-001.3_CONCURRENCY_AUDIT.md) | Kiểm toán sâu race condition và đa quản lý (Multi-Manager Concurrency) | Chứng minh nguy cơ lost updates khi 2 quản lý đồng thời swap nhân sự | Yêu cầu triển khai endpoint atomic swap có pessimistic locking | `[VERIFIED]` (Baseline ban đầu) | Thay đổi mức độ cô lập giao dịch DB hoặc loại bỏ khóa bi quan. |
| **FIX-001A** | [FIX-001A_TRANSFER_REPAIR.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/FIX-001A_TRANSFER_REPAIR.md) | Sửa lỗi kéo thả phân bổ và điều chuyển nhân sự (Transfer) | Sửa cơ chế cập nhật vị trí Three.js avatar và đồng bộ hóa trạng thái ca làm việc | Đã giải quyết triệt để | `[VERIFIED]` (c9d4df1) | Thay đổi cơ chế kéo thả `DragTransfer.js`. |
| **FIX-001B** | [FIX-001B_DIFF_COVERAGE.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/FIX-001B_DIFF_COVERAGE.md) | Mở rộng độ phủ diff What-If cho `SWAP` và `LEAVE_ABSENCE` | Bổ sung đầy đủ xử lý diff types trong `SpatialWorkspace.jsx` | SWAP cần backend hỗ trợ atomic API | `[VERIFIED]` (c9d4df1) | Thay đổi logic áp dụng simulation trong `SpatialWorkspace.jsx`. |
| **FIX-001C** | [FIX-001C_ATOMIC_SWAP_DESIGN.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/FIX-001C_ATOMIC_SWAP_DESIGN.md) | Thiết kế & triển khai API đổi ca đồng thời (Atomic SWAP) | Tạo endpoint `POST .../assignments/swap`, áp dụng `PESSIMISTIC_WRITE` theo thứ tự canonical staff UUID. 21/21 tests pass | Đã giải quyết triệt để rủi ro partial persistence | `[VERIFIED]` (c9d4df1, 21/21 tests pass) | Thay đổi signature của DTO `ShiftZoneSwapRequest` hoặc query repository. |
| **AUD-001.4** | [AUD-001.4-RUNTIME-UAT-VERIFICATION.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-001.4-RUNTIME-UAT-VERIFICATION.md) | Xác minh UAT runtime trên trình duyệt | 30/30 tests pass, frontend build thành công, 55 FPS, bộ nhớ JS Heap ~70MB ổn định | Kiểm tra hiệu năng lâu dài | `[VERIFIED]` (c9d4df1) | Thay đổi Three.js version hoặc nâng cấp Vite bundler. |
| **AUD-001.5** | [AUD-001.5-PERFORMANCE-RELIABILITY-RELEASE.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-001.5-PERFORMANCE-RELIABILITY-RELEASE.md) | Đánh giá độ tin cậy, bảo mật và hiệu năng phát hành | Đạt tiêu chuẩn phát hành sản phẩm (Release Candidate Ready) | Cần đối chiếu mô hình dữ liệu không gian | `[VERIFIED]` (c9d4df1) | Thay đổi cấu hình production build của Web. |
| **AUD-001.6** | [AUD-001.6-RELEASE-CANDIDATE-DEPLOYMENT-REHEARSAL.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-001.6-RELEASE-CANDIDATE-DEPLOYMENT-REHEARSAL.md) | Diễn tập triển khai toàn hệ thống và đóng băng artifact | Đóng băng artifact, xác nhận `React.lazy` và `Suspense` hoạt động tách Three.js chunk | Không | `[VERIFIED]` (c9d4df1) | Thay đổi routing code-splitting trong Web. |
| **AUD-002** | [AUD-002-API-SPATIAL-DATA-MODEL-RECONCILIATION.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-002-API-SPATIAL-DATA-MODEL-RECONCILIATION.md) | Đối chiếu API và mô hình dữ liệu không gian (Spatial Data Model) | Phát hiện 3 khoảng trống tích hợp Web: `GAP-SP-001` (chưa fetch Workstations API), `GAP-SP-002` (nhầm lẫn Staff ID vs Assignment ID), `GAP-SP-003` (thiếu Layer Switcher) | Chuyển giao sang task `WEB-001` | `[VERIFIED]` (c9d4df1) | Thay đổi schema bảng `workstations` hoặc `store_zones`. |
| **EXPLORER-001** | [INTERACTIVE-STORE-EXPLORER-AUDIT.md](../../INTERACTIVE-STORE-EXPLORER-AUDIT.md) | Đối chiếu và hoàn thiện trải nghiệm Interactive Store Explorer F1–F5 | Sửa zone focus, attendance toggle, selection feedback, camera mode affordance và chọn mô hình theo category | Thiếu equipment inventory; browser journey chờ Manager test account hợp lệ | `[PARTIAL]` (19/10/2026; 61 tests + build pass, browser blocked at login) | Thay đổi scene/camera/workstation/attendance APIs hoặc xác minh browser runtime thành công. |
| **WEB-001** | [WEB-001-DIGITAL-TWIN-WORKSTATION-INTEGRATION.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/WEB-001-DIGITAL-TWIN-WORKSTATION-INTEGRATION.md) | Hoàn thiện tích hợp dữ liệu không gian & lớp trạm làm việc (Workstation Layer) | Đã giải quyết trọn vẹn cả 3 khoảng trống: W-02 (staffIdentity), W-01 (tích hợp API trạm làm việc), W-03 (Layer Switcher & triệt tiêu va chạm mesh). 14/14 tests Web pass, 21/21 tests Backend pass | Không | `[VERIFIED]` (c9d4df1) | Thay đổi logic quản lý layer trong `SpatialToolbar.jsx`. |
| **PHASE-2A** | [PHASE-2A-WORKSTATION-LAYOUT-EDITOR.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/PHASE-2A-WORKSTATION-LAYOUT-EDITOR.md) | Bố trí trạm làm việc 3D (Workstation Layout Editor) | Triển khai kéo thả raycasting sàn, kiểm tra va chạm, hoàn tác, RBAC guard, tích hợp API `PUT .../workstations/{id}`. 21/21 tests Web pass, 19/19 tests Backend pass | Không | `[VERIFIED]` (c9d4df1) | Thay đổi `WorkstationDragController.js` hoặc API `PUT /api/stores/{storeId}/workstations/{id}`. |
| **PHASE-2B** | [PHASE-2B-WORKSTATION-OCCUPANCY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/PHASE-2B-WORKSTATION-OCCUPANCY.md) | Trực quan hóa phân công & hiện diện trạm làm việc (Workstation Occupancy & Staff Presence) | Phân định 3 trạng thái (`ASSIGNED`, `UNASSIGNED`, `UNKNOWN`), phân tách Hiện diện thực tế vs Lịch ca qua Attendance API, mở khóa `workstationId` DTO, tag sprite trực quan và thẻ Inspector. 28/28 tests Web pass, 19/19 tests Backend pass | Không | `[VERIFIED]` (c9d4df1) | Thay đổi `workstationOccupancy.js` hoặc API `/api/stores/{storeId}/attendance`. |
| **PHASE-2C** | [PHASE-2C-REGRESSION-RELIABILITY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/PHASE-2C-REGRESSION-RELIABILITY.md) | Kiểm thử hồi quy tích hợp & Độ tin cậy toàn diện (Integration Regression & Reliability) | Kiểm chứng 6 kịch bản bắt buộc: Persistence, Occupancy, Attendance, Async Store Isolation, RBAC & Cross-feature. Bổ sung Store Isolation Guard và Save Guard phòng thủ chiều sâu. 45/45 tests Web pass, 37/37 tests Backend pass | Không | `[VERIFIED]` (c9d4df1) | Thay đổi `DigitalTwinRegression.test.js` hoặc logic guard trong `SpatialWorkspace.jsx`. |
| **PHASE-3** | [PHASE-3-AUTOSCHEDULE-AUDIT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/autoschedule/PHASE-3-AUTOSCHEDULE-AUDIT.md) | Đánh giá, chuẩn hóa ràng buộc & tối ưu hóa xếp ca tự động (AutoSchedule Engine) | Kiểm chứng ma trận ràng buộc HC1-HC5, SC1-SC6, thuật toán Dynamic MRV + Local Repair, phủ kín 8/8 kịch bản biên (rỗng, thiếu dung lượng, trùng ca, quá giờ tuần, vi phạm giờ nghỉ, nghỉ phép, trung thực không ghost assignments). Mở rộng suite lên 25/25 tests pass; toàn backend 488/488 tests pass. | Không | `[VERIFIED]` (c9d4df1, 99/99 scheduling tests pass) | Thay đổi logic `AutoScheduleService.java` hoặc công thức tính điểm `calculateScore`. |
| **REQ-001** | [REQ-001-MVP-REQUIREMENTS-MATRIX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/requirements/REQ-001-MVP-REQUIREMENTS-MATRIX.md) | Đặc tả Yêu cầu Nghiệp vụ & Ma trận Tiêu chí Nghiệm thu MVP 4 Tuần | Chốt ranh giới MVP 4 tuần cho 4 module cốt lõi (M1-M4) và 2 chế độ camera phần cứng (QR Scanner & Live Selfie). 19 yêu cầu đo lường được (16 P0, 3 P1), 100% P0 ánh xạ test suite, kế hoạch 4 tuần và 5 câu hỏi mở. | 5 câu hỏi mở (Q-REQ-01..05) chờ duyệt | `[VERIFIED]` (c9d4df1) | Thay đổi phạm vi sản phẩm hoặc chấp thuận đề xuất mới. |
| **ARC-001** | [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md) | Thiết kế Kiến trúc Visualization Layer 3D Digital Twin | Phân rã `SpatialWorkspace.jsx` thành 6 phân lớp, chuẩn hóa trên Pure Three.js r185+, phân định 3 tầng trạng thái, bảo tồn 45 tests Web & 21 tests concurrency | DEC-01..04 chờ Tech Lead duyệt | `[VERIFIED]` (c9d4df1) | Tái cấu trúc cấu trúc thư mục hoặc thay đổi `SpatialWorkspace.jsx`. |
| **ARC-001-IMP** | [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md) | Triển khai Kiến trúc Visualization Layer Phân lớp theo ADR-ARC-001 | Triển khai thành công 3 module cốt lõi: ARC-IMP-01 (`spatialViewStore.js`), ARC-IMP-02 (`CameraManager.js`), ARC-IMP-03 (`ResourceManager.js`, `SceneGraphManager.js`). 68/68 Web tests pass 100%, Vite build hoàn tất trong 656ms. | ARC-IMP-04 (dọn dẹp bundle) giữ trạng thái `BLOCKED_PENDING_APPROVAL` chờ phê duyệt Tech Lead | `[VERIFIED]` (c9d4df1, 68/68 Web tests pass) | Sửa đổi contract của `spatialViewStore`, `CameraManager`, hoặc `SceneGraphManager`. |
| **ARC-001-VERIFY** | [ARC-001-VERIFICATION-REPORT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ARC-001-VERIFICATION-REPORT.md) | Độc lập Kiểm chứng & Nghiệm thu Kiến trúc Visualization Layer 3D Digital Twin | Phán quyết: `ACCEPTED_WITH_FOLLOW_UPS`. 68/68 Web tests pass (15 suites), 46/46 Backend regression tests pass (3 suites), Vite build hoàn tất trong 982ms (chunk 250.89 kB, gzip 66.23 kB). 100% các ràng buộc kỹ thuật được bảo tồn. | Q-ARC-01 chờ duyệt gỡ experimental dependencies | `[VERIFIED]` (c9d4df1, 68/68 Web tests pass, 46/46 Backend tests pass) | Bất kỳ thay đổi cấu trúc nào tại `features/spatial-workspace/` hoặc thay đổi baseline. |

---

## 2. Hướng dẫn tra cứu nhanh cho Agent

- SCROLL-018 (20/10/2026): [Cuộn Định biên](../audit/ui/SCROLL-018-DEMAND-WORKSPACE-SCROLL.md), portal và một vùng cuộn dọc; browser mock desktop/mobile và SCROLL-014 regression PASS. Stale khi thay modal lifecycle/overflow/portal.
- SCHED-017 (20/10/2026): [Định biên ca](../audit/ui/SCHED-017-DEMAND-PLANNING-REDESIGN.md), build/browser mock desktop/mobile PASS; lint còn lỗi cũ. Stale khi thay DTO quota, CSS bảng hoặc handlers.
- SCHED-016 (20/10/2026): [Khả dụng nhân sự](../audit/ui/SCHED-016-STAFF-AVAILABILITY-REDESIGN.md), build/browser mock 1920/390 PASS, ESLint 0 lỗi/5 cảnh báo hook. Stale khi sửa availability JSX/CSS, role colors hoặc theme tokens.
- SCROLL-014 (20/10/2026): [Khôi phục cuộn toàn trang](../audit/ui/SCROLL-014-GLOBAL-SCROLL-RECOVERY.md), 9 browser checks/build/ESLint Navbar PASS. Body lock chỉ do Navbar quản lý; stale nếu sửa overlay lifecycle, MainLayout route key hoặc thêm module khóa cuộn khác.
- DASH-012 (20/10/2026): [Dashboard vận hành](../audit/ui/DASH-012-DASHBOARD-REDESIGN.md), 24 browser checks/build/lint UI PASS với API mock. Tái sử dụng NAV-011/EXPLORER-013; stale nếu sửa DashboardPage data, Dashboard.jsx/CSS, Timeline/chart/spatial summary hoặc API.
- NAV-011 (20/10/2026): [Navbar redesign](../audit/ui/NAV-011-NAVBAR-REDESIGN.md),29Navbar+33Store browser checks/144tests/build/lint2modules PASS. Tái sử dụng NAV-010/theme contracts; stale khi sửa Navbar,navbar-layout.css,theme,MainLayout store/notification callbacks hoặc Settings querytabs. Known lint/draftguard/realAPI limits ghi trongreport.

Khi nhận một nhiệm vụ mới:
1. Xác định domain nhiệm vụ (ví dụ: *Spatial Data*, *Concurrency*, *What-If Diff*, hay *Auth*).
2. Tra cứu cột **Task / Audit ID** trong bảng trên để lấy báo cáo gốc có liên quan.
3. Chỉ đọc báo cáo tương ứng, **không đọc quét toàn bộ thư mục `docs/`**.
4. Luôn kiểm tra cột **Điều kiện tài liệu trở nên lỗi thời (Stale Trigger)**: nếu các file nguồn trong trigger bị chỉnh sửa sau ngày báo cáo, bắt buộc phải re-verify bằng lệnh kiểm thử hoặc đọc trực tiếp file đó.

- EXPLORER-006 (19/10/2026): [Giao diện và bố trí cửa hàng](../audit/digital-twin/EXPLORER-006-LAYOUT-IMPLEMENTATION.md);117 tests + build +26 full-page mock checkpoints.


- SCHED-015 (20/10/2026): [Thiết kế lại Schedule](../audit/ui/SCHED-015-SCHEDULE-REDESIGN.md) — header/toolbar/bảng/empty/mobile/theme; giữ nguyên màu vị trí và sọc chéo. Build + Playwright mock desktop/mobile/3D; ESLint SchedulePage còn lỗi cũ. Stale khi đổi SchedulePage JSX/CSS hoặc palette vị trí.

- EXPLORER-007 (19/10/2026): sửa mất POS, cạnh Barista; xem TASK_MEMORY/CODEBASE_MAP;119 tests + build +26 mock checkpoints.


- EXPLORER-008 (19/10/2026): [Bố trí quán cà phê](../audit/digital-twin/EXPLORER-008-CAFE-LAYOUT.md),122 tests + build +33 Playwright mock checkpoints.


- EXPLORER-009 (19/10/2026): [3D experience audit](../audit/digital-twin/EXPLORER-009-3D-EXPERIENCE-AUDIT.md) — NEEDS_FIXES;33 regression checks pass nhưng5 nhóm UX3D issues được xác nhận bằng kiểm tra bổ sung.


- EXPLORER-010 (19/10/2026): [Experience fixes](../audit/digital-twin/EXPLORER-010-EXPERIENCE-FIXES.md) —128 tests+build+33/14 browser checks; sửa5 nhóm lỗi009.


- AUTO-025 (20/10/2026): [Auto-Scheduler Visualization](../audit/autoschedule/AUTO-025-VISUALIZATION.md) — kết quả backend, comparison/replay/3D; API chưa có dry-run hoặc lý do phân công.
- EXPLORER-011 (19/10/2026): [Schedule Planner prototype](../audit/digital-twin/EXPLORER-011-SCHEDULE-PLANNER-PROTOTYPE.md) —135 tests+build+20/33/14 browser checks; draft→eligible recheck→Apply, API mock.

- EXPLORER-012 (19/10/2026): [Crew V2 character redesign](../audit/digital-twin/EXPLORER-012-CREW-REDESIGN.md) —141 tests+build; Crew7/Store33/experience14/Planner20 browser checks. Bốn model versioned, shared fallback và khớp gối/khuỷu. Stale khi đổi CrewModel/loader/animation hoặc tái xuất GLB; chưa xác minh LOD/skinning/tải lớn.

- EXPLORER-013 (19/10/2026): [Oak & Moss store redesign](../audit/digital-twin/EXPLORER-013-STORE-MODEL-REDESIGN.md) —144 tests+build,33/14/20/11 browser checks; model mới169meshes/39.858tris/1,65MB, cùng semantic/geometry/collision contract. Stale khi đổi CafeStoreModel/generator/GLB/loader/StoreArrangement. Model minh họa, chưa đo chi nhánh thật hoặc benchmark thiết bị khác.


## OPS-026 — Vận hành realtime (21/10/2026)
Tái sử dụng PHASE-2B/PHASE-2C/EXPLORER-013. Header 3D có connection và thời điểm nhận event; attendance/shift/marketplace refresh theo store, reconnect resync, loại ca CANCELLED. Backend thêm event assignment create/move/remove/zone-swap, marketplace publish/unpublish/claim và cancel/delete. Publisher chỉ phát store event sau commit; rollback không phát.
Kiểm chứng: web build PASS (cảnh báo chunk), Node3/3, Maven25/25; Edge155 1920×1080 xác nhận event khác store bị bỏ qua, attendance/marketplace/reconnect REST refresh, không tràn ngang; Planner regression20 PASS. Browser dùng REST fixtures/DOM event injection; backend8080 offline, chưa STOMP end-to-end giữa thiết bị. Chưa bổ sung event cho swap-request service ngoài swapStaffZones. Git diff check có whitespace cũ ngoài scope. Chưa deploy backend.
Contract: /ws/websocket; /topic/store/{storeId}/{shifts|attendance|marketplace|requests}; envelope storeId/domain/action/data/timestamp. Attendance legacy dùng data.action. Stale khi thay publisher, topics, shift/attendance DTO hoặc workspace data flow.

## CREW-027 — Model theo giới tính (21/10/2026)
Tái sử dụng Crew V2/EXPLORER-012 và skill 3d-web-experience. Bổ sung 4 GLB nữ cho barista/cashier/manager/chef, cùng joint hierarchy, 513–620KB/model; cache/fallback theo role+gender. Model nam mặc định; không suy đoán tên/vai trò. AvatarLayer thay model khi gender đổi. Schedule, SpatialWorkspace và Planner draft giữ gender.
User entity/DTO/create/update + EmploymentDTO + ShiftAssignmentResponseDTO mang gender; V44 thêm staff.gender default MALE và CHECK MALE/FEMALE/OTHER. Form AddUserModal/EmployeeDetail gửi gender lên backend; hồ sơ hiển thị Nam/Nữ/Khác. OTHER dùng model nam hiện tại. Migration chưa chạy trên DB; dữ liệu giới tính localStorage cũ không được tự suy đoán/migrate.
Kiểm chứng: 15 character tests PASS, build PASS (chunk warning), backend compile + UserCreationRbacTest/ShiftAssignmentServiceTest + UserGenderTest PASS. Edge1920: 4 female GLB load, đi bộ; fixture assignment FEMALE tạo avatar nữ trong scene thực. Chưa kiểm chứng lưu hồ sơ trên backend thật vì backend chưa khởi chạy. Preview /crew-preview.html?gender=FEMALE, ảnh .playwright-mcp/crew-female.png. Stale khi sửa DTO/mapping/generator/gender normalization/avatar reconciliation.

### CREW-028 — Nữ tóc dài (21/10/2026)
Theo yêu cầu người dùng, thay tóc búi bằng tóc đen dài qua vai, rẽ ngôi và hai lọn trước mặt cho cả 4 vai trò nữ. Tái sử dụng pipeline Crew027/skill 3d-web-experience; GLB và fallback dùng cùng geometry, LongHair gắn Head. Xuất lại 8 assets, nữ515–622KB. Node gender5/5 PASS; Edge1920 xác nhận4GLB có LongHair, đi bộ và ảnh .playwright-mcp/crew-female-long-hair.png; build PASS với chunk warning cũ. Model FEMALE hiện dùng asset này tự động; migrationV44 vẫn chưa chạy DB thật.

### CREW-029 — Đổi kiểu tóc nữ
Theo phản hồi người dùng: tóc đuôi ngựa thấp thuôn ngọn, mái lệch bám trán, bỏ mái đôi phồng và tóc hai bên. Áp dụng cả4role nữ trong GLB/fallback cùng pipeline CREW027. Asset500–607KB; gender5/5 + build PASS, Edge1920 xác nhận4GLB low-ponytail và ảnh .playwright-mcp/crew-ponytail.png. Chunk warning cũ còn. Không thay gender/API.

- EXPLORER-014 (21/10/2026): [WebXR VR](../audit/digital-twin/EXPLORER-014-WEBXR-VR.md) — desktop có mô phỏng góc nhìn thứ nhất bằng WASD/chuột/E; headset hỗ trợ WebXR thật vẫn có controller/teleport. Build + Edge 1920×1080 + chuyển động player PASS; chưa test headset stereo/tracking.
- EXPLORER-015 (21/10/2026): [World info cards](../audit/digital-twin/EXPLORER-015-WORLD-INFO-CARDS.md) — thay sidebar bằng bảng neo trong cảnh, quản lý qua dialog, gỡ WebXR; Node20 + Edge38/11 + Planner20 PASS bằng fixture. Thay thế luồng VR của EXPLORER-014.

- [EXPLORER-016 — Thao tác trong bảng 3D](../audit/digital-twin/EXPLORER-016-WORLD-ACTIONS.md): thay entity action dialog của015 bằng nội dung neo model; Edge45+11+20, Node20, build PASS.

- [EXPLORER-017 — Kéo nguyên cụm trạm](../audit/digital-twin/EXPLORER-017-GROUP-DRAG.md): root-only raycast, rollback preview, Node27/build/Edge group6+world45+Planner20 PASS.

- [EXPLORER-018 — Thiết kế cửa hàng](../audit/digital-twin/EXPLORER-018-STORE-DESIGNER.md): editor15mẫu +immutable versionsV45, Node52/Java13/Edge32+45+20, backendlocalhealth200/schema45, backup trước migration.

- [EXPLORER-019 — Làm rõ bảng thông tin 3D](../audit/digital-twin/EXPLORER-019-INFO-CLARITY.md): context/status/detail hierarchy, attendance vs assignment, Edge42+45/Node14/build PASS.

- [EXPLORER-020 — Bảng thông tin có hình khối3D](../audit/digital-twin/EXPLORER-020-PHYSICAL-BOARD.md): meshcase/textureface/meshbuttons, Edge33+Planner20/Node14/build/lint PASS; forms vẫn Htmltransform.

- [LIVE-024 — Nối Docker backend thật](../audit/digital-twin/LIVE-024-DOCKER-INTEGRATION.md): gỡ browsermock, REST/WSproxy, realUIlogin/STOMPCONNECTED, design18items savePostgresrevision1+reload,4pagesAPIsmokePASS.

- [FUNC-028 — Nút và điều hướng web](../audit/ui/FUNC-028-FUNCTIONAL-BUTTON-AUDIT.md): audit6nhómnotif/camera/menu/routes; sourceverified, chưamutationtests/fixes.

- [FIX-029 — Sửa nút và điều hướng](../audit/ui/FIX-029-FUNCTIONAL-ACTIONS.md): notifications không ack sai, menu/legacy links đúng tab, Mẫu ca CRUD qua API hiện có, follow3D đúng model; Node16/build/Edge live và mutation test cách ly PASS.

- [FIX-030 — Hạn tuyển Chợ ca mở](../audit/ui/FIX-030-MARKETPLACE-EXPIRY.md): lọc ca cũ khỏiactive/KPI, giữreadonlyhistory, timeguards vàclock; Node6/build/Edge real+isolatedclockPASS.

- [FIX-031 — Form tạo/sửa lịch](../audit/ui/FIX-031-SHIFT-FORM.md): modal cuộn/footer/màu, ngày tương lai, backend persist note/color/role/template V46; Node4/Maven23/build/Edge3sizes/live CRUD draft đã dọn PASS.

- [FIX-032 — Định biên ngày rõ nghĩa](../audit/ui/FIX-032-DEMAND-CLARITY.md): demand vs assignment, target vs minmax, compact table/normdialog, single sticky apply và weekly payload; build/Node2/Edge liveGET+isolatedwrites PASS.

- [FIX-033 — API và kích thước Định biên](../audit/ui/FIX-033-DEMAND-API-COMPACT.md): mapping endpoints, backend defaults/auto-fill rules, khungngày1280; GETlive200/build/Edge3sizes PASS.

- [FIX-034 — Định biên tuần compact](../audit/ui/FIX-034-WEEKLY-DEMAND-COMPACT.md): ma trận7ngày, KPIgọn/statusrõ/normdialog/ngânsáchthugọn; Edge3sizes/build/lint2/Node2/liveGET+isolatedwrites PASS.

- [FIX-035 — Cuộn khi mở hết Định biên](../audit/ui/FIX-035-EXPANDED-DEMAND-SCROLL.md): bounded dialog/singlecontentscroll/staticfooter;42warningsfixture expanded+budgetedit3sizes hittestSave và livedayregression/build PASS. Thay cơ chế cuộn SCROLL018.

- [FIX-036 — Grid viewport theo ảnh](../audit/ui/FIX-036-DEMAND-VIEWPORT-GRID.md): definiteheight/4rows, budgetedit live3sizes+42warningsfixture2sizes bounded/savehitPASS.

- [FIX-037 — Nội dung Định biên gọn](../audit/ui/FIX-037-DENSE-DEMAND.md): bảngtuần~240px, metrics/controls/budgetform compact; live1620/1366 expandedbudget vừa,390scrollSavehitPASS.

- [FIX-038 — Tỷ lệ hài hòa Định biên](../audit/ui/FIX-038-BALANCED-DEMAND.md): sharedtype/spacing/controlscale, bỏdồnnhỏ, Edge3sizes/build PASS.

- [STAB-001 — System stabilization](../audit/stabilization/STAB-001.md): IN PROGRESS, source inventory, isolated Docker runner, quota/auth fixes; acceptance gates still open.

- STAB-002: persistence/security3 tests PASS and live quota42cells responsive; see STAB-001 ledger.
- STAB-003: timezone-aligned attendance/deadlines, lean attendance-photo payload, Dashboard load visibility, STOMP origin/JWT gate and Docker secret gate. Overnight shifts were explicitly removed on 24/10. Maven/build PASS; Docker Engine unavailable before isolated-suite/rebuild. See TASK_MEMORY and CHANGELOG entry dated 24/10/2026.

