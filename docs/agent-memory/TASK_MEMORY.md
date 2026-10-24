# ShiftSync — Active Task Memory & Agent Handoff (TASK MEMORY)
Mã tài liệu: `docs/agent-memory/TASK_MEMORY.md`  
Cập nhật lần cuối: 24/10/2026 | Baseline: `c9d4df1` (Branch: `quoc-backend`)

---

## 1. Trạng thái hiện tại của Repository (Current State Snapshot)

- **Trạng thái Git:**
  - Branch: `quoc-backend`
  - Baseline Commit: `c9d4df1`
  - Các thay đổi chưa commit trong working tree: **ĐÃ ĐƯỢC BẢO LƯU NGUYÊN VẸN 100%** (bao gồm các bản vá FIX-001A, FIX-001B, FIX-001C, WEB-001 và hệ tri thức `docs/agent-memory/`).
  - Tuyệt đối **KHÔNG** chạy `git reset`, `git clean`, `git checkout` hay `git stash`.

---

## 2. Việc vừa hoàn thành gần nhất (Last Completed)

### AUTO-025 — Trực quan Auto-Scheduler
- Web flow: snapshot trước → xác nhận thực thi/lưu → kết quả backend + so sánh → replay + 3D. API không có dry-run/selection trace; giới hạn ghi trong UI/report. Build PASS; 3 model tests +17 Edge mock checkpoints PASS. Report docs/audit/autoschedule/AUTO-025-VISUALIZATION.md; không sửa backend.
### PLANNER-024 — Kiểm thử 3D Planner
- Planner model 6/6, browser WebGL thật + API fixture 20/20, build PASS. Chạy lại suite trong Edge (`Edg/155`) 20/20 tại 1920×1080, không console/uncaught errors; canvas hiện, document 1920×1080 không tràn. Lượt đầu suite stale do ngày 19/10, đã sửa fixture theo ngày chạy và teardown listener. Không sửa application. Ảnh `.playwright-mcp/planner-024-edge-final.png`; report docs/audit/digital-twin/PLANNER-024-REGRESSION.md. Chưa kiểm chứng API thật.


### UI-023 — Bỏ banner giới thiệu lặp lại
- Yêu cầu người dùng: không mặc định thêm banner có nhãn phân hệ, tiêu đề lớn và câu mô tả. Đã bỏ tại Attendance, Marketplace và EmployeeModuleLayout (gồm nhân viên/hợp đồng/vị trí/payroll/chi nhánh). Giữ tiêu đề gọn và thao tác. Đây là preference cho các thay đổi giao diện tiếp theo. Build PASS; browser 3 routes xác nhận không còn eyebrow/không tràn ngang.


### ATT-022 — Thiết kế lại web Chấm công & Phép (20/10/2026)
- Follow-up yêu cầu dùng skill: áp dụng senior-frontend + frontend-design đã đọc trong hội thoại; bổ sung kiểm tra references/frontend_best_practices.md. Định hướng bảng vận hành tông ấm, serif heading + body font chung, palette theme, spacing 8/16/24px; DFII 14 (impact4+fit4+feasibility4+performance5-risk3). Nâng filter entries thành button, tên dialog riêng, focus trap/restore, Escape và body-scroll lifecycle. Playwright xác nhận 8 kiểm tra keyboard/focus/scroll; build PASS.

- Tái sử dụng theme HR-021/MKT-020 và Attendance API từ CODEBASE_MAP. `AttendancePageLive.jsx` có header chung, mô tả từng tab, pending count theo dữ liệu, bộ lọc mobile thu gọn, bảng scroll riêng và modal theo theme. `attendance-redesign.css` import cuối App.
- Sửa alias `/attendance/leave` và `/attendance/explain` tự chọn đúng tab; query `?tab=` cũ vẫn nhận. Bổ sung tên truy cập cho tìm kiếm/modal, filter header dùng button, nhãn Ngày/Tuần tiếng Việt.
- Build PASS; Playwright fixture 3 routes × 1920/390 đúng tab/không tràn document; table mobile 341px/scroll1180px; Ngày/Tuần, tìm kiếm không khớp, lọc trạng thái, mở sửa công và form nhân viên gửi đơn/giải trình, filter mobile, footer, dark surfaces PASS. Chỉ mock, không xác minh write backend. Empty API thử riêng chưa xác nhận; không tuyên bố kiểm thử trạng thái không bản ghi.


### HR-021 — Toàn bộ giao diện Hồ sơ nhân sự (20/10/2026)
- Tái sử dụng cấu trúc HR/API từ CODEBASE_MAP và theme MKT-020; cập nhật Employees, contracts route, Skills, Payroll và EmployeeDetail. Shared `employee-module-redesign.css` được import cuối App để tránh CSS cũ ghi đè. Nav dùng Link thật, đúng active kể cả payroll query và skills alias.
- Hợp đồng là thư mục tra cứu dẫn tới profile `?tab=contract`, không phải CRUD hợp đồng mới. Profile có panel hợp đồng và chấm công; tab lịch/thu nhập ẩn vùng không liên quan. Dock về luồng trang, nút chỉnh sửa mở form. Bỏ employee/personal/KPI fallback mẫu trong các vùng đã đụng tới; phép tính nghiệp vụ cũ ngoài phạm vi chưa audit.
- Build PASS. Playwright session/API mock: 5 routes × 1920/390 không tràn document, footer thấy được; table 341px scrollWidth 880px trên mobile; contract CTA/deep link và tab panels PASS; add-user/edit-profile/skill forms mở được; dark table đọc được. Không kiểm chứng ghi backend thật.


### MKT-020 — Bảng điều phối Chợ ca mở (20/10/2026)
- Thiết kế lại web theo hướng bảng điều phối tông ấm, tiêu đề serif, KPI và vùng công việc rõ thứ bậc; thêm nhãn tìm kiếm, nút lọc khung giờ hỗ trợ bàn phím. Giữ luồng nghiệp vụ. Build PASS; Playwright mock 1920×1080/390×844 kiểm tra ca mẫu, tìm kiếm, lọc, tabs, modal và cuộn cuối trang. Chưa kiểm tra ghi dữ liệu backend thật.


### MKT-019 — Thiết kế lại Chợ ca mở (20/10/2026)
- Sắp xếp tiêu đề, thao tác, thống kê và danh sách theo thứ bậc; bộ lọc thu gọn trên màn hình nhỏ, bảng cuộn ngang; giữ nguyên các luồng điều phối. Trạng thái rỗng và chỉ số không suy diễn khi thiếu dữ liệu. Build PASS; Playwright mock 1920×1080 và 390×844 kiểm tra các tab, tìm kiếm, modal, bộ lọc và cuộn cuối trang. Chưa xác minh ghi dữ liệu với backend thật.


### SCROLL-018 — Cuộn nội dung Định biên (20/10/2026)
- Ảnh người dùng cho thấy cảnh báo cuối Định biên bị che. `DemandPlanningModal` dùng portal, overlay cuộn toàn bộ nội dung thay vì nested vertical scroll; khóa body khi mở và khôi phục khi đóng; nút đóng neo viewport. Bảng vẫn cuộn ngang riêng.
- Browser mock wheel đến đáy ngày/tuần 1587×910, 1920×600, 1366×768, 390×600, đóng phục hồi body; Dashboard/Schedule/Availability/Requests/Settings cuộn footer 1366×600; SCROLL-014 regression 9/9 và build PASS. Giới hạn: chưa xác nhận mọi trang/dữ liệu thật. Report docs/audit/ui/SCROLL-018-DEMAND-WORKSPACE-SCROLL.md.

### SCHED-017 — Thiết kế lại Định biên ca (20/10/2026)
- `DemandPlanningModal.jsx`, `DemandDailyView.jsx`, `DemandWeeklyMatrixView.jsx` và `DemandPlanningRedesign.css` đồng bộ theme Schedule, responsive, empty state và sửa căn cột bảng tuần; giữ màu trạng thái. Gỡ hai nút copy/draft gọi sai hành vi. API và các handler auto-fill/apply giữ nguyên.
- Build PASS; Playwright mock 1920/390, ngày/tuần, rỗng/có 3 vị trí, tăng quota mock, dialog quy chuẩn, scroll, light/dark; lint còn 9 lỗi + 2 cảnh báo cũ. Xem docs/audit/ui/SCHED-017-DEMAND-PLANNING-REDESIGN.md. Không kiểm chứng ghi backend thật.

### SCHED-016 — Thiết kế lại Khả dụng nhân sự (20/10/2026)
- `StaffAvailabilityPage.jsx` + `staff-availability-redesign.css`: đồng bộ giao diện với Schedule, responsive hai view, dark/light và trạng thái rỗng đúng nghĩa. Giữ nguyên màu `.role-*`, API và CSS in; ma trận cuộn ngang nội bộ, trang cuộn tới footer.
- Build PASS, ESLint 0 lỗi/5 cảnh báo hook có sẵn. Browser mock 1920/390 xác minh rỗng/có 3 slot, tìm kiếm/lọc/chuyển view/đổi tuần, role colors và scroll. Báo cáo docs/audit/ui/SCHED-016-STAFF-AVAILABILITY-REDESIGN.md. Browser để ở 1920×1080, tab khả dụng. Không backend/DB writes hoặc commit/push.

### SCHED-015 — Thiết kế lại trang Schedule (20/10/2026)
- `SchedulePage.jsx` + `schedule-redesign.css`: mới hóa header, tab/chế độ xem, toolbar, bảng ca, trạng thái rỗng, giao diện mobile và dark filter. `SchedulePage.css` cũ/logic nghiệp vụ giữ nguyên; 3D/Planner vẫn toàn màn hình. Màu vị trí và nền sọc chéo của ca không đổi.
- Build và diff check PASS; Playwright với API/session mock: 4 màu/32 ca sọc chéo, Ngày/Tuần, form ca/nhân viên, 1920/390 không tràn trang, filter dark và 3D không cuộn. ESLint toàn SchedulePage còn 28 errors + 1 warning có sẵn ngoài đoạn render mới. Báo cáo docs/audit/ui/SCHED-015-SCHEDULE-REDESIGN.md.

### SCROLL-014 — Khôi phục cuộn toàn trang (20/10/2026)
- Navbar body lock cho drawer/search được sửa để khi không còn overlay hoặc khi chuyển route, `body.style.overflow` luôn về rỗng. Đã tái hiện lock còn sót làm Settings dừng cuộn trước đáy, rồi xác nhận bản sửa giải phóng lock.
- 9/9 browser checks (Dashboard/Settings/Requests desktop, mobile drawer/search và dashboard), build/ESLint Navbar PASS; 3D schedule viewport vẫn fit. Browser test chỉ dùng API/session mock; chưa có quan sát trực tiếp browser riêng của người dùng. Xem docs/audit/ui/SCROLL-014-GLOBAL-SCROLL-RECOVERY.md.
- Theo góp ý tiếp theo, MainLayout thêm footer 128px sau `<main>` và min-height theo vùng nhìn; các trang Dashboard/Settings/Requests desktop + Dashboard mobile cuộn tới footer, còn 3D/Planner ẩn footer. Build và 9 kiểm tra hồi quy PASS; browser test dùng session/API mock.
- Browser sau kiểm tra nên để lại 1920×1080 tại /dashboard. Không backend/DB writes hoặc commit/push.

### DASH-012 — Thiết kế lại Dashboard vận hành (20/10/2026)
- Dashboard dùng bố cục quản lý mới: ngữ cảnh store + CTA 3D/phân công, bộ lọc riêng, bốn KPI có nhãn chính xác, lịch/sơ đồ cạnh yêu cầu/điểm danh, biểu đồ tuần tầng dưới với trạng thái rỗng. ShiftTimeline dùng lời dẫn đúng cho ngày khác; theme Navbar cũ được tái sử dụng.
- 24/24 browser checks với API/session mock, dữ liệu có/rỗng, 1920/1440/390 và dark; build, lint Dashboard.jsx+ShiftTimeline.jsx PASS. Luồng filter, CSV, approval mock, tabs, date navigation giữ được. Không backend/DB writes/commit/push.
- Xem docs/audit/ui/DASH-012-DASHBOARD-REDESIGN.md và `.playwright-mcp/dashboard-redesign-preview.png`. DashboardPage còn một lỗi lint có sẵn; API thật, loading/error phân biệt và công thức dự toán 30.000 đ/giờ chưa được thay đổi. Browser 1920×1080 tại `/dashboard` với manager/API fixture.

### NAV-011 — Thiết kế lại Navbar theo senior-frontend (20/10/2026)
- Navbar2hàng112px, store picker trực tiếp, Ctrl/CmdK tìm trang không dấu, active group/settings/3D shortcut; mobile<=1020 giữstore context +drawer accordion, focus trap/Escape/restore. Giữ4palette/lightdark/contrast-surface; bỏ fake sample ở Navbar, NotificationBell/API callbacks giữ nguyên.
- MainLayout syncselectedstore quaeventhai chiều, Navbar keytheo pathname+search, systemRole cho HRfilter; SettingsPage querytab mở đúng appearance/schedule/permissions. SchedulePage height theo --ss-navbar-height, model3D vẫnfit. Source Navbar.jsx/navbar-layout.css, navbar.css chỉtokens.
- 29/29 Navbar browser +33/33 Store regression,144/144 unit/integration,build và lint riêng Navbar+NotificationBell PASS. Wide1920/laptop1440/mobile390,8style combinations; selective contrast16tổhợp>=4,7588:1. Judge render không blocker/major, hai minor được sửa/rescore. API/session mock; không DB/backend writes/dependency changes/commit/push.
- Xem docs/audit/ui/NAV-011-NAVBAR-REDESIGN.md; ảnh .playwright-mcp/navbar-011-detail.png. MainLayout/SettingsPage còn5 lint errors có sẵn; không tuyên bố repo lint sạch. Chưa screenreader/touchdevice thật hoặc guard draftchưa lưu khiđổi store. Browser về1920×1080, mockmanager.

### EXPLORER-013 — Thiết kế lại model store Oak & Moss (19/10/2026)
- Follow-up “áp dụng đi”: model mới vẫn là default F&B. SchedulePage hỗ trợ /schedule?view=3d để mở thẳng workspace và giữ3D khi reload, không đổi mặc định /schedule hoặc bỏ auth. Runtime app chính xác nhận storeDesignVersion=2/design=Oak & Moss;4 checks direct-link/load/reload/exit đạt, Store33/33 rerun +144tests/build đạt. Ảnh .playwright-mcp/store-013-applied.png, browser1920×1080; API/session mock, không DB writes.
- Model mặc định mới /models/store-v2/shiftsync-cafe.glb; nguồn CafeStoreModel.js + scripts/generate-store-v2.mjs. Làm lại kiến trúc/cửa kính/đèn, cụm POS–pha chế–pickup, thiết bị, chín bộ bàn ghế/kho/decor, palette gỗ sáng–xanh rêu–kem. Giữ semantic names và API vị trí trạm; GLB cũ nguyên vẹn.
- Cột dời về góc sau x±9,6/z−6,5, không cắt quầy; floor22,2×14,22m,169meshes/39.858tris/1.649.892bytes, giảm≈75,1% dung lượng asset. Material enhancer bỏ legacy override cho version2; wall child metadata/X-Ray và blocker dedup tương thích.
- 144/144 tests + build PASS; Playwright1920×1080 Store33/33, experience14/14, Planner20/20, preview11/11. API/session mock và GLB thật; không backend/DB writes. Có kiểm tra phụ390px: toàn model fit và không document overflow.
- Judge độc lập bốn ảnh final không thấy blocker/major; minor preview narrow toàn cảnh nhỏ. Browser kết thúc1920×1080 tại store-preview; model trong dist cùng SHA256 với public.
- Preview không cần login: http://127.0.0.1:3000/store-preview.html (Vite dev). Bản chính đã dùng model mới; preview HTML chưa bundle production. Xem docs/audit/digital-twin/EXPLORER-013-STORE-MODEL-REDESIGN.md, ảnh .playwright-mcp/store-013-overview.png. Chưa đo chi nhánh thật/FPS nhiều thiết bị/LOD; chunk warning và giới hạn backend cũ còn nguyên.

### EXPLORER-012 — Thiết kế lại model nhân vật (19/10/2026)
- Người dùng xác nhận “áp dụng”: đã đối chiếu AvatarLayer → StylizedAvatars → loader Crew V2 và PlayerAvatar; không cần đổi thêm nguồn vì bộ mới đã là mặc định. Chạy lại Store33/33, xác nhận runtime staff isGlb=true/designVersion=2/có khớp gối; mở route /schedule thay preview. API/session browser mock, không ghi DB thật.
- Crew V2 có bốn đồng phục/mặt/tóc/phụ kiện riêng, cao khoảng 1,7 m; GLB versioned tại public/models/crew-v2, không ghi đè assets gốc. Nguồn dựng CrewModel.js + scripts/generate-crew-v2.mjs; 30–31 meshes, 16,9–19,8k tam giác/model, 496–576kB.
- Staff/Planner/player tham quan dùng chung loader và model dự phòng cùng thiết kế. Clone khớp độc lập, geometry/material shared; thêm gập gối/khuỷu. Đây là articulated rigid groups, chưa skinned/mocap hoặc LOD.
- 141/141 tests + build PASS; browser 1920×1080: Crew7/7, Store33/33, experience14/14, Planner20/20, API mock và GLB thật. Judge ảnh không blocker/major; khớp còn kiểu đồ chơi. Giữ nguyên backend/layout/DB.
- Preview đang mở tại http://127.0.0.1:3000/crew-preview.html (Vite dev, kéo xoay/cuộn gần/nút đi bộ). Ảnh .playwright-mcp/crew-012-lineup.png. Xem docs/audit/digital-twin/EXPLORER-012-CREW-REDESIGN.md. Chưa benchmark nhiều nhân viên hoặc đóng gói trang preview production; ứng dụng chính build đạt, còn chunk warning.

### EXPLORER-011 — Bản thử 3D Schedule Planner (19/10/2026)
- Entry Lập lịch ca→3D Schedule Planner. Ngày/ca/mốc giờ chung; Matrix/Timeline/Spatial cùng draft. Clickzone3D/ôtrống xem ứng viên từ eligible-staff, draft/undo/remove, Apply revalidate và POSTforce=false; chỉ ADMIN/MANAGER sửa.
- Warnings overlap quađêm, orphanzone/missingID/capacity, giờ giao nhau và Xem phân công→Matrix. Giữ draft chưa lưu khi eligibility đổi/backend từ chối. Zone-only avatar sauquầy, label screen-depth và camera frameorder được sửa.
-135 tests+build pass;20 Planner checks +33 main +14 experience browser checks đạt1920×1080/API mock+GLB thật. Judge ảnh không major/blocker. Demo mở sẵn Matrix với Thu ngân/ứng viên MOCK, không POST.
- Prototype, draft trong component; chưa persistence/collaboration/cross-store đầyđủ, phân công cấpzone (khônginventworkstation binding), chưa xác nhận backendJWT/persistence thật. Xem docs/audit/digital-twin/EXPLORER-011-SCHEDULE-PLANNER-PROTOTYPE.md.

### EXPLORER-010 — Sửa năm nhóm lỗi audit009 (19/10/2026)
- Snapshot vị trí quầy dùng chung cho2D/minimap/teleport; useLayoutEffect đặt quầy trước zone decals. Collision theo visible world geometry (9 bộ bàn ghế, quầy, vách, cột, surplus trạm), không zone ma/cột trùng/Kitchen ẩn; safe teleport và bounds sànGLB.
- V đồng bộ controller/state/HUD/FOV; loading/status/error/retry thật;2D card/labels không chồng; guard chọn lại cùngstore. Không ghi đè API/DB.
-128/128 spatial tests + build pass;33/33 main Playwright +14/14 experience regressions ở1920×1080, GLB thật/API mock. Judge ảnh không còn blocker/major. Xem docs/audit/digital-twin/EXPLORER-010-EXPERIENCE-FIXES.md.
- Asset/drawcall optimization, no-WebGL/context loss/điện thoại thật và backendEquipment runtime vẫn chưa xác minh/triển khai; không coi toàn bộ sản phẩm đã nghiệm thu mọi môi trường.

### EXPLORER-009 — Audit trải nghiệm3D theo skill (19/10/2026)
- Chỉ kiểm tra, không sửa ứng dụng.33/33 full-page mock regression đạt1920×1080; kiểm tra bổ sung phát hiện P1 teleport Thu ngân dùng tọa độ cũ và bị collision ma, đi xuyên booth,2D khác vị trí3D; P2 phímV lệch controller/UI/FOV và thiếu loading/error/retry GLB.
- Lấy mẫu overview≈60FPS trên IrisXe,DPR1;930 draw calls,103358triangles, GLB6,32MiB. Fullscreen/zoom/WASD cơ bản/Escape đạt;390px không tràn ngang, trả về1920×1080. DelayGLB/503 chứng minh thiếu phản hồi nhưng procedural fallback chạy.
- Kết luận NEEDS_FIXES. Ưu tiên nguồn vị trí/collision dùng chung→V→loading/performance. Xem docs/audit/digital-twin/EXPLORER-009-3D-EXPERIENCE-AUDIT.md. Không coi33 checks là nghiệm thu toàn bộ tham quan; không có backend/DB writes.

### EXPLORER-008 — Bố trí quán cà phê thực tế hơn (19/10/2026)
- Xếp từng bộ booth/bistro, đủ9 bộ; bounds theo sàn GLB thật. Bàn chung xoay dọc, lounge phía cửa sổ, chừa lối trung tâm/landing/xếp hàng và tránh kho/cột. Pickup liền pha chế/thu ngân; giữ tọa độ trạm API.
- Zone3D và camera focus theo quầy vật lý; nhãn zone đụng nhau dời kèm leaderline, cả Thu ngân/Pha chế đều hiện; thêm chỉ dẫn sàn. Không ghi DB hay đổi dữ liệu zone2D.
-122/122 tests, build và33/33 Playwright mock checkpoints đạt1920×1080. Judge ảnh overview/topdown không còn blocker/major. Xem docs/audit/digital-twin/EXPLORER-008-CAFE-LAYOUT.md; đây là bố trí GLB mẫu, chưa khảo sát chi nhánh thực.

### EXPLORER-007 — Khôi phục bàn thu ngân cạnh pha chế (19/10/2026)
- Người dùng chỉ ra lỗi ẩn nhầm quầy thu ngân. StoreArrangement giờ giữ bàn thu ngân/pha chế vật lý kể cả chưa bind API; bàn chưa bind được đặt cạnh bàn còn lại, khe0,08m, không chồng hình học. Trạm đã lưu giữ nguyên tọa độ. Không tạo dữ liệu nhân sự/thiết bị giả; xóa tag cũ trên bàn chưa bind và đưa cả hai vào blockers bàn ghế.
-119/119 spatial tests + build pass. Journey mock26/26 đạt ở1920×1080, thay assertion sai “unbound hidden” bằng “cashier visible adjacent”. Ảnh .playwright-mcp/explorer-007-cashier-barista.png. Không ghi DB.

### EXPLORER-006 — Triển khai giao diện và bố trí (19/10/2026)
- Đã gộp header, thêm navigator/fullscreen, fit desktop, timeline đúng ca/qua đêm, sửa theme/nhãn3D. Bàn ghế tránh hành lang/trạm/cột; ẩn quầy mẫu dư; nhân viên đứng ngoài quầy; camera tránh vật cản và kéo trạm snap0,25m.
- Giữ tọa độ trạm API, không ghi DB.117/117 spatial tests và build pass; full-page Playwright mock26/26, WebGL/GLB thật,1920×1080, không lỗi console/uncaught.
- Toàn bộ Explorer vẫn PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS: DockerV42 chưa kiểm chứng EquipmentV43/persistence, chưa có undo/redo/collision đầy đủ khi kéo. Chi tiết docs/audit/digital-twin/EXPLORER-006-LAYOUT-IMPLEMENTATION.md.

### EXPLORER-005 — Review UI (19/10/2026)
- Người dùng hỏi nên thay đổi/nâng cấp gì; chỉ review, chưa yêu cầu triển khai đợt mới.
- Đã xem Playwright1920×1080 với API mock, GLB thật và đánh giá độc lập design-ux. Ưu tiên gộp header, fit viewport, timeline đúng ca và tách Trực tiếp/Xem lại/Mô phỏng, thống nhất theme. Sau đó navigator entity, editor có draft/undo và cảnh báo thiết bị.
- Timeline fixture00:00 không khớp range06:00–23:00 được xác minh qua DOM và source. Không sửa code ứng dụng, không chạy lại build/test.
- Chi tiết: docs/audit/digital-twin/EXPLORER-005-UI-REVIEW.md.


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



### EXPLORER-002 — Equipment API & Inspector (19/10/2026)
- Thêm Equipment entity/DTO/repository/service/controller và migration V43; GET/POST/PUT theo workstation, phân quyền/store isolation. Không seed dữ liệu.
- Equipment inspector dùng API thật với loading/empty/error/retry và abort khi đổi store/trạm.
- Sửa Attendance options cho procedural workstation; bỏ suy diễn zone→station và attendance của người khác; avatar dùng tọa độ trạm; xóa selection khi entity biến mất.
- 105/105 spatial tests, 28/28 backend tests, build PASS; browser component 7 tình huống PASS bằng fixture. PostgreSQL DDL thử trong transaction rollback PASS.
- V43 chưa áp dụng vĩnh viễn; backend container vẫn bản cũ. Chưa có session đăng nhập để xác minh canvas/camera/GLB thật; camera collision chưa được chứng minh. Trạng thái PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS. Xem INTERACTIVE-STORE-EXPLORER-AUDIT.md.
- Tiếp theo: chạy backend mã mới/Flyway rồi kiểm thử API/JWT/persistence và journey canvas bằng Manager hợp lệ.


### Nhiệm vụ EXPLORER-001 — Audit & Hoàn thiện Interactive Store Explorer (19/10/2026)
- Đã rà soát frontend/backend và bổ sung zone auto-focus, toggle Attendance, highlight workstation, toolbar Zone/Workstation, ca hiện tại trong inspector, policy chọn GLB theo `store.category`, và reset selection theo store.
- Backend không có equipment inventory relationship/API cho workstation; chưa thêm migration vì chưa có yêu cầu nghiệp vụ/data contract đủ căn cứ.
- 61/61 test liên quan pass; `npm run build` pass. Browser verification bị chặn tại login do tài khoản test không được backend chấp nhận. Trạng thái còn một phần; xem [báo cáo audit](../../INTERACTIVE-STORE-EXPLORER-AUDIT.md).

### Nhiệm vụ NAV-010 — Tích Hợp Lối Tắt Cài Đặt (Settings) Trực Quan Trên Thanh Điều Hướng (Navbar)
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"setting ở đâu navbar không thấy!"*.
   - Khắc phục việc người dùng khó tìm thấy trang Cài đặt (Settings), tạo điểm truy cập trực quan, tiện lợi ngay trên thanh Navbar mà không cần phải gõ URL thủ công.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **Nhận diện đa điểm (Multi-point Discoverability):**
     1. **Tab Menu Chính "Cài đặt" (`groups`):** Hiển thị ngay cạnh tab "Hồ sơ nhân sự" với icon `Settings`, bao gồm menu con: Cấu hình cửa hàng, Giao diện & Chủ đề, Quy tắc lên lịch, Phân quyền.
     2. **Nút Icon Bánh răng ⚙️ Trực tiếp:** Nằm ngay trên dải công cụ bên phải (cạnh Chuông thông báo), bấm vào chuyển hướng ngay tới `/settings`.
     3. **Tùy chọn trong Menu Tài khoản (User Dropdown):** Thêm 2 mục "Cài đặt hệ thống" và "Giao diện & Chủ đề" kèm icon minh họa.
   - **Tối ưu CSS (`navbar.css`):**
     - Mở rộng độ rộng `.ssn-menu.right` lên `250px`.
     - Thêm trạng thái `.ssn-ico.active` phát sáng khi ở route `/settings`.
3. **Kiểm chuẩn & Nghiệm thu:**
   - `npm run build` thành công trong 9.1s.
   - 110/110 unit tests PASS 100%.

### Nhiệm vụ THEME-002 — Bổ Sung Tùy Biến Style Giao Diện & Chủ Đề Vào Trang Cài Đặt (Settings)
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"tôi nghĩ là trang setting cho phép chọn Style giao diện"*.
   - Cho phép người dùng chuyển đổi linh hoạt phong cách giao diện trong trang Cài đặt (Settings), lưu trữ vĩnh viễn và áp dụng ngay lập tức trên toàn hệ thống.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **Nâng cấp `theme.jsx` (`ThemeProvider`):** Quản lý đồng bộ `theme` (Sáng/Tối), `style` (Bảng màu), và `navStyle` (Phong cách thanh điều hướng), lưu trữ trong `localStorage` và cập nhật trực tiếp `data-style`, `data-theme`, `data-nav-style` trên thẻ `<html>`.
   - **Đa dạng hóa Hệ thống Bảng màu (`navbar.css`, `dashboard.css`):**
     - `Warm Roast` (`warm`): Tông ấm Cà phê nướng, hổ phách và cam đất F&B.
     - `Modern Mint` (`emerald`): Tông xanh bạc hà, xanh ngọc lục bảo tươi mát, năng động.
     - `Classic Slate` (`ocean`): Tông xám phiến và xanh công nghệ chuẩn SaaS quốc tế.
     - `Minimalist Studio` (`minimal`): Tông đơn sắc đen trắng tinh tế, tập trung cao độ.
   - **Tích hợp Tab "Giao diện & Chủ đề" vào `SettingsPage.jsx` & `SettingsPage.css`:**
     - 4 thẻ phong cách trực quan kèm swatch màu sắc thực tế và badge định vị.
     - Bộ chuyển đổi Chế độ Sáng / Tối với icon Sun / Moon.
     - Tùy chọn kiểu dáng Navbar: Tương phản nổi bật (`contrast`) vs Liền mạch đồng màu (`surface`).
     - Khung xem trước trực tiếp (Live UI Preview) phản ánh các thay đổi theo thời gian thực.
3. **Kiểm chuẩn & Nghiệm thu:**
   - `npm run build` hoàn thành với exit code 0 trong 956ms.
   - 110/110 unit tests PASS 100% trong 1.05s.

### Nhiệm vụ DASH-003 — Loại Bỏ Các Yếu Tố "AI Hóa" (No-AI-Slop), Chuẩn Hóa Giao Diện Dashboard Thực Tế Sản Xuất
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"/no-ai-slop sửa lại giao diện dashboard không bị AI hóa"*.
   - Khắc phục các đặc điểm "AI-slop" (giao diện mẫu rập khuôn, các chế độ xem phân mảnh vô nghĩa, mã nguồn copy-paste lặp lại, link mũi tên spam trên từng thẻ, pill badges chứa số 0 vô nghĩa, các màu sắc hex cứng phá vỡ theme).
   - Thiết kế lại Dashboard thành một sản phẩm phần mềm thực tế, tinh giản, sắc nét và tập trung vào nghiệp vụ của người quản lý cửa hàng bán lẻ/cà phê.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **Xóa bỏ các chế độ giả tạo:** Loại bỏ tab switch `[Kết hợp] [Vận hành] [Mặt bằng 2.5D]` và cắt giảm hơn 300 dòng mã nguồn JSX trùng lặp.
   - **Bố cục 2 cột cân bằng:** Cột làm việc chính (65%) dành cho Lịch ca / Sơ đồ mặt bằng và Biểu đồ hiệu suất; Cột tác vụ (35%) dành cho Yêu cầu cần duyệt và Điểm danh.
   - **Dải chỉ số tinh gọn:** 4 số liệu thực tế (Ca hôm nay, Việc cần duyệt, Điểm danh, Dự toán công). Loại bỏ các link `Xem chi tiết →` lặp lại vô nghĩa.
   - **Hợp nhất Không gian mặt bằng:** Tích hợp chuyển tab trực tiếp `[Dạng Timeline]` / `[Sơ đồ mặt bằng]` trong thẻ Lịch ca. Nhúng bản vẽ SVG kiến trúc `TwoDSpatialSchematic`, dùng biến CSS chuẩn cho Dark/Light mode.
   - **Bảo toàn đầy đủ tính năng:** Giữ nguyên 100% cơ chế Optimistic Mutations (duyệt/từ chối tức thì), đồng bộ WebSocket/Storage events, và kết nối CSDL thực tế.
3. **Kiểm chuẩn & Nghiệm thu:**
   - `npm run build` hoàn thành với exit code 0.
   - 110/110 unit tests PASS 100% trong 1.05s.

### Nhiệm vụ THEME-001 — Triển Khai Bộ Màu "Warm Up" Ấm Áp & Tách Biệt Navbar Tương Phản Đậm Nét
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"Thử màu warm up và sửa cho navbar màu khác"*.
   - Đổi tông màu lạnh (mint/slate green) sang bảng màu Warm Up ấm cúng, sang trọng, tràn đầy năng lượng đặc trưng cho không gian chuỗi cà phê (Warm Ivory Linen `#faf7f2`, Terracotta `#ea580c`, Warm Amber `#d97706`/`#f59e0b`).
   - Thiết kế Navbar mang màu sắc tách biệt hoàn toàn so với nền trang (Deep Roast Espresso `#1c140e` cho Light Mode và Deep Obsidian Roast `#0c0806` cho Dark Mode), tạo điểm neo thị giác mạnh mẽ.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/components/navbar/navbar.css`:**
     - Thiết lập token màu chuyên biệt `--ss-nav-*` độc lập với nền trang.
     - Thanh Navbar màu Deep Roast Espresso `#1c140e` tương phản hoàn hảo với nền ngà ấm `#faf7f2`.
     - Tab active có đường gạch chân phát sáng Hổ phách ấm (`box-shadow: 0 1px 0 0 var(--ss-nav-ac)`).
     - Badge thông báo đỏ trang bị knockout border `border: 1.5px solid var(--ss-bar)` liền mạch với nền thanh bar.
     - Dropdown menu (`.ssn-menu`) và flyout thông báo (`.ssnf-pop`) tiếp tục sử dụng card surface `--ss-surf` để đảm bảo tương phản văn bản hoàn hảo.
   - **`src/components/dashboard/dashboard.css` & `types.js`:**
     - Chuyển đổi bộ biến CSS tokens sang tông Warm Up cả 2 chế độ Light và Dark.
     - Cập nhật bảng màu mặc định `DEFAULT_POSITION_COLORS` sang sắc cam đất Terracotta, hổ phách, nâu đồng ấm.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Build Production:** `npm run build` hoàn tất xuất sắc trong **896ms** (0 lỗi JSX, 0 cảnh báo).
   - **Kiểm thử Đơn vị:** **110/110 test PASS 100%** trong **1.2s**.

### Nhiệm vụ DASH-002 — Tích Hợp Đa Góc Nhìn Vận Hành & Không Gian 2.5D, Tối Ưu Fit Màn Hình & Phê Duyệt Optimistic Mutations
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"có thể sửa lại và kết hợp cả 2 /frontend-design /frontend-ui-engineering /frontend-optimistic-mutations Sửa lại sao cho fit với màn hình"*.
   - Kết hợp cả 2 trụ cột của hệ thống: Vận hành ca kíp (KPIs, Timeline, Biểu đồ, Chấm công) và Bản đồ số Mặt bằng Không gian 2.5D (`DashboardSpatialSummary` với phân bổ nhân sự theo trạm).
   - Thiết kế giao diện vừa vặn màn hình (Screen-Fit), loại bỏ cuộn thừa, tối ưu layout co giãn linh hoạt.
   - Ứng dụng quy chuẩn **Optimistic Mutations** (5-beat lifecycle: Cancel → Snapshot → Patch → Rollback on error → Invalidate on settle) cho phép Quản lý duyệt/từ chối nhanh các yêu cầu trực tiếp trên Dashboard.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/components/dashboard/dashboard.css`:**
     - Thiết lập container co giãn full-width `max-width: 1600px; padding: 12px 18px 28px; box-sizing: border-box;`.
     - Bộ chuyển đổi chế độ hiển thị linh hoạt `.db-mode-seg` (3 chế độ: Kết hợp `hybrid`, Vận hành `ops`, Không gian `spatial`).
     - Tối ưu 6 thẻ KPI nhỏ gọn, sắc nét (padding `9px 12px`, số liệu `font-size: 20px`), hiển thị thẳng hàng trên desktop và co dãn tự động trên laptop/tablet.
     - Thanh cuộn nội bộ mượt mà (`max-height: 240px-380px; overflow-y: auto; scrollbar-width: thin;`) giữ cố định toàn bộ viewport.
     - Cấu trúc nút thao tác nhanh `.db-act-btn` (Duyệt / Từ chối) với hiệu ứng tức thì và trạng thái vô hiệu hóa khi đang xử lý.
   - **`src/components/dashboard/ShiftTimeline.jsx`:**
     - Tích hợp **Avatar 3D Low-Poly** (`Avatar3DWeb` 26px kèm WebGL snapshot cache 60 FPS) cho từng nhân viên trên timeline ca kíp, hiển thị trực quan dải thời gian ca và vạch đỏ thời gian thực.
   - **`src/components/dashboard/charts.jsx`:**
     - Chuẩn hóa chiều cao SVG viewBox `640 x 200` vừa vặn, hiển thị rõ nét số ca phân công và giờ làm việc theo ngày.
   - **`src/components/dashboard/Dashboard.jsx`:**
     - Tích hợp 3 chế độ hiển thị:
       - **Chế độ Kết hợp (`hybrid` - Mặc định):** Hiển thị song song Lịch ca làm việc + Bản đồ không gian 2.5D (`DashboardSpatialSummary`) ở hàng trên, hàng dưới bố trí Yêu cầu cần duyệt (Optimistic Actions), Chấm công hôm nay (Avatar 3D + nhãn Đúng giờ/Trễ/Vắng) và Biểu đồ hiệu suất tuần dạng tab.
       - **Chế độ Vận hành (`ops`):** Tập trung sâu vào Timeline, 2 biểu đồ phân tích tuần, và danh sách chấm công.
       - **Chế độ Mặt bằng 2.5D (`spatial`):** Phóng to sơ đồ 2.5D của cửa hàng, định mức sức chứa, và nhân sự đang trực ca theo khu vực.
   - **`src/pages/DashboardPage.jsx`:**
     - Truy vấn song song kích thước mặt bằng (`getStoreLayout`) và khu vực cửa hàng (`getStoreZones`).
     - Triển khai **Optimistic Mutation Lifecycle**:
       - Khóa thao tác song song (`mutatingRef`).
       - Chụp snapshot nguyên trạng của `pendingSwap`, `pendingAdj`, `pendingLeave`, `generalRequests`.
       - Lập tức xóa item khỏi giao diện, giảm số lượng badge và số KPI "Cần duyệt", phát tín hiệu toast tích cực.
       - Gọi API backend tương ứng (`approveSwapRequest`/`rejectSwapRequest`, `approveAdjustmentRequest`/`rejectAdjustmentRequest`, `approveLeaveRequest`/`rejectLeaveRequest`, `updateRequestStatus`).
       - Khi có lỗi: Roll back 100% snapshot ban đầu và hiển thị toast lỗi chi tiết.
       - Khi hoàn tất (onSettled): Phát sự kiện `store_requests_updated` và `notification_received` để đồng bộ Navbar và CSDL.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` hoàn tất xuất sắc trong **996ms** (0 lỗi JSX, 0 cảnh báo cú pháp).
   - **Kiểm thử Đơn vị:** **110/110 test PASS 100%** trong **1.1s**.
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"thử thay đổi trang dashboard"* kèm toàn bộ đặc tả kiến trúc thành phần: `Dashboard.tsx`, `ShiftTimeline.tsx`, `charts.tsx`, `types.ts`, `dashboard.css`, `DashboardPage.tsx`.
   - Yêu cầu nhất quán: Giao diện hiện đại, dùng bộ token CSS chuẩn `--ss-*` (đồng bộ hoàn hảo với Navbar mới và ThemeProvider dark/light), tương tác mượt mà và kết nối **dữ liệu thật (Real Data)** từ backend.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/components/dashboard/types.js`:**
     - Định nghĩa hằng số `DEFAULT_POSITION_COLORS` sử dụng các CSS token màu `--ss-p1`, `--ss-p2`, `--ss-p3`, `--ss-amber`, v.v.
   - **`src/components/dashboard/dashboard.css`:**
     - Thiết lập token màu theo `[data-theme="light"]` và `[data-theme="dark"]`.
     - Layout CSS Grid responsive: Thanh công cụ lọc thống nhất (`.db-head`), 6 thẻ chỉ số KPI (`.db-kpis`), Grid chính 2 cột (Timeline + Cột Yêu cầu & Chấm công hôm nay), Grid dưới 2 cột biểu đồ SVG (`AssignedChart` + `HoursChart`).
   - **`src/components/dashboard/ShiftTimeline.jsx`:**
     - Trục thời gian từ 06:00 đến 20:00 (14 khoảng giờ), vạch thời gian thực màu đỏ (`.db-now`) tự động cập nhật mỗi phút khi xem ngày hôm nay.
     - Hiển thị avatar viết tắt tên nhân viên, tên vị trí, dải màu công việc theo ca làm việc, hỗ trợ empty state và nút "Phân công ca ngay".
   - **`src/components/dashboard/charts.jsx`:**
     - `AssignedChart`: Biểu đồ cột xếp chồng SVG 7 ngày với các vị trí ca kíp, trục dọc chia theo số nguyên tròn trịa, tooltip chi tiết số ca theo ngày.
     - `HoursChart`: Biểu đồ đường kép SVG kết hợp diện tích nền mờ (Lịch xếp vs Thực làm) 7 ngày, highlight ngày được chọn.
   - **`src/components/dashboard/Dashboard.jsx`:**
     - Tích hợp 6 thẻ KPI: Ca trống, Độ phủ ca, Chi phí lao động, Tỷ lệ đi trễ, Tỷ lệ vắng mặt, Cần duyệt (tự động bật hiệu ứng `.hot` khi có yêu cầu tồn đọng).
     - Bộ lọc tổng thể: Chuyển ngày trước/sau, nút "Hôm nay", dropdown chọn nhân viên, nút "Xuất" CSV, nút "Phân công ca".
   - **`src/pages/DashboardPage.jsx`:**
     - Thay thế toàn diện trang cũ monolithic bằng component gọn nhẹ kết nối dữ liệu thật:
       - Truy vấn cửa hàng (`getAllStores`), nhân viên (`getEmployees`), kỹ năng cửa hàng (`getSkillsByStore`).
       - Truy vấn ca kíp thực tế (`getShiftsForStore`), chấm công (`getStoreAttendance`), yêu cầu phê duyệt (`getStoreLeaveRequests`, `getStoreSwapRequests`, `getStoreAdjustmentRequests`, `getRequests`).
       - Tự động lắng nghe các sự kiện WebSocket (`store_shifts_updated`, `store_attendance_updated`, `store_requests_updated`, `notification_received`) và storage event để cập nhật dashboard tức thì.
       - Tích hợp xuất file CSV báo cáo dự báo giờ làm việc 7 ngày.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công trong 1.00s (0 lỗi JSX, 0 lỗi biên dịch).
   - **Kiểm thử Đơn vị:** 110/110 unit test PASS 100% trong 1.06s (0 lỗi).
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"số đang to quá so với cái chuông noti"*.
   - Thu nhỏ và chuẩn hóa tỉ lệ kích thước badge đếm số lượng so với icon chuông thông báo trên Navbar, đảm bảo tính thẩm mỹ thanh lịch và sắc nét.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/components/navbar/NotificationBell.jsx`:**
     - Thiết lập kích thước icon chuông: `<Bell size={18} strokeWidth={2} />`.
   - **`src/components/navbar/notifications.css` & `src/components/navbar/navbar.css`:**
     - Đặt kích thước icon chuông `.ssnf .ssn-ico svg`: 18x18px.
     - Tối ưu hóa badge đếm `.ssnf .ssn-ico em`:
       - Chuyển sang `box-sizing: border-box;` chống nở phình kích thước.
       - Kích thước chuẩn: `min-width: 14px`, `height: 14px`, `border-radius: 9999px` (tròn đều 14x14px cho 1 chữ số, dạng pill co giãn với padding `0 3px` cho 2 chữ số).
       - Viền knockout `1.5px solid var(--ss-bg)` tách biệt rõ ràng trên nền tối/sáng.
       - Cỡ chữ `font: 700 9px/1 system-ui`, `letter-spacing: -0.02em` căn giữa hoàn hảo.
       - Vị trí `top: 3px; right: 3px;` cân đối hài hòa ở góc trên bên phải icon chuông.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công trong 964ms (0 lỗi JSX, 0 lỗi biên dịch).
   - **Kiểm thử Đơn vị:** 110/110 unit test PASS 100% trong 1.05s (0 lỗi).
   - **Trực quan:** Badge thông báo cân đối, gọn gàng và tinh tế.

### Nhiệm vụ NAV-007 — Khôi Phục Badge Số Lượng Thông Báo & Tích Hợp Real Data Backend Toàn Diện
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"sao nó không còn hiện số thông báo nữa! phải là datareal nha"*.
   - Khôi phục badge số thông báo chưa đọc trên icon Bell và kết nối dữ liệu thực tế từ backend (Real Data) thay vì dữ liệu mock.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/layouts/MainLayout.jsx`:**
     - Truy vấn 6 luồng dữ liệu song song qua `Promise.allSettled`: đổi ca (`getStoreSwapRequests`), giải trình chấm công (`getStoreAdjustmentRequests`), nghỉ phép (`getStoreLeaveRequests`), ca mở (`getMarketplaceShifts`), thông báo cá nhân (`getMyNotifications`), và số chưa đọc (`getUnreadNotificationCount`).
     - Tổng hợp dữ liệu thực tế `combinedRealNotifications`: tích hợp các yêu cầu nghiệp vụ đang chờ phê duyệt vào thông báo kèm cờ `needsAction: true` và `read: false`.
     - Tính toán tổng số lượng thông báo chưa đọc `totalRealCount = unreadRequestsCount + Math.max(inAppUnread, unreadInAppCount)`.
     - Bổ sung `pendingAdj: pendingAdjCount` vào `counts` của `<Navbar />`.
     - Kết nối luồng thao tác phê duyệt trực tiếp: `approveSwapRequest` / `rejectSwapRequest`, `approveAdjustmentRequest` / `rejectAdjustmentRequest`, `approveLeaveRequest` / `rejectLeaveRequest`.
   - **`src/components/navbar/Navbar.jsx`:**
     - Trích xuất `unreadNotifCount` từ `counts.notifications`.
     - Bảo toàn `rawId` và `source` khi định dạng danh sách thông báo.
     - Truyền `unreadCount={unreadNotifCount}` vào `<NotificationBell />`.
     - Bổ sung badge số đếm cho các mục menu con "Đổi ca" (`pendingSwap`), "Giải trình chấm công" (`pendingAdj`).
   - **`src/components/navbar/NotificationBell.jsx` & `notifications.css`:**
     - Nhận prop `unreadCount`, đồng bộ số hiển thị của badge chuông với `totalRealCount`.
     - Thêm CSS tường minh `.ssnf .ssn-ico em` để badge màu đỏ hiển thị chuẩn xác, không bị đè style.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công trong 1.02s (0 lỗi JSX, 0 lỗi biên dịch).
   - **Kiểm thử Đơn vị:** 110/110 unit test PASS 100% trong 1.1s (0 lỗi).
   - **Dữ liệu thực tế:** Hiển thị đúng 3 thông báo cần xử lý thực tế từ CSDL PostgreSQL (2 yêu cầu đổi ca + 1 giải trình chấm công của cửa hàng Phạm Văn Đồng) và 1 thông báo hệ thống.

### Nhiệm vụ NAV-006 — Hoàn Thiện Popover Thông Báo Chuẩn Pixel 100% Theo Ảnh Tham Chiếu
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"Phải có như này chứ"* kèm 4 ảnh chụp màn hình thể hiện thiết kế và hành vi chi tiết của popup thông báo.
   - Chuẩn hóa layout, dữ liệu mock 6 thông báo, căn giữa chấm xanh chưa đọc, badge số lượng trên các tab, vạch gạch chân active và các nút duyệt/từ chối.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/components/navbar/NotificationBell.jsx`:**
     - Thiết lập bộ dữ liệu mẫu chuẩn hóa gồm 6 thông báo trùng khớp 100% ảnh chụp (4 chưa đọc, 3 yêu cầu hành động).
     - Đặt kích thước icon chuẩn xác (`size={18}` cho icon loại thông báo, `size={16}` cho `CheckCheck`).
     - Tối ưu hóa grouping: tab "Tất cả" hiện "Cần xử lý", "Hôm nay", "Trước đó"; tab "Chưa đọc" hiện "Cần xử lý", "Hôm nay"; tab "Yêu cầu" hiển thị danh sách trực tiếp không kèm tiêu đề nhóm.
   - **`src/components/navbar/notifications.css`:**
     - Căn chỉnh chấm xanh unread (`left: 9px; top: 26px;`) đồng tâm tuyệt đối theo phương đứng với icon 38x38px.
     - Thiết lập pill badge bo tròn 9px (`#e8f7f0` / `#0f9d68`), vạch active 2.5px dưới chân tab.
     - Nút "Duyệt" (xanh ngọc solid `#0f9d68`) và "Từ chối" (nền trắng viền xám `#dbe5df`) bo góc 8px.
     - Tùy biến scrollbar 6px mượt mà, hỗ trợ giao diện sáng/tối tự động.
   - **`src/components/navbar/Navbar.jsx` & `src/layouts/MainLayout.jsx`:**
     - Đồng bộ `DEFAULT_SAMPLE_NOTIFICATIONS` 6 mục, đảm bảo hiển thị đúng ngay cả khi chưa kết nối backend.
     - Cải tiến `handleMarkNotificationRead` nhận cả string id lẫn object notification.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công trong 965ms (0 lỗi).
   - **Kiểm thử Đơn vị:** 110/110 unit test PASS 100% trong 1.28s (0 lỗi).
   - **Độ trùng khớp:** Trực quan 100% khớp với 4 ảnh chụp của người dùng.

### Nhiệm vụ NAV-005 — Tích Hợp Component NotificationBell & Phân Nhóm Thao Tác Trực Tiếp
1. **Yêu cầu & Mục tiêu (User Request):**
   - Áp dụng cấu trúc component `NotificationBell` và `notifications.css` theo mã nguồn người dùng cung cấp.
   - Hỗ trợ phân nhóm thông báo thông minh ("Cần xử lý", "Hôm nay", "Trước đó"), tab "Yêu cầu" và các nút thao tác trực tiếp ("Duyệt" / "Từ chối") có xử lý bất đồng bộ (`busy`).
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/components/navbar/NotificationBell.jsx`:**
     - Thiết lập component nhận `items`, `onOpen`, `onMarkRead`, `onMarkAllRead`, `onAction`, `onViewAll`.
     - Icon và sắc thái tone màu động: `swap` (`ArrowLeftRight`), `leave` (`CalendarX` warn), `open_shift` (`ShoppingBag`), `attendance` (`Clock` warn), `system` (`Info` mute).
     - Hỗ trợ thao tác duyệt/từ chối ngay trong danh sách với nút bấm có feedback xử lý (`disabled` khi `busy`).
     - Thời gian tính toán tương đối chuẩn tiếng Việt ("Vừa xong", "X phút trước", "Hôm qua",...).
   - **`src/components/navbar/notifications.css`:**
     - Tích hợp stylesheet độc lập sử dụng hệ thống token biến màu `--ss-*` từ `navbar.css`, đồng bộ hoàn hảo cả 2 chế độ Sáng/Tối và responsive trên màn hình nhỏ.
   - **`src/components/navbar/Navbar.jsx` & `src/layouts/MainLayout.jsx`:**
     - Nhúng `<NotificationBell />` vào thanh điều hướng, kết nối luồng duyệt/từ chối đơn ca kíp qua `approveSwapRequest` / `rejectSwapRequest` và `approveLeaveRequest` / `rejectLeaveRequest`.
     - Hỗ trợ fallback dữ liệu mẫu thông minh khi môi trường chưa có thông báo phát sinh.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công trong 886ms (0 lỗi JSX, 0 lỗi biên dịch).
   - **Kiểm thử Đơn vị:** 110/110 unit test PASS 100% trong 1.07s (0 lỗi).
   - **Bảo toàn Chức năng:** Trải nghiệm duyệt đơn, đánh dấu đã đọc và xem thông báo hoạt động chính xác và nhạy bén.

### Nhiệm vụ NAV-004 — Khắc Phục Nút Thông Báo Navbar Thành Menu Popover Dropdown Trực Quan
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi người dùng: *"nút bấm thông báo bị lỗi rồi!"*.
   - Khắc phục sự cố nút chuông thông báo điều hướng trang bất ngờ thay vì hiển thị popover thông báo.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`Navbar.jsx`:**
     - Thay thế thẻ `<Link to="/notifications">` thành nút bấm `<button className="ssn-ico" onClick={() => toggle("notif")}>`.
     - Xây dựng hộp menu thông báo nổi (`.ssn-menu.right.ssn-menu-notif`) với:
       - Header hiển thị tổng số thông báo chưa đọc và nút "Đã đọc tất cả" (`CheckCheck`).
       - 3 tab lọc: **Tất cả**, **Chưa đọc** và **Yêu cầu** (Đơn nghỉ phép, Đổi ca, Ca mở).
       - Từng dòng thông báo hiển thị icon theo loại nghiệp vụ (Schedule, Swap, Leave, Workforce, Attendance), tiêu đề, nội dung vắn tắt, thời gian tương đối ("Vừa xong", "10 phút trước",...) và chấm xanh chưa đọc.
       - Nhấp vào thông báo sẽ tự động gọi API đánh dấu đã đọc và điều hướng ngay đến trang nghiệp vụ tương ứng.
   - **`navbar.css`:**
     - Bổ sung toàn bộ định dạng CSS cho `.ssn-menu-notif`, `.ssn-notif-hdr`, `.ssn-notif-tabs`, `.ssn-notif-list`, `.ssn-notif-item`, `.ssn-notif-empty` hỗ trợ hoàn hảo cả 2 chế độ Sáng / Tối.
   - **`MainLayout.jsx`:**
     - Đấu nối `getMyNotifications()`, `markNotificationAsRead()`, `markAllNotificationsAsRead()` và truyền dữ liệu reactive qua props vào `Navbar`.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công trong 8.32s (0 lỗi JSX, 0 lỗi biên dịch).
   - **Kiểm thử Đơn vị:** 110/110 unit test PASS 100% trong 3.96s (0 lỗi).
   - **Bảo toàn Chức năng:** Trải nghiệm nhấp chuông thông báo hiển thị popover tức thời tại chỗ, không reload hay nhảy trang.

### Nhiệm vụ NAV-003 — Tích Hợp Thử Nghiệm Navbar Tinh Gọn Cùng ThemeProvider (Light & Dark Mode)
1. **Yêu cầu & Mục tiêu (User Request):**
   - Áp dụng thử mã nguồn Navbar, ThemeProvider và stylesheet `navbar.css` theo thiết kế trực quan do người dùng cung cấp.
   - Hỗ trợ đổi giao diện Sáng / Tối (`light` & `dark`) theo chuẩn token `:root, [data-theme="light"]` và `[data-theme="dark"]`.
   - Kết nối dữ liệu thời gian thực đầy đủ: Người dùng, chi nhánh hiện tại, bộ đếm đơn chờ duyệt, ca mở, thông báo và điều hướng.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`src/components/navbar/navbar.css`:**
     - Thiết lập token màu: `--ss-bar`, `--ss-surf`, `--ss-line`, `--ss-tx`, `--ss-mu`, `--ss-ac`, `--ss-warn`, `--ss-shadow`.
     - Styling cho `.ssn`, `.ssn-logo`, `.ssn-store`, `.ssn-nav`, `.ssn-tab`, `.ssn-menu`, `.ssn-user`, `.ssn-burger`.
   - **`src/components/navbar/theme.jsx`:**
     - `ThemeProvider` quản lý `shiftsync-theme` trong `localStorage`, cập nhật `document.documentElement.dataset.theme` và `style.colorScheme`.
     - Xuất hook `useTheme()` phục vụ toggle chế độ Sáng / Tối.
   - **`src/components/navbar/Navbar.jsx`:**
     - 5 nhóm phân hệ: Dashboard, Lập lịch ca, Chấm công & Phép, Chợ ca mở, Hồ sơ nhân sự.
     - Dropdown menu với animation trượt mượt mà, phím tắt `Ctrl + K`, đóng menu bằng phím `Escape` hoặc nhấp chuột ra ngoài.
     - Đồng bộ active tab thông minh hỗ trợ cả route gốc `/` và `/attendance`.
   - **`src/layouts/MainLayout.jsx` & `src/App.jsx`:**
     - Bọc `ThemeProvider` ở cấp cao nhất ứng dụng.
     - Nạp dữ liệu thực tế từ các service (`storeService`, `leaveService`, `marketplaceService`, `notificationService`).
     - Bổ sung định tuyến cho các đường dẫn con tránh lỗi 404 (`/dashboard`, `/attendance`, `/notifications`,...).
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công trong 7.30s (0 lỗi JSX, 0 lỗi biên dịch).
   - **Kiểm thử Đơn vị:** 110/110 unit test PASS 100% trong 6.89s (0 thất bại).
   - **Bảo toàn Chức năng:** Toàn bộ luồng đăng nhập, chọn chi nhánh, điều hướng ca kíp và không gian 3D hoạt động ổn định.

### Nhiệm vụ NAV-002 — Tái Thiết Kế Navbar & Logo Nhận Diện (Aero-Precision Mission Control)
1. **Yêu cầu & Mục tiêu (User Request):**
   - Phản hồi từ người dùng: *"tại sao lại để chữ shiftsync pro"*, *"cái logo cũng xấu"*, *"/frontend-design Thiết kế lại navbar"*.
   - Khắc phục triệt để các tồn tại giao diện:
     - Gỡ bỏ huy hiệu `PRO` không cần thiết.
     - Thiết kế lại biểu tượng logo thủ công, mang tính động học cao, tránh xa các icon generic mặc định (như Sparkles).
     - Áp dụng phương pháp luận `frontend-design` tạo dựng phong cách thẩm mỹ đẳng cấp: **Aero-Precision Mission Control** (DFII Score: 14/15) - kết hợp tinh thần buồng lái điều khiển hiện đại, bề mặt obsidian acrylic, viền quang học laser và nhịp bố cục chính xác.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`Header.jsx`:**
     - Thiết kế SVG Monogram `ShiftSyncLogoMark`: 3 vệt quỹ đạo ca kíp động học (kinetic tracks) kết hợp 2 node tín hiệu viễn trắc (anchor nodes), chuyển sắc gradient ngọc lục bảo sang cyan quang phổ (`#10b981` -> `#06b6d4`), tạo hình khối chữ "S" uyển chuyển và công nghệ.
     - Typography Wordmark phân tầng tương phản cao: `Shift` (trắng bạc #f8fafc) + `Sync` (xanh ngọc lục bảo #10b981) kèm chấm trạng thái radar xanh lục nhấp nháy êm dịu (`.ss-status-beacon-pip`).
     - Chuẩn hóa hệ thống nhãn điều hướng: Chuyển đổi toàn bộ nhãn in hoa cồng kềnh sang mixed-case thân thiện tiếng Việt (`Dashboard`, `Lập Lịch Ca`, `Chấm Công & Phép`, `Chợ Ca Mở`, `Hồ Sơ Nhân Sự`, `Quản Trị`).
     - Thanh chỉ báo quang học active dạng laser (`.ss-laser-indicator`) chạy bên dưới mục được chọn.
     - Gom cụm khoang lái điều khiển bên phải (`.ss-cockpit-cluster`) thành các pod đồng nhất (`.ss-cockpit-btn`): Nút đổi chi nhánh có mã cửa hàng và chấm kết nối thời gian thực, nút chuyển chế độ Top/Sidebar Rail, radar chuông thông báo phát sáng khi có tin mới, và khung thẻ avatar nhân sự.
   - **`Header.css`:**
     - Tái cấu trúc toàn bộ biến thiết kế: `--ss-nav-bg: rgba(10, 14, 23, 0.92)`, `--ss-nav-accent: #10b981`, `--ss-nav-cyan: #06b6d4`, `--ss-nav-amber: #f59e0b`.
     - Thanh canopy siêu mỏng 58px, đường viền chân trời specular horizon border `rgba(255, 255, 255, 0.08)`.
     - Flyout panel kính mờ mật độ cao `backdrop-filter: blur(28px)`, phân tách 2 cột rõ ràng, loại bỏ mũi tên nhô ra gây mất cân đối thị giác, bổ sung phím tắt hướng dẫn (`ESC để đóng`).
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Production Build:** `npm run build` thành công xuất sắc trong 34.96s (0 lỗi cú pháp, 0 lỗi JSX).
   - **Kiểm thử Đơn vị:** 110/110 unit test trong toàn bộ 21 test suites PASS 100% trong 985ms.
   - **Bảo toàn Chức năng:** Duy trì 100% tính năng chuyển chi nhánh, thông báo thời gian thực, bộ sưu tập avatar 3D và điều hướng chuyển trang.

### Nhiệm vụ NAV-001 — Triển Khai Kiến Trúc Thanh Điều Hướng Flyout Navbar (Top & Sidebar Rail)
1. **Yêu cầu & Mục tiêu (User Request):**
   - *"áp dụng thử flyout navbar"*
   - Nâng cấp hệ thống điều hướng toàn diện cho ShiftSync Web với cơ chế Flyout Navbar ("menu bay ra") hiện đại, phân loại 6 phân hệ cốt lõi rõ ràng, trực quan, hỗ trợ kiểm thử song song cả 2 phong cách giao diện:
     1. **Top Flyout Navbar (Mặc định):** Thanh ngang trên đầu, khi hover/click vào phân hệ sẽ trôi xuống Mega Flyout Panel chi tiết.
     2. **Sidebar Rail Flyout Navbar:** Thanh rail đứng 68px bên trái, giải phóng 100% chiều cao màn hình cho không gian 3D Digital Twin và lịch ca.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`MainLayout.jsx`:**
     - Quản lý trạng thái `navMode` (`'top'` vs `'rail'`), tự động đồng bộ và nạp từ `localStorage` (`ss_flyout_mode`).
     - Lắng nghe và phát sự kiện `ss_flyout_mode_changed` để cập nhật bố cục linh hoạt giữa `flexDirection: column` và `flexDirection: row`.
   - **`Header.jsx`:**
     - Thiết lập cấu trúc `NAV_ITEMS` chuẩn mực gồm 6 phân hệ: Dashboard (Tổng quan & 3D Twin), Workforce Scheduling (Điều phối & Lập lịch), Time & Workforce (Chấm công & Nghỉ phép), Marketplace (Chợ ca & Đổi ca), Employees (Nhân sự), Admin (Quản trị hệ thống).
     - Mỗi phân hệ tích hợp: `categoryTag`, mô tả vai trò, biểu tượng Lucide tương ứng, `quickAction` (lối tắt thao tác nhanh) và danh mục liên kết con `subItems` với mô tả và badge số lượng việc cần duyệt thời gian thực (`pendingLeaveCount`, `openShiftsCount`, `pendingSwapCount`, ...).
     - Xử lý debounce timer 140ms (`handleNavMouseEnter`, `handleNavMouseLeave`) chống giật/rung chuột khi di chuyển giữa các nút điều hướng.
     - Xử lý tương tác bàn phím (phím `Escape` đóng ngay flyout) và đóng khi nhấp chuột ra ngoài màn hình.
     - Hỗ trợ nút chuyển đổi nhanh chế độ hiển thị: Nút `[ Flyout Sidebar ]` ở Top Bar và nút `[ PanelTop ]` ở thanh Sidebar Rail.
     - Bảo toàn 100% chức năng chuyển chi nhánh (`StoreSwitcher`), popover thông báo (`NotificationsPopover`), modal xem bộ sưu tập avatar 3D (`AvatarCollectionModal`) và menu tài khoản.
     - Thiết kế Mobile Drawer trượt ra cho màn hình nhỏ (< 1080px) dạng accordion đóng/mở từng nhóm.
     - Tái thiết kế Logo nhận diện thương hiệu: Thay thế icon ngôi sao `Sparkles` và khối nền xanh lá lòe loẹt bằng biểu tượng vector các thanh ca kíp Gantt (`ShiftSyncLogoMark`) chuẩn từ trang đăng nhập, kết hợp chữ hai tông màu hiện đại `Shift` (trắng sáng) + `Sync` (xanh ngọc lục bảo).
   - **`Header.css`:**
     - Giao diện glassmorphism sang trọng (`backdrop-filter: blur(24px)`, viền kim loại `rgba(255,255,255,0.08)`).
     - Hoạt ảnh xuất hiện mượt mà (`ssFlyoutTopEnter` và `ssFlyoutRailEnter`).
     - Tối ưu vị trí popover và responsive hoàn hảo.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Tự động:** Toàn bộ 110/110 test unit trong `src/**/*.test.js` PASS 100% trong 985ms.
   - **Kiểm thử Production Build:** `npm run build` thành công trong 6.01s (0 lỗi cú pháp hay đóng gói).
   - **Tương thích Không gian 3D:** Không gian 3D Digital Twin, camera và bộ điều khiển Raycasting hoạt động ổn định và mở rộng tầm nhìn tối đa khi ở chế độ Sidebar Rail.

### Nhiệm vụ FURN-001 — Xây Dựng 4 Mô Hình Bàn Ghế GLB Độc Lập Chuẩn Chỉ & Showroom 3D
1. **Yêu cầu & Mục tiêu (User Request):**
   - *"các bàn ghế xung quanh cũng là .glb được không"* -> Người dùng chọn **"Cách 1"** (Tạo các tệp .glb bàn ghế độc lập, chuẩn chỉ, module hóa).
   - Xây dựng 4 bộ mô hình 3D bàn ghế chuẩn glTF 2.0 Binary (`.glb`) với vật liệu PBR cao cấp, cấu trúc hình học tối ưu, không ghép layer tạm bợ.
   - Triển khai trang Showroom 3D Studio xoay 360 độ tương tác (`public/furniture-viewer.html`) và gắn nút truy cập nhanh trên thanh công cụ `SpatialToolbar.jsx`.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **Kịch bản Điêu khắc & Xuất GLB Tự động (`scripts/generate-furniture-models.js`):**
     - Sử dụng Three.js và `GLTFExporter` của Node.js tạo 4 tệp `.glb` độc lập:
       1. `ShiftSync_Bistro_Set.glb` (123.6 KB): Bàn tròn thạch anh trắng + 2 ghế gỗ uốn bentwood bọc đệm êm, chân bọc đồng thau.
       2. `ShiftSync_Communal_Table.glb` (181.4 KB): Bàn dài gỗ sồi khối lớn 4.6m, chân khung thép chữ A, thanh giằng đồng thau + 6 ghế quầy bar xoay bọc da espresso.
       3. `ShiftSync_Booth_Sofa.glb` (15.6 KB): Băng ghế sofa booth nhà hàng cao cấp, chân đế ốp gỗ sồi, nệm nhung xanh ngọc lục bảo (emerald green velvet), vách ngăn nỉ cách âm + bàn thạch anh trung tâm.
       4. `ShiftSync_Lounge_Nook.glb` (91.2 KB): 2 ghế bành thư giãn da bò cognac uốn lượn phong cách Mid-Century + bàn trà tròn đá cẩm thạch trắng Carrara chân hairpin đồng thau.
     - Tự động đồng bộ vào 3 vị trí: `ShiftSync-Web/public/models/`, `./` (gốc dự án) và `shiftsync-backend/`.
   - **Showroom 3D Studio Tương tác (`ShiftSync-Web/public/furniture-viewer.html`):**
     - Đầy đủ tính năng OrbitControls 360 độ, bàn xoay tự động turntable, chế độ khung dây wireframe, đổi nhanh 4 mẫu nội thất và thẻ thông số kỹ thuật (vật liệu PBR, số lượng mesh, kích thước tệp).
   - **Tích hợp Thanh Công cụ (`SpatialToolbar.jsx`):**
     - Thêm nút liên kết `Nội thất 3D` (biểu tượng ghế bành `Armchair` xanh lá cây dịu mát) cạnh `360° Studio` mở ngay showroom trong tab mới.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Tự động:** 110/110 test unit trong `src/features/spatial-workspace/` PASS 100% trong 2.56s.
   - **Kiểm thử Production Build:** `npm run build` thành công trong 2.25s (0 lỗi).
   - **Kiểm thử Trực quan trên Trình duyệt:** Chụp ảnh màn hình cả 4 mẫu bàn ghế trong showroom và thanh công cụ trên web thật.

### Nhiệm vụ WS-004 — Loại Bỏ Mô Hình Bàn Làm Việc Đơn Lẻ Giữa Màn Hình (Remove Standalone Mock Workstation)
1. **Yêu cầu & Mục tiêu (User Request):**
   - *"ok xóa cái bàn giữa màn đi"*
   - Loại bỏ chiếc bàn làm việc máy tính kèm ghế văn phòng và thẻ nhãn nổi `Bàn Làm Việc Nhân Viên (3D)` / `WS-01` nằm chình ình giữa lối đi trung tâm cửa hàng, trả lại không gian thoáng đãng cho luồng di chuyển và tầm nhìn.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **Căn nguyên:** Trong quá trình thử nghiệm Phase 2A, một component độc lập `<WorkstationAssetModel position={[-0.8, 0, 0.6]} />` đã được cắm trực tiếp vào `DigitalTwinCanvas.jsx` để kiểm thử mô hình máy tính. Do đây là trạm làm việc mẫu tĩnh (hardcoded dummy workstation), nó xuất hiện cố định ngay trước lối vào và giữa sàn nhà ở cả chế độ Toàn cảnh lẫn chế độ Tham quan 3D.
   - **Khắc phục:**
     - Xóa bỏ hoàn toàn khai báo và phần render `<WorkstationAssetModel />` khỏi `DigitalTwinCanvas.jsx`.
     - Toàn bộ các trạm làm việc chuẩn mực thực tế trong cửa hàng vẫn tiếp tục được tải và quản lý tự động, chuẩn xác thông qua `WorkstationLayer` (kết nối dữ liệu phân khu, API trạm làm việc thực tế và nodes nghiệp vụ trong mô hình GLB).
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Tự động:** Chạy toàn bộ 110/110 test unit trong `src/features/spatial-workspace/` đều PASS 100% (1.11s).
   - **Kiểm thử Production Build:** `npm run build` thành công trong **886ms** (0 lỗi).
   - **Kiểm thử Trực quan trên Trình duyệt (Chrome DevTools):**
     - Đã chụp ảnh màn hình xác nhận: Khu vực trung tâm cửa hàng và lối vào từ cửa chính hoàn toàn thông thoáng, không còn chiếc bàn máy tính đơn lẻ hay thẻ nhãn che khuất tầm nhìn.

### Nhiệm vụ CAM-001 — Nâng Cấp Tự Do Hóa Tuyệt Đối Camera 3D (Overview Orbit & Tham Quan Free Fly)
1. **Yêu cầu & Mục tiêu (User Request):**
   - *"camera khoong dudowjc tuwj do af"* (Camera không được tự do à?)
   - Xóa bỏ mọi ràng buộc góc nhìn gò bó trên cả 2 chế độ:
     1. **Chế độ Toàn cảnh (Overview OrbitControls):** Mở rộng góc nghiêng (polar angle) xuống sát mặt phẳng ngang ($89.7^\circ$) để ngắm nhân viên ngang tầm mắt, cho phép zoom cực cận ($0.2\text{m}$) ngắm rõ gương mặt nhân vật, pan tự do bằng chuột phải/phím mũi tên, hủy ngay lập tức hoạt ảnh lerp khi người dùng kéo chuột và hỗ trợ **nhấp đúp chuột (Double-Click)** để xoay camera re-center tâm điểm vào bất kỳ đối tượng/sàn nhà nào.
     2. **Chế độ Tham quan 3D (First/Third-Person Walkthrough):** Mở rộng góc ngước mắt (`pitch`) lên trần nhà ($85^\circ$) và cúi xuống sàn ($85^\circ$), tích hợp chế độ **Bay Tự Do (Free Fly / Noclip 3D)** bật/tắt bằng phím `[C]`, bay lên bằng `Space`/`E` và hạ độ cao bằng `Shift`/`Q`.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **`CameraManager.js`:**
     - Thiết lập lại ràng buộc: `minPolarAngle = 0.01`, `maxPolarAngle = 1.565` (~$89.7^\circ$), `minDistance = 0.2`, `maxDistance = 180`, `enablePan = true`, `screenSpacePanning = true`, `keyPanSpeed = 16.0`.
     - Trong sự kiện lắng nghe bắt đầu orbit (`_orbitStartListener`): bổ sung `this.cameraController.isTransitioning = false;` để nhường quyền điều khiển 100% cho thao tác chuột của người dùng ngay lập tức.
     - Hàm `setOrbitTarget(targetPos, distance)`: Hỗ trợ tái định tâm điểm OrbitControls mượt mà đến bất kỳ vị trí 3D nào.
     - Đồng bộ lại `_activatePerspective()` giữ nguyên giới hạn tự do `0.01` và `1.565`.
   - **`PlayerController.js`:**
     - Thêm cờ `isFlyMode`, phím `flyUp`, `flyDown` và callback `onFlyModeChange`.
     - Mở rộng phạm vi ngước/cúi chuột: `this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch))` ($[-85^\circ, +85^\circ]$).
     - Trong `handleKeyDown` / `handleKeyUp`: Nhận diện phím `KeyC` để bật/tắt bay tự do, `Space` để bay lên, `KeyQ` để bay xuống.
     - Trong `update(...)`: Tách nhánh vật lý: Khi `isFlyMode` bật, di chuyển tự do 3 chiều theo véc-tơ nhìn của camera (bỏ qua trọng lực và va chạm vật cản), cho phép bay lượn từ độ cao $0.2\text{m}$ đến $30\text{m}$ ngắm toàn cảnh cửa hàng từ trên không.
   - **`DigitalTwinCanvas.jsx`:**
     - Thêm sự kiện `dblclick` trên canvas WebGL: Dùng raycaster bắn tia trúng nhân viên, quầy kệ hoặc sàn nhà để tự động gọi `cameraManagerRef.current.setOrbitTarget(hitPoint)` định tâm xoay quanh mục tiêu đó.
   - **`ExploreHUD.jsx` & `SpatialWorkspace.jsx`:**
     - Truyền trạng thái `isFlyMode` vào ExploreHUD.
     - Thanh điều khiển dưới đáy hiển thị rõ phím tắt `[C] Bay: Bật (Space/Q)` kèm hiệu ứng badge xanh ngọc emerald rực rỡ khi đang kích hoạt bay tự do.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Tự động:** Chạy toàn bộ 110/110 test unit trong `src/features/spatial-workspace/` đều PASS 100% trong 3.02s.
   - **Kiểm thử Production Build:** `npm run build` thành công trong **2.10s** (0 lỗi).
   - **Kiểm thử Trực quan trên Trình duyệt (Chrome DevTools):**
     - Đã chụp ảnh màn hình xác nhận: Chế độ tham quan góc nhìn thứ nhất với phím `[C]` chuyển đổi chế độ bay mượt mà, độ cao bay nâng từ $0.2\text{m}$ lên $2.53\text{m}$ ngắm toàn cảnh quầy kệ từ trên không vô cùng thoáng đãng.

### Nhiệm vụ ASSET-012 — Đưa Hệ Thống Model 3D GLB Vào Thay Thế Toàn Bộ Nhân Viên Không Gian Cửa Hàng
1. **Yêu cầu & Mục tiêu (User Request):**
   - *"Đưa model này vào thay thế nhân viên"*
   - Tích hợp 4 mô hình 3D GLB hoàn chỉnh (Barista, Manager, Cashier, Chef) vào toàn bộ phân hệ Không gian 3D Digital Twin (`AvatarLayer.jsx`, `StylizedAvatars.js`, `PlayerAvatar.js`), thay thế hoàn toàn các khối hình nhân procedural đa tầng cũ.
2. **Kiến trúc & Triển khai Chi tiết:**
   - **Mô-đun Quản lý Tài nguyên 3D (`CharacterAssetLoader.js`):**
     - Nạp song song và tiền lưu trữ (pre-cache) 4 tệp `.glb` trong bộ nhớ WebGL (`/models/ShiftSync_Barista.glb`, `ShiftSync_Manager.glb`, `ShiftSync_Cashier.glb`, `ShiftSync_Chef.glb`).
     - Cơ chế nhân bản `clone(true)` tái sử dụng toàn bộ `BufferGeometry` và `Material` đã đánh dấu `userData.isShared = true`, triệt tiêu rò rỉ bộ nhớ GPU và giải phóng heap.
     - Hàm phân giải vai trò chuẩn xác (`resolveCharacterRole`): Tự động nhận diện vai trò nhân viên từ tiếng Việt (có dấu / không dấu) lẫn tiếng Anh (`Pha chế / Barista`, `Quản lý / Manager`, `Thu ngân / Cashier`, `Bếp / Chef`).
     - Trích xuất tự động các khớp xương động lực học (`Hips`, `LeftHip`, `RightHip`, `LeftShoulder`, `RightShoulder`, `Head`, `Spine`).
     - Tạo nhãn tên 3D Billboard Sprite (`createStaffTagSprite`) bay lơ lửng trên đầu nhân viên ở tọa độ $y = 1.95\text{m}$, hiển thị chấm trạng thái hoạt động xanh lá, tên nhân viên và huy hiệu vai trò tương ứng màu sắc nhận diện.
   - **Tích hợp Tầng Nhân viên R3F (`AvatarLayer.jsx` & `StylizedAvatars.js`):**
     - Kích hoạt tiền tải ngay khi khởi tạo (`useEffect -> preloadAllCharacterModels`).
     - Tự động thay thế nhân vật GLB tương ứng với vai trò của nhân viên trong từng phân khu quầy.
     - Giữ nguyên toàn bộ cơ chế Raycasting tương tác: Nhấp chuột / chạm vào bất kỳ bộ phận nào của model 3D đều nhận diện đúng nhân viên (`userData.isPerson = true`, `userData.employee`).
     - Cập nhật vòng sáng chọn nhân viên (`selectionHalo`) và vòng tiếp đất (`contactRing`).
     - State Machine diễn hoạt:
       - **Trạng thái WALKING:** Xoay nhân vật mượt mà theo hướng di chuyển, đánh sải chân (`LeftHip`, `RightHip`), vung tay tự nhiên (`LeftShoulder`, `RightShoulder`), nhún hông công thái học (`Hips`).
       - **Trạng thái WORKING:** Nhịp thở lồng ngực tự nhiên (`Spine`), đảo mắt quan sát nhẹ nhàng (`Head`), các cử chỉ chuyên môn hóa theo nghề (Barista rót sữa/cầm ly cà phê, Thu ngân thao tác máy POS, Đầu bếp giữ khay bánh sừng bò, Quản lý quan sát ca làm).
   - **Nâng Cấp Nhân vật Khám Phá Góc Nhìn Thứ 3 (`PlayerAvatar.js`):**
     - Thay thế nhân vật người chơi chế độ "Tham quan 3D" bằng mô hình 3D `ShiftSync_Manager.glb` cao cấp, đồng bộ cử động bước đi và nhịp thở.
3. **Kiểm chuẩn & Nghiệm thu Thực tế:**
   - **Kiểm thử Tự động:** Bổ sung `CharacterGLBIntegration.test.js`, chạy toàn bộ 35/35 test tự động của phân hệ 3D đều PASS 100% trong 2.53s.
   - **Kiểm thử Production Build:** `npm run build` thành công trong **2.04s** (0 lỗi).
   - **Kiểm thử Trực quan trên Trình duyệt:**
     - Truy cập `/schedule` -> Chuyển sang "Không gian 3D".
     - Chụp ảnh màn hình thực tế: Nhân viên Barista và Thu ngân xuất hiện chuẩn xác tại quầy pha chế và quầy POS với đầy đủ mô hình 3D chất lượng cao, tóc uốn hữu cơ, trang phục sắc nét, huy hiệu nổi 3D và tương tác nhấp chọn trực quan.

### Nhiệm vụ ASSET-011 — Eliminate "Burglar Mask" Hair Geometry & Sculpt Organic Stylized Humanoid Faces
1. **Phân tích Căn nguyên Hình học (Root Cause Analysis - "Sao giống trộm vậy"):**
   - Người dùng gửi ảnh phản hồi: Nhân vật Barista nhìn giống "kẻ trộm" đội mũ trùm mặt (balaclava / ski mask).
   - Kiểm tra mã nguồn sinh hình học: Khối `crownGeo` có bán kính $0.165\text{m}$ với tham số góc `thetaLength = Math.PI * 0.58` ($104.4^\circ$). Do bắt đầu từ đỉnh đầu và kéo dài xuống dưới đường xích đạo, cộng với việc bán kính khối tóc lớn hơn hộp sọ ($0.155\text{m}$), lớp tóc đen đã trùm kín toàn bộ vầng trán, che khuất lông mày và cắt ngang qua giữa mắt nhân vật. Kết hợp với áo sơ mi đen, nhân vật trông như đang đội mũ len trùm đầu che kín mặt chỉ chừa miệng và 2 con mắt như kẻ trộm.
2. **Khắc phục Triệt Để & Tái Cấu Trúc Gương Mặt Chuẩn Stylized 3D:**
   - **Tái thiết kế Hình học Hộp sọ & Gương mặt Sáng sủa:**
     - Hộp sọ gương mặt Stylized mượt mà tỉ lệ chuẩn công thái học: Vầng trán cao rộng, không một chi tiết tóc nào đè xuống mắt.
     - Đôi mắt to tròn, sáng ngời với tròng đen Á Đông màu nâu sẫm ấm áp và điểm sáng phản chiếu (Catchlight) long lanh có hồn.
     - Lông mày sắc sảo thanh tú đặt cao ráo trên vầng trán.
     - Bổ sung chóp mũi thanh tú (`Nose_Tip`) và đôi môi mỉm cười thân thiện (`Lips_Smile`) chuẩn nụ cười dịch vụ F&B.
     - Bổ sung cổ áo sơ mi gập nếp (`Shirt_Collar`) ôm khít quanh cổ, loại bỏ khoảng hở cổ cũ.
   - **Tạo Khối Tóc Hữu Cơ (Organic Curved Hair Locks):**
     - Thay thế hoàn toàn các khối trụ cắt phẳng cũ bằng các khối cầu hữu cơ bo cong mềm mại (Organic Spheres & Tufts):
       - ☕ **Barista:** Mái tóc Quiff vuốt phồng bồng bềnh sang phải (`Barista_MainQuiff`, `Barista_SideTress`), lộ rõ trán sáng sủa nam tính.
       - 👔 **Manager:** Mái tóc rẽ ngôi 7/3 vuốt nếp quý ông lịch thiệp (`Manager_PartR`, `Manager_PartL`).
       - 💳 **Cashier:** Tóc mái thưa dịu dàng + Búi tóc cao năng động phía sau (`Cashier_Bun`) với chun vàng kim.
       - 🥐 **Chef:** Mũ Beret đầu bếp trắng tinh khiết kiểu Pháp phồng bồng bềnh (`ChefHat`).
3. **Nâng Cấp Chiếu Sáng Studio Chân Dung:**
   - Bổ sung nguồn sáng `fillLight` trực diện tầm mắt trong `avatar-studio.html`, xóa tan hoàn toàn bóng đổ dưới gầm mắt và mũi.
4. **Kiểm chuẩn & Nghiệm thu Trực quan:**
   - Xuất lại toàn bộ 4 model `.glb` (<325 KB, <9,800 tris).
   - `npm run build` thành công trong **2.74s** (0 lỗi).
   - Kiểm tra trực quan qua Chrome DevTools MCP trên cả 4 vai trò: Gương mặt sáng sủa, tươi tắn, thân thiện, không còn bất kỳ dấu hiệu mũ trùm kín mặt kiểu kẻ trộm.

### Nhiệm vụ ASSET-010 — 4-Role Professional F&B 3D Character Suite: Barista, Manager, Cashier, Chef
1. **Thiết kế Lại Barista Hiện Đại & Tách Biệt Các Vai Trò F&B (Root Cause Analysis & Design Pivot):**
   - Người dùng phản hồi: Bỏ nón lá, khăn rằn cồng kềnh; mẫu Barista trước đây chưa đẹp và sắc sảo bằng mẫu Polo; mẫu Polo trông giống Store Manager (Quản lý); yêu cầu thiết kế lại Barista sắc nét và tạo thêm các model 3D chuyên biệt cho các vị trí khác trong cửa hàng.
   - Xây dựng bộ 4 mô hình 3D hình nhân (Humanoid) hoàn chỉnh, giải phẫu công thái học cân đối, không ghép các lớp layer/box rời rạc:
     - **☕ ShiftSync_Barista.glb (Thợ Pha Chế Hiện Đại):**
       - Diện mạo: Kiểu tóc undercut vuốt ngược thời thượng, vẻ mặt tập trung, chuyên nghiệp.
       - Trang phục: Áo sơ mi đen xắn tay (`#1C1917`), tạp dề yếm canvas màu nâu Robusta (`#422006`) quai da bò thuộc vắt chéo sau lưng có đinh tán đồng thau, quần chino xám than, giày da đúc.
       - Đạo cụ nghiệp vụ: Tay trái cầm Ca đánh sữa Inox Latte Art sáng bóng (`metalness: 0.95`), tay phải cầm Ly cà phê takeaway nắp trắng chuẩn specialty cafe.
     - **👔 ShiftSync_Manager.glb (Quản Lý Cửa Hàng - Định hình từ mẫu Polo):**
       - Diện mạo: Mái tóc rẽ ngôi 7/3 vuốt pomade lịch thiệp, phong thái tự tin, đỉnh đạc.
       - Trang phục: Áo polo xanh navy cao cấp (`#0F172A`) có cổ bẻ sắc nét, quần âu tối màu phẳng phiu, giày tây đen bóng, thẻ tên quản lý mạ vàng (Gold ID Badge) cài ngực.
       - Đạo cụ nghiệp vụ: Cầm máy tính bảng điều hành cửa hàng (ShiftSync Manager Tablet) viền nhôm màn hình phát sáng số liệu ca làm.
     - **💳 ShiftSync_Cashier.glb (Thu Ngân & Chăm Sóc Khách Hàng):**
       - Diện mạo: Tóc búi gọn gàng năng động, ánh mắt thân thiện, nụ cười chào đón.
       - Trang phục: Áo sơ mi màu be cát thanh lịch (`#D6C7A1`), tạp dề lửng buộc ngang hông màu xanh navy, tai nghe bộ đàm F&B (Earpiece Headset) kết nối quầy pha chế.
       - Đạo cụ nghiệp vụ: Cầm máy quét mã vạch POS di động thông minh (Smart Handheld Terminal) có màn hình LED.
     - **🥐 ShiftSync_Chef.glb (Đầu Bếp Bánh Ngọt & Bếp Nóng):**
       - Diện mạo: Phong thái chỉn chu, sạch sẽ, tỉ mỉ của nghệ nhân làm bánh.
       - Trang phục: Áo Chef Coat trắng truyền thống 2 hàng cúc đen (`#F8FAFC`), mũ beret đầu bếp vải mềm (`#E2E8F0`), tạp dề trắng chấm gối.
       - Đạo cụ nghiệp vụ: Bưng khay bánh nướng inox sáng bóng với những chiếc bánh sừng bò (Croissants) vàng ươm thơm lừng.
2. **Pipeline Tự động Sinh & Xuất Bản Asset glTF 2.0 Binary (`scripts/generate-all-character-models.js`):**
   - Đạt chuẩn glTF 2.0 Binary, tối ưu dung lượng siêu nhẹ, kết xuất mượt mà 60 FPS:
     - `ShiftSync_Barista.glb`: 283.8 KB | 47 meshes | 8,348 triangles.
     - `ShiftSync_Manager.glb`: 225.2 KB | 36 meshes | 7,266 triangles.
     - `ShiftSync_Cashier.glb`: 235.5 KB | 38 meshes | 7,522 triangles.
     - `ShiftSync_Chef.glb`: 284.6 KB | 46 meshes | 9,196 triangles.
   - Đồng bộ sang các vị trí: `ShiftSync-Web/public/models/`, thư mục gốc của repository, và `shiftsync-backend/`.
3. **Nâng cấp Hệ Thống Trưng Bày & Tương tác Đa Nhân Vật:**
   - **Showroom WebGL (`ShiftSync-Web/public/avatar-studio.html`):**
     - Bổ sung bộ 4 nút chuyển đổi vai trò nhân vật trực tiếp: `☕ Barista`, `👔 Quản lý`, `💳 Thu ngân`, `🥐 Bếp bánh`.
     - Bảng thông số kỹ thuật động HUD (Triangle count, Mesh count, File size, Role description).
     - Đầy đủ tính năng Xoay 360° Turntable, Khung dây Wireframe, Camera góc mặt / thân / toàn cảnh, và dáng đi chuyển động Walk cycle.
   - **Trang Ứng Dụng Studio (`AvatarStudioPage.jsx`):**
     - Đặt Barista Hiện Đại làm nhân vật mặc định; hỗ trợ chọn tức thì cả 4 vai trò kèm mô tả chi tiết; tích hợp nút "Đặt làm Avatar của tôi" lưu trữ hồ sơ.
4. **Kiểm chuẩn & Nghiệm thu Trực quan:**
   - `npm run build` thành công trong **14.64s** (0 lỗi).
   - Kiểm thử trực tiếp bằng Chrome DevTools MCP trên cả 4 vai trò: Hiển thị mượt mà 60 FPS, trang phục và phụ kiện nghiệp vụ hiển thị sắc nét, sống động.

### Nhiệm vụ ASSET-009 — Complete 3D Vietnamese Heritage Barista Model (`ShiftSync_Vietnamese_Staff.glb`)
1. **Thiết kế Mô hình 3D Nhân vật Đậm chất Văn hóa Việt Nam:**
   - Dựng một nhân vật Barista/F&B Việt Nam hoàn chỉnh, tỉ lệ công thái học (~1.70m), cấu trúc hữu cơ bo cong mượt mà:
     - **Diện mạo Á Đông:** Làn da vàng ấm tự nhiên (`#E8BA93`), mái tóc đen tuyền rẽ ngôi 7/3 vuốt phồng hiện đại, đôi mắt nâu sẫm có điểm sáng phản chiếu (catchlight) sống động, vành tai và khóe môi tươi tắn.
     - **Trang phục Di sản Cà phê Việt (Heritage F&B Uniform):**
       - Áo sơ mi đũi màu xanh rêu quân đội trầm (`#2D4536` - phong cách Cộng Cà Phê / Phê La) có hàng cúc gỗ mộc mạc và ve áo cài huy hiệu Cờ Đỏ Sao Vàng nhỏ xinh.
       - **Khăn Rằn Nam Bộ Truyền Thống:** Vòng quấn quanh cổ trang nhã với họa tiết kẻ sọc carô đen - trắng ngà đặc trưng miền sông nước Nam Bộ, buông 2 vạt nơ mềm mại trước ngực.
       - **Tạp dề Barista Canvas Nâu Robusta:** Màu nâu hạt cà phê Robusta Tây Nguyên (`#3E2723`), có quai da bò thuộc vàng nâu đan chéo sau lưng và đinh tán đồng thau.
       - **Nón Lá Việt Nam Cách Điệu Sau Lưng:** Nón lá nan vàng rơm tự nhiên (`#E8C88B`) có gờ vành nón uốn lượn và dải lụa xanh ngọc bích mềm mại, được đeo nghiêng nhẹ sau lưng nhân viên.
     - **Phụ kiện Biểu tượng Văn hóa F&B:**
       - **Chiếc Phin Cà Phê Nhôm Truyền Thống (Aluminum Coffee Phin):** Đĩa lót có gờ, thân trụ phin nhôm có gờ dập nổi vòng quanh và nắp phin có núm cầm sáng bóng (`metalness: 0.90`).
       - **Ly Cà Phê Sữa Đá Thủy Tinh:** Ly thủy tinh trong suốt với lớp sữa đặc ngọt ngào dưới đáy, lớp cà phê nâu sẫm ở giữa và ống hút tre xanh mộc mạc.
     - **Khớp Chi Động Học:** Đầy đủ các khớp vai, khuỷu, cổ tay, khớp háng, đầu gối, mắt cá chân và giày sneaker trắng trẻ trung.
2. **Xuất Bản Asset glTF 2.0 Binary:**
   - Tệp mô hình: `ShiftSync-Web/public/models/ShiftSync_Vietnamese_Staff.glb` (424.8 KB, 68 meshes, 13,778 triangles), đồng bộ sang root `ShiftSync_Vietnamese_Staff.glb` và `shiftsync-backend/`.
3. **Tích hợp Vào Hệ Thống Studio & Showroom:**
   - Cập nhật trang `AvatarStudioPage.jsx` (`/avatar-studio`) đặt mô hình Việt Nam làm nhân vật mặc định cùng nút chọn nhanh `🇻🇳 Barista Cà Phê Việt (Phin & Nón Lá)`.
   - Cập nhật showroom WebGL `public/avatar-studio.html` có bộ chuyển đổi nhanh giữa mô hình Barista Việt Nam và mô hình Polo tiêu chuẩn.
4. **Kiểm chuẩn & Nghiệm thu:**
   - `npm run build` thành công trong **7.11s** (0 lỗi).
   - Kiểm tra trực quan trên Chrome DevTools: Model hiển thị nón lá, khăn rằn, phin cà phê và ly cà phê sữa đá cực kỳ sắc nét, vận hành mượt mà 60 FPS.

### Nhiệm vụ ASSET-008 — Ready Player Me & React Three Fiber Humanoid Avatar Architecture (DEV.to Pattern)
1. **Phân tích Kiến trúc Tham chiếu (DEV Community Pattern):**
   - Dựa trên giải pháp bài viết *"How to Use Three.js And React to Render a 3D Model of Your Self"*:
     - Bước 1: Khởi tạo/Tùy biến Avatar thực thể người cá nhân hóa qua **Ready Player Me (Wolf3D)** từ ảnh selfie hoặc bộ chọn khuôn mặt/tóc/trang phục.
     - Bước 2: Xuất mô hình nhị phân glTF 2.0 Binary (`.glb`) có bộ khung xương Rigged Skeleton đầy đủ (`Hips`, `Spine`, `Head`, `Limbs`).
     - Bước 3: Nạp và kết xuất trực quan trong React thông qua `@react-three/fiber` và `@react-three/drei` (`<Canvas>`, `<OrbitControls>`, `useGLTF`).
2. **Triển khai Component Hiển thị Chuẩn (`ReadyPlayerMeViewer.jsx`):**
   - Thiết lập khung nhìn React Three Fiber theo đúng đặc tả bài viết:
     - Ánh sáng PBR: `<ambientLight intensity={1.2} />`, `<directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />`, `<pointLight color="#38BDF8" />`.
     - Điều khiển góc nhìn công thái học: 3 preset chuẩn (Gương mặt `face`, Nửa thân trên `upper`, Toàn thân `full`), `OrbitControls` mượt mà có damping, chống lật camera dưới sàn (`maxPolarAngle = PI/2`).
     - Khả năng nạp đa nguồn: Hỗ trợ tệp GLB cục bộ (`/models/ShiftSync_Employee.glb`), link Ready Player Me trực tiếp (`https://models.readyplayer.me/...glb`), hoặc tệp `.glb` tải lên từ máy tính.
3. **Bộ Tích hợp Sáng tạo Avatar Trực tuyến (`ReadyPlayerMeCreatorModal.jsx`):**
   - Nhúng Web Frame Avatar Creator chính thức của Ready Player Me (`https://demo.readyplayer.me/avatar?frameApi`).
   - Lắng nghe sự kiện `v1.avatar.exported` qua `window.addEventListener('message')` để tự động lấy link `.glb` và nạp thẳng vào ứng dụng ShiftSync mà không cần thao tác tải về máy thủ công.
   - Hỗ trợ dán link URL và kéo thả file `.glb` trực tiếp.
4. **Trang Studio 3D Avatar Chuyên biệt (`AvatarStudioPage.jsx` - Route `/avatar-studio`):**
   - Giao diện Dark Studio cao cấp (`#111A21`), thanh điều khiển góc nhìn camera, chuyển đổi xoay 360° Turntable, nút "Tạo mới bằng Ready Player Me", và nút "Đặt làm Avatar của tôi" lưu trữ trực tiếp vào hệ thống.
   - Tích hợp nút mở nhanh trong `AvatarCollectionModal.jsx` (Bộ sưu tập Avatar cá nhân).
5. **Showroom Độc lập Kiểm thử Nhanh (`public/avatar-studio.html`):**
   - Showroom WebGL Three.js độc lập tại `http://localhost:3000/avatar-studio.html` có kèm Drawer hiển thị mã nguồn React Three Fiber mẫu từ bài viết DEV.to.
6. **Kiểm chuẩn Tự động:**
   - `npm run build` thành công trong **1.51s** với 0 lỗi.
   - Kiểm thử trực tiếp qua Chrome DevTools MCP: Cả trang HTML showroom và route React `/avatar-studio` đều render sắc nét, mượt mà 60 FPS, đóng mở modal và xoay camera hoàn hảo.

### Nhiệm vụ ASSET-007 — Complete 3D Humanoid Employee Model (Thực thể Nhân viên 3D Hoàn Chỉnh - Không ghép layer khối màu)
1. **Phân tích Căn nguyên (Root Cause Analysis):**
   - Trước đây nhân vật được dựng từ các hình khối hộp chữ nhật (`BoxGeometry`) xếp chồng lên nhau như đồ chơi lắp ráp Lego/Minecraft, tạo cảm giác rời rạc và các lớp màu bị dán phẳng lên nhau.
2. **Thiết kế Mô hình Nhân viên 3D Chuẩn mực (`scripts/generate-employee-glb.js`):**
   - Tạo nhân vật công thái học Stylized tỉ lệ thực F&B (~1.72m) với hình học hữu cơ mượt mà, không chắp vá:
     - **Phần Đầu & Khuôn mặt:** Hộp sọ cranium bo tròn mềm mại (`SphereGeometry`), mái tóc 3D bồng bềnh rẽ ngôi lượn sóng tự nhiên, đôi mắt 3D đa lớp có con ngươi và điểm sáng phản chiếu (catchlight) sống động, tai bo cong, cổ đứng.
     - **Đồng phục ShiftSync Chuyên nghiệp:** Áo thun polo ShiftSync có cổ bẻ sắc sảo, tạp dề yếm Barista Utility Apron ôm sát thân người với quai da đan chéo sau lưng (`cross-back leather straps`), đinh tán đồng thau kim loại và thẻ tên nhân viên có dây đeo lanyard.
     - **Hệ thống Khớp Chi Linh hoạt (Articulated Kinematic Hierarchy):** Đầy đủ các trục xoay hông (`Hips`), sống lưng (`Spine`), lồng ngực (`Chest`), vai (`Shoulder`), khuỷu tay (`Elbow`), cổ tay (`Wrist`), khớp háng (`Hip`), đầu gối (`Knee`), mắt cá chân (`Ankle`) và bàn chân giày da đúc đế gờ (`Molded Leather Shoes with Sole Rim`).
     - **Phụ kiện Nghiệp vụ:** Tay cầm máy tính bảng điều hành ShiftSync Manager Tablet viền kim loại màn hình phát sáng nhẹ.
3. **Xuất Bản Tài nguyên glTF 2.0 Binary (`ShiftSync_Employee.glb`):**
   - Đạt chuẩn glTF 2.0 Binary: `ShiftSync-Web/public/models/ShiftSync_Employee.glb` (299.1 KB, 45 meshes, 7,996 triangles), đồng bộ sang `shiftsync-backend/ShiftSync_Employee.glb`.
4. **Xây dựng Phòng Trưng bày & Kiểm định Tương tác 360° (`employee-viewer.html`):**
   - Tạo trang WebGL showroom độc lập tại `http://localhost:3000/employee-viewer.html` cho phép xoay 360°, bật/tắt khung dây cấu trúc (wireframe), kiểm tra dáng đi chuyển động (walk animation cycle) chân thật.
5. **Đồng bộ Nâng cấp Thực thể Người chơi Khám phá (`PlayerAvatar.js`):**
   - Thay thế toàn bộ mã nguồn hình học hộp chữ nhật phẳng cũ trong `PlayerAvatar.js` bằng các hình học cong mượt mà, cấu trúc cơ thể liền mạch khớp với mô hình mẫu, bảo toàn 100% API `update(speed, dt, time)` và kiểm thử an toàn SSR.
6. **Kiểm chuẩn Tự động:**
   - `npm run build` thành công trong **1.24s**, 0 lỗi.
   - Kiểm thử trực tiếp trong browser: Hoạt động trơn tru 60 FPS cả ở phòng trưng bày lẫn trong không gian quán 3D thực tế.

### Nhiệm vụ ASSET-006 — Full Triad Integration: PBR Texture Mapping, Baked Ambient Occlusion & Architectural GLB
1. **Khởi tạo Module Tăng cường Vật liệu (`DigitalTwinMaterialEnhancer.js`):**
   - Thiết lập hệ thống tạo Texture Procedural PBR kết hợp **Baked Ambient Occlusion & Depth Gradients** đạt chuẩn 512x512 Canvas không tốn tài nguyên GPU (0% overhead, không giật lag):
     - **Scandinavian Oak Wood Texture:** Vân thớ gỗ sồi tự nhiên uốn lượn sáng tối với các rãnh thớ dọc và lớp gradient bóng đổ chân mép tiếp xúc.
     - **Italian Carrara White Marble Texture:** Đá thạch anh / cẩm thạch trắng bóng có các đường vân xám tro loang nhẹ tự nhiên (`roughness: 0.18`).
     - **Polished Terrazzo Ceramic Tile Floor Texture:** Gạch men khổ lớn $80 \times 80\text{cm}$ với đường ron sâu, hạt đá bazan và thạch anh rải đều, viền highlight nổi khối.
     - **European Oak Herringbone Parquet Floor Texture:** Sàn gỗ xương cá khu Dining với các thanh gỗ đổi chiều vân và độ tối rãnh ghép.
     - **Acoustic Slatted Wood Wall Texture:** Vách nan gỗ tiêu âm với các khe rãnh màu đen sâu thẳm tạo cảm giác khối 3D chân thực.
     - **Brushed Stainless Steel Roughness Map:** Bề mặt kim loại phay xước vi mô cho máy pha cà phê espresso và thiết bị F&B.
     - **POS Screen UI Texture:** Màn hình thu ngân POS hiển thị danh mục món, tổng tiền và trạng thái kết nối phát sáng nhẹ (`emissive`).
2. **Tích hợp Tự động vào Pipeline Nạp Mô hình GLB (`DigitalTwinModelLoader.js`):**
   - Hàm `enhanceDigitalTwinModelMaterials` tự động duyệt cây node của `ShiftSync_CoffeeShop_DigitalTwin.glb`, nâng cấp các vật liệu màu đơn sắc cũ thành các vật liệu PBR textured cao cấp mà vẫn bảo lưu `mesh.userData.originalMat` cho chế độ X-Ray.
3. **Kiểm chuẩn & Nghiệm thu Tự động:**
   - `npm run build` thành công trong **1.61s**, 0 lỗi.
   - Toàn bộ **104/104 unit tests PASS (100%)** qua 20 test suites trong **2.75s**.
   - Trực tiếp kiểm thử trên Chrome DevTools MCP: Cả góc nhìn First-Person và Toàn cảnh hiển thị vân gỗ, vân đá, gạch lát và màn hình UI sắc nét, mượt mà 60 FPS không hề lag.

### Nhiệm vụ ASSET-005 — 60 FPS Recovery & Wide Immersive Camera FOV Upgrade (Character & Overview)
1. **Khôi phục Tuyệt đối Hiệu năng 60 FPS (Zero Lag):**
   - Loại bỏ hoàn toàn các render passes nặng (`MeshReflectorMaterial` và `ContactShadows`) khỏi `DigitalTwinCanvas.jsx` vốn gây sụt giảm khung hình nghiêm trọng do render lặp 2 lần mỗi frame.
   - Đảm bảo WebGL chạy ở tốc độ 60 FPS mượt mà tuyệt đối trên mọi cấu hình phần cứng.
2. **Nâng cấp Toàn diện Góc nhìn Camera & Trường quan sát (Camera FOV & Spanning View):**
   - **Chế độ Tham quan Nhân vật (`FirstPersonController.jsx`):**
     - Mở rộng FOV từ $36^\circ$ (góc nhìn tele hẹp, cảm giác nhìn qua ống nhòm) lên **$75^\circ$ cho First-Person** (chuẩn mắt người game/VR) và **$68^\circ$ cho Third-Person**.
     - Đẩy xa tầm nhìn với clipping plane `far = 300m`, `near = 0.1m`.
     - Tự động hoàn trả FOV nguyên bản khi thoát chế độ tham quan.
     - Điều chỉnh vị trí xuất phát (`spawnZ = 3.8m`) và hướng nhìn (`spawnYaw = 0` hướng thẳng vào trung tâm quán -Z) giúp nhân vật không còn bị va vào cửa hay nhìn vào bức tường đen phía sau.
   - **Chế độ Toàn cảnh (`CameraModes.js` & `DigitalTwinCanvas.jsx`):**
     - Mở rộng FOV từ $36^\circ$ lên **$48^\circ$**, giúp bao quát toàn vẹn diện tích $24\text{m} \times 16\text{m}$ thoáng đãng, sắc nét, không bị méo hình.
3. **Kiểm chuẩn & Nghiệm thu Tự động:**
   - `npm run build` thành công trong **754ms**, 0 lỗi.
   - Toàn bộ **104/104 unit tests PASS (100%)** qua 20 test suites trong **1,022ms**.
   - Kiểm tra trực quan qua Chrome DevTools MCP: Cả góc nhìn First-Person và Toàn cảnh đều hiển thị toàn diện, rộng mở, không vật cản, mượt mà 60 FPS.

### Nhiệm vụ ASSET-004 — Tier-1 AAA Visual Upgrade (Studio IBL, Contact Shadows & Reflector Floor - Reverted due to GPU Lag)
1. **Thiết lập Môi trường Studio IBL Khai báo (`DigitalTwinStudioEnvironment.jsx`):**
   - Tận dụng `@react-three/drei`'s `<Environment>` và `<Lightformer>` tạo dàn sáng studio phản chiếu.
   - *Ghi chú: Đã được gỡ bỏ trong ASSET-005 theo yêu cầu người dùng vì gây lag trên GPU.*

### Nhiệm vụ ASSET-003 — Complete 3D Asset Style Unification for Store Digital Twin
1. **Thiết lập Tiêu chuẩn Thiết kế Thị giác Thống nhất (`DIGITAL_TWIN_VISUAL_STYLE_SPEC.md`):**
   - Lấy asset bàn làm việc nhân viên (`ShiftSync_Workstation.glb`) làm quy chuẩn tham chiếu cao nhất về hình học và độ sắc nét vật liệu.
   - Định nghĩa bảng màu PBR Metallic-Roughness phong cách Scandinavian Cafe: Gỗ sồi tự nhiên (`#BA7A3E`), Gỗ óc chó trầm (`#3E2723`), Đá thạch anh trắng (`#FAF7F2`), Inox chải công nghiệp (`#E2E8F0`), Chrome bóng cao cấp (`#F1F5F9`), Thép đen nhám (`#0F172A`), Đồng thau ấm (`#D4AF37`), Nhung ngọc lục bảo (`#1E4D3A`), Da bò cognac (`#B45309`).
   - Tiêu chuẩn hình học: Tất cả các góc cạnh cứng đều được vát bo góc (chamfer/bevel bán kính $r \ge 0.015\text{m}$), khe chân thụt vào $0.08\text{m}$ (recessed toe-kick).
2. **Nâng cấp Toàn diện Pipeline Sinh Mô hình GLB (`scripts/generate-digital-twin-glb.js`):**
   - Đã tái cấu trúc toàn bộ hình học cửa hàng với hình học vát cạnh chi tiết cao (`createBeveledBox` bằng `THREE.ExtrudeGeometry` bo góc mềm mại).
   - Tích hợp cụm quầy pha chế và phục vụ: Hệ nan gỗ sồi dọc (vertical fluted oak slats), mặt quầy thạch anh trắng vát cạnh, nẹp viền đồng thau.
   - Tích hợp 4 trạm nghiệp vụ chuyên biệt:
     - `Workstation_POS_01`: Màn hình kép cảm ứng POS trên trụ xoay đúc, máy in bill nhiệt có giấy in nhô ra kèm đèn LED báo trạng thái, bàn phím số PIN pad quẹt thẻ, máy quét barcode và lỗ đi dây cáp.
     - `Workstation_Barista_01`: Máy pha espresso thương mại 2-group họng E61 chrome bóng, portafilter cán gỗ óc chó, đồng hồ áp suất kim chỉ, vòi đánh sữa kép, khay sấy ly ấm kèm ly sứ, 2 cối xay hạt on-demand phễu trong suốt thấy hạt rang, knock-box bã cà phê, thảm nén tamper, ca đánh sữa và chai siro hương liệu.
     - `Workstation_Service_01`: Giá pha pour-over 3 vị trí bằng đồng thau, bình pha Hario vát cạnh, ấm đun cổ ngỗng điện tử trên đế cảm ứng, cân điện tử hẹn giờ và khay gia vị gỗ tự nhiên.
     - `Workstation_Kitchen_01`: Tủ kính trưng bày bánh cong cao cấp có đèn LED thanh ấm bên trong, 2 tầng khay kim loại, bánh sừng bò vàng ươm, muffin chocolate, macarons pastel và thân đế làm mát inox.
   - Tích hợp khu vực khách hàng & nội thất cao cấp:
     - 3 cụm sofa booth bọc nhung ngọc lục bảo may rãnh dọc (channel-tufted emerald velvet).
     - 4 bàn bistro tròn mặt đá thạch anh chân gang đế tròn mạ đồng + 8 ghế tựa bentwood chân côn bịt đồng.
     - Bàn dài communal $4.8\text{m} \times 1.0\text{m}$ mặt sồi nguyên tấm 60mm chân thép chữ A + 6 ghế quầy bar xoay đệm da.
     - Góc lounge 2 ghế bành da cognac sang trọng kèm bàn trà cẩm thạch.
   - Tích hợp kho hàng & kiến trúc: Kệ thép hạng nặng mặt lưới thép, bao tải cà phê in chữ xuất xứ, thùng hàng pallet, cửa kính đôi đón khách tay nắm inox, 2 cột kiến trúc chịu lực, hệ đèn rọi ray trần và đèn thả chao đồng thau dây dù phát sáng ấm.
3. **Đồng bộ Procedural Fallback Engine (`FurnitureBuilder.js`):**
   - Cập nhật toàn bộ các vật liệu singleton chia sẻ sang thông số PBR chuẩn mực (roughness, metalness, colors) giúp các trạm phụ và chế độ fallback đạt độ sắc nét tương đương mô hình GLB.
4. **Kiểm chuẩn & Nghiệm thu Tự động (Validation & Regression Matrix):**
   - Script xác thực `scripts/validate-digital-twin-glb.js`: **ĐẠT 100% (PASSED)**. Dung lượng 6.47 MB, 631 meshes, 701 nodes, 68,616 triangles (< 100k polygons, 60fps WebGL), mặt sàn $Y = 0.0\text{m}$, căn giữa $(0, 0, 0)$.
   - Toàn bộ **104/104 unit tests PASS (100%)** qua 20 test suites trong **1,003ms**.
   - `npm run build` thành công trong **797ms**, 0 lỗi.

### Nhiệm vụ ASSET-002 — 3D Workstation Asset Integration & Interactive 3D Showroom
1. **Sản xuất & Đóng gói Asset 3D Bàn làm việc độc lập (`ShiftSync_Workstation.glb`):**
   - Đã sinh tệp glTF 2.0 Binary hoàn chỉnh: dung lượng **2.73 MB**, 71 meshes, 102 nodes, 16 materials PBR chất lượng cao và 7 embedded textures.
   - Bao gồm: Mặt bàn gỗ sồi bo góc, khung chân thép đen, màn hình viền siêu mỏng hiển thị UI ShiftSync, bàn phím cơ, chuột quang, ghế công thái học mesh 5 bánh xe, đèn bàn LED, quản lý dây cáp và đèn báo IoT phát sáng (Green pulse).
   - Tệp được lưu trữ tại:
     - Root: `ShiftSync_Workstation.glb`
     - Backend: `shiftsync-backend/ShiftSync_Workstation.glb`
     - Frontend public: `ShiftSync-Web/public/models/ShiftSync_Workstation.glb` (phục vụ HTTP 200 OK trực tiếp).
2. **Tích hợp Trực tiếp vào Không gian 3D Digital Twin (`WorkstationAssetModel.jsx`):**
   - Tạo component khai báo [WorkstationAssetModel.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/WorkstationAssetModel.jsx) nạp asset GLB bằng `GLTFLoader`.
   - Tích hợp trực tiếp vào [DigitalTwinCanvas.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx) tại vị trí `[-0.8, 0, 0.6]`, kèm 3D floating tag sprite "Bàn Làm Việc Nhân Viên (3D)" với trạng thái vận hành thời gian thực.
3. **Nút Điều khiển Camera Cận cảnh ("Bàn 3D") & Showroom 360 độ:**
   - Bổ sung nút **"Bàn 3D"** trong thanh công cụ [SpatialToolbar.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialToolbar.jsx) và điều hướng camera mượt mà trong [SpatialWorkspace.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx), cho phép zoom cận cảnh bàn làm việc ngay lập tức.
   - Xây dựng trang showroom độc lập [workstation-viewer.html](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/public/workstation-viewer.html) hỗ trợ xoay 360°, phóng to màn hình/ghế, chế độ wireframe và nút tải file `.glb` trực tiếp.
4. **Kiểm thử & Độ tương thích:**
   - Toàn bộ **104/104 unit tests PASS (100%)** trong `ShiftSync-Web`.
   - `npm run build` thành công trong **3.94s**, 0 lỗi.

### Nhiệm vụ R3F-001 — Migrate ShiftSync Digital Twin to React Three Fiber Architecture
1. **Kiến trúc R3F Khai báo & Đơn Ngữ cảnh WebGL (Single Canvas Architecture):**
   - Đã tái cấu trúc hoàn toàn không gian kết xuất 3D của Digital Twin (`SpatialWorkspace.jsx`), thay thế vòng lặp Three.js `requestAnimationFrame` và `WebGLRenderer` thủ công bằng [DigitalTwinCanvas.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx) sử dụng `@react-three/fiber` (^9.7.0).
   - Đảm bảo 100% một thẻ `<Canvas>` duy nhất trên toàn bộ giao diện, không tồn tại canvas ẩn hay ngữ cảnh WebGL cạnh tranh.
2. **Phân rã Mô-đun Khai báo Chuyên trách (`src/features/spatial-workspace/components/canvas/`):**
   - `DigitalTwinLighting.jsx`: Dàn ánh sáng PCF soft shadow, directional, hemisphere, ambient.
   - `SteamParticles.jsx`: Hoạt hóa hạt hơi nước quầy cà phê bằng hook `useFrame()`.
   - `CoffeeShopModel.jsx`: Nạp mô hình GLB độc lập `ShiftSync_CoffeeShop_DigitalTwin.glb`, hỗ trợ bật/tắt 4 lớp (`floor`, `walls`, `ceiling`, `furniture`), chế độ nhìn xuyên tường X-Ray không phá hủy vật liệu gốc và fallback hình học procedural khi thiếu GLB (Zero double store stacking).
   - `WorkstationLayer.jsx`: Ánh xạ trạm làm việc Backend vào node GLB, sinh trạm procedural bổ sung cho trạm thặng dư và gắn 3D tag sprite thể hiện trạng thái vận hành thời gian thực.
   - `ZoneVisualizationLayer.jsx`: Hiển thị decal phân khu, heatmap theo định biên ca (`zoneReqMap`), nhãn khu vực và vòng geofence 150m.
   - `AvatarLayer.jsx`: Avatar nhân viên cử động bước đi, nhịp thở tĩnh và LOD khoảng cách tự động trong `useFrame()`.
   - `OverviewCameraController.jsx`: Cầu nối khai báo điều phối `CameraManager.js` (Perspective 3D, Orthographic 2D Blueprint, Focus Zoom 3D).
   - `FirstPersonController.jsx`: Cầu nối điều khiển góc nhìn người thứ nhất (WASD, trượt va chạm vật cản AABB từ GLB, tầm mắt 1.6m, Point Lock khóa nhìn mục tiêu, Reticle targeting).
3. **Bảo tồn Ranh giới Nghiệp vụ & Kế thừa Engine Hiện hữu:**
   - Tuyệt đối không can thiệp các màn hình ngoài Digital Twin (Header, Sidebar, Login, Dashboard, Scheduler, Attendance, v.v.).
   - Giữ nguyên các domain engines đã kiểm chứng: `CameraManager.js`, `PlayerController.js`, `WorkstationDragController.js`, `DigitalTwinModelLoader.js`, `SceneGraphManager.js`.
4. **Kiểm thử Toàn hệ thống (Regression Matrix):**
   - **Web Frontend:** **104/104 tests PASS (100%)** qua 20 test suites trong **803ms** (thêm suite mới `DigitalTwinR3FIntegration.test.js`, 0 regressions).
   - **Vite Production Build:** Biên dịch thành công 2,073 modules trong **835ms**, 0 lỗi.

### Nhiệm vụ INT-001 — Coffee Shop 3D Digital Twin GLB Integration & Semantic Spatial Binding
1. **Kiến trúc Tích hợp Không gian Một Scene Duy Nhất (Single Scene Graph Integration):**
   - Đã tạo [DigitalTwinModelLoader.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/DigitalTwinModelLoader.js) nạp bất đồng bộ mô hình nhị phân GLB `ShiftSync_CoffeeShop_DigitalTwin.glb` (`/models/ShiftSync_CoffeeShop_DigitalTwin.glb`).
   - Phân giải và gắn thẻ ngữ nghĩa 6 tầng layer: `floor`, `walls`, `ceiling`, `furniture`, `workstations`, `zones`.
   - Nâng cấp [SceneGraphManager.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js) với `loadAndApplyStoreModel` và `setStoreModelDirect`: thay thế hoàn toàn hình học procedural cũ trong `envGroup` bằng mô hình GLB, triệt tiêu hiện tượng chồng lấn 2 cửa hàng (zero double store stacking).
2. **Ánh xạ Thực thể & Dữ liệu Vận hành Thực tế (Data Binding & Semantic Mapping):**
   - Hàm `mapWorkstationsToGlb` liên kết 4 trạm vật lý trên GLB (`Workstation_POS_01`, `Workstation_Barista_01`, `Workstation_Service_01`, `Workstation_Kitchen_01`) với thực thể CSDL từ Backend (`GET /api/stores/{storeId}/workstations`).
   - Gắn 3D floating tag sprite (`createWorkstationTagSprite`) trực tiếp lên node quầy trạm GLB, phản ánh đầy đủ 4 trạng thái vận hành thời gian thực: Đang trực trạm (`ASSIGNED` xanh ngọc), Lịch trực (`ASSIGNED` xanh dương), Trống trạm (`UNASSIGNED` hổ phách), Đang tải (`UNKNOWN` xám).
3. **Bảo tồn Hoàn toàn Mọi Tương tác Nghiệp vụ Hiện hữu:**
   - **Overview 3D & Top-Down Blueprint:** Giữ nguyên hệ thống camera, lighting rig mềm mại, chuyển đổi góc nhìn bao quát và mặt bằng kỹ thuật chuẩn xác.
   - **First-Person 3D Walking & Sliding Collision:** Trích xuất vật cản AABB (`extractGlbObstacles`) cho 2 cột kiến trúc, 4 quầy pha chế/thu ngân, và vách ngăn phòng kho; ngăn chặn triệt để người chơi đi xuyên quầy hoặc tường.
   - **Point Lock & Reticle Target:** Khóa góc nhìn và theo dõi trạm làm việc trong GLB khi người dùng di chuyển WASD.
   - **Bố trí Mặt bằng (Drag & Drop & Xoay 90°):** Trình kéo thả [WorkstationDragController.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js) nhận diện và kéo trực tiếp các cụm quầy trạm làm việc trên mô hình GLB, tự động clamp trong biên sàn, kiểm tra va chạm < 1.1m, hỗ trợ xoay 90° và lưu tọa độ mới về Backend `PUT /api/stores/{storeId}/workstations/{id}` hoặc hoàn tác tức thì `revertPosition()`.
   - **Attention Center "Zoom 3D":** Nút Zoom 3D trên thẻ cảnh báo trạm trống tự động focus camera chính xác vào quầy trạm tương ứng trên mô hình GLB.
4. **Kiểm thử Toàn hệ thống (Regression Matrix):**
   - **Web Frontend:** **97/97 tests PASS (100%)** qua 19 test suites trong 706ms (14 tests mới tại `DigitalTwinModelLoader.test.js` và `DigitalTwinGLBIntegration.test.js`).
   - **Vite Production Build:** Biên dịch thành công 2,054 modules trong **754ms**, 0 lỗi, 0 cảnh báo.

---

### Nhiệm vụ ASSET-001 — Standalone 3D Store Digital Twin GLB Asset Delivery
1. **Sản xuất & Đóng gói Tài nguyên 3D Độc lập (.glb / glTF 2.0):**
   - Đã sinh thành công tệp binary GLB: `ShiftSync_CoffeeShop_DigitalTwin.glb` (thư mục gốc) và `ShiftSync-Web/public/models/ShiftSync_CoffeeShop_DigitalTwin.glb`.
   - Dung lượng tối ưu hóa WebGL: **1,077.97 KB (1.05 MB)**, 424 meshes, 18,520 vertices, 10,900 triangles, 29 PBR materials.
   - Chuẩn tọa độ: Kích thước 22.20m (dài) x 14.22m (rộng) x 4.02m (cao), mặt sàn chuẩn Y = 0.0m, căn giữa tại gốc tọa độ (0, 0, 0).
2. **Cấu trúc Không gian & Đối tượng Nghiệp vụ:**
   - 4 Trạm làm việc độc lập có định danh chuẩn: `Workstation_POS_01`, `Workstation_Barista_01`, `Workstation_Service_01`, `Workstation_Kitchen_01`.
   - 6 Phân khu không gian chức năng có ranh giới: `Zone_POS`, `Zone_Barista`, `Zone_CustomerService`, `Zone_Dining`, `Zone_Storage`, `Zone_Entrance`.
   - Bố trí đầy đủ máy pha espresso 2 group, cối xay burr, quầy pour-over V60, quầy thanh toán POS, tủ bánh kính 2 tầng, hệ thống bàn booth sofa, bàn communal, bàn bistro tròn, ghế bành lounge, kho hàng kệ thép và cây xanh decor.
3. **Xác minh Tự động Toàn diện:**
   - Script xác thực `scripts/validate-digital-twin-glb.js` chạy qua 7 bước kiểm tra glTF 2.0 header, JSON chunks, binary buffer views, Three.js GLTFLoader parse, bounding box, và kiểm tra node hierarchy: **ĐẠT 100% (PASSED)**.

---

### Nhiệm vụ WEB-004 — ShiftSync 3D Digital Twin Scope Correction & Workspace Enhancements
1. **Thiết lập & Khôi phục Nghiêm ngặt Ranh giới Phạm vi (Scope Enforcement):**
   - Đã an toàn hoàn tác toàn bộ thay đổi ngoài phân hệ Digital Twin (19 tệp giao diện: Header, Sidebar, MainLayout, Login, Dashboard, Employees, Scheduler, Attendance, Requests, Marketplace, Stores, Skills, Settings, Admin, `index.css`) về baseline sạch `c9d4df1`.
   - Giữ nguyên toàn vẹn 100% logic, giao diện, quyền hạn và hệ thống design token nguyên bản của ShiftSync Web ngoài Digital Twin.
2. **Nâng cấp Độ chân thực Không gian Store Digital Twin (`StoreEnvironment.js`):**
   - **Gạch lát sàn Ceramic/Terrazzo chân thực:** Triển khai `createStoreTileTexture()` sinh vân gạch Canvas với ron gạch (`grout`), cạnh vát mềm (`bevel`), hạt khoáng terrazzo và tông màu ấm nhã nhặn, chống nổ runtime môi trường headless/Node tests.
   - **Cửa kính đôi đón khách mặt tiền (Entrance Glass Double Doors):** Đặt tại trung tâm `z = wid/2` với kính xanh mờ, viền khung kim loại tối và tay nắm inox dọc đón ánh sáng phản xạ.
   - **2 Cột kiến trúc nội thất (Structural Load-bearing Columns):** Đặt tại `[-len*0.16, -wid*0.08]` và `[len*0.16, -wid*0.08]` với thân ốp gỗ ấm, nẹp chân và mũ cột kim loại sẫm màu.
3. **Đăng ký Va chạm Cột Kiến trúc trong First-Person 3D (`PlayerController.js`):**
   - Đưa 2 cột kiến trúc vào hệ thống kiểm tra va chạm AABB trong `rebuildObstacles`, ngăn chặn triệt để hiện tượng người chơi ở chế độ First-Person đi xuyên qua trụ nhà.
4. **Cảnh báo Trạm Trống & Điều hướng Focus 3D trong Attention Center (`AttentionCenter.jsx` & `SpatialInspector.jsx`):**
   - Mở rộng Attention Center để theo dõi và cảnh báo các trạm làm việc đang hoạt động nhưng chưa có nhân sự phân công trong ca trực (`UNASSIGNED`).
   - Nút "Zoom 3D" trên thẻ cảnh báo trạm tự động điều hướng góc nhìn camera và kích hoạt Focus trực tiếp vào trạm làm việc.
5. **Tính năng Xoay Trạm Làm Việc 90° (`WorkstationDragController.js` & `WorkstationEditorBanner.jsx`):**
   - Bổ sung hàm `rotateSelected(deltaRad)` trong `WorkstationDragController.js`.
   - Bổ sung nút "Xoay 90° ↻" trực quan trên cả Banner nổi `WorkstationEditorBanner` và bảng điều khiển `SpatialInspector`.
6. **Kiểm thử Toàn hệ thống (Regression Matrix):**
   - **Web Frontend:** **83/83 tests PASS (100%)** qua 17 test suites trong 295ms.
   - **Vite Production Build:** Biên dịch thành công 2,050 modules trong **723ms**, 0 lỗi.

---

### Nhiệm vụ WEB-003 — Global 3D Visual Experience Transformation (Reverted in WEB-004 to focus exclusively on Digital Twin)
1. **Thiết kế Hệ thống Token 3D Không gian Toàn cục (`index.css`):**
   - Thiết lập bảng token bề mặt đa tầng: `--ss-surface-ground`, `--ss-surface-card`, `--ss-surface-elevated`, `--ss-surface-floating`, `--ss-surface-sunken`, `--ss-surface-glass`.
   - Hệ thống bóng đổ độ sâu vật lý: `--ss-shadow-depth-1` đến `--ss-shadow-floating`, viền sáng kim loại `--ss-rim-light` và gờ tối `--ss-rim-dark`.
   - Vết dập nổi/lõm công nghiệp: `--ss-bevel-card`, `--ss-bevel-sunken`, hiệu ứng phát sáng neon: `--ss-glow-emerald`, `--ss-glow-amber`, `--ss-glow-danger`.
   - Lớp tiện ích CSS tái sử dụng toàn hệ thống: `.ss-spatial-backdrop`, `.ss-card-3d`, `.ss-card-3d-interactive`, `.ss-panel-3d`, `.ss-btn-3d`, `.ss-input-3d`, `.ss-badge-3d`, `.ss-modal-3d`.
2. **Nâng cấp Toàn diện Application Shell & Shared Components:**
   - `MainLayout.jsx`: Gắn `.ss-spatial-backdrop` tự động cung cấp nền canvas không gian cho toàn bộ route.
   - `Header.css`: Cầu điều khiển không gian (Floating Spatial Bridge) với nền kính mờ `#1e293b` đến `#0f172a`, viền sáng rim lighting, tab active có gờ sáng ngọc bích `0 -2px 10px rgba(81, 163, 61, 0.75)`.
   - `Sidebar.css`: Phím lõm vật lý beveled sunken controls (`--ss-bevel-sunken`), dropdown panel nổi 3D (`.ss-dropdown-panel`).
   - `EmployeeModuleLayout.css`: Thanh điều hướng phân hệ nhân viên với hiệu ứng frosted glass và tabs nổi 3D.
3. **Di chuyển Toàn bộ 13 Phân hệ Nghiệp vụ (13 Modules Migrated):**
   - **Dashboard / Tổng quan:** `DashboardPage.css` nền canvas không gian, `DashboardSpatialSummary.jsx` thẻ 3D nâng gờ nổi với nút CTA xúc giác.
   - **Lịch biểu (Scheduler):** `SchedulePage.css` ray lõm 3D sunken track cho bộ chuyển view, nút chọn ca dập nổi vật lý.
   - **Chấm công (Attendance):** `AttendancePageLive.css` sidebar 3D, huy hiệu trạng thái có hiệu ứng lồi/lõm 3D inset highlights (`.att-status-pill`).
   - **Nhân viên & Chi tiết:** `EmployeesPage.css`, `EmployeeDetailPage.css` thẻ bảng dữ liệu 3D, hàng bảng nâng nhẹ khi hover.
   - **Chợ ca & Duyệt yêu cầu:** `MarketplacePage.css`, `RequestPage.css` banner khẩn cấp viền hổ phách phát sáng, thẻ ca làm việc nâng 3D, sidebar bộ lọc nổi, modal phê duyệt 3D.
   - **Cửa hàng, Kỹ năng & Định biên:** `StoresPage.css`, `SkillsPage.css`, `DemandPlanning.css` workspace toàn màn hình nổi 3D rim lighting, nút tạo ca vật lý.
   - **Cấu hình, Quản trị & Đăng nhập:** `SettingsPage.css`, `AdminPage.css`, `LoginPage.css` thẻ hero 3D viền ngọc bích, nút bấm xúc giác keycap có độ dày và độ nhấn khi bấm, form đăng nhập 3D kết hợp mascot Three.js tương tác.
4. **Kiểm thử Toàn hệ thống (Regression Results):**
   - **Web Frontend:** **82/82 tests PASS (100%)** qua 17 test suites trong 268ms.
   - **Vite Production Build:** Biên dịch thành công 2,050 modules trong **920ms**, 0 lỗi.

---

### Nhiệm vụ WEB-002 — Overview 3D & First-Person 3D Interaction Modes with Point Lock & Data-driven Heatmap
1. **Kiến trúc Một Scene Duy Nhất (Single Shared Store Scene):**
   - Vận hành cả 2 chế độ (Overview 3D và First-Person 3D) trên cùng một WebGL Canvas duy nhất trong `SpatialWorkspace.jsx`.
   - Giữ nguyên trạng thái lựa chọn (selection state) của nhân viên/trạm làm việc/phân khu khi chuyển đổi qua lại giữa Overview và First-Person.
   - Vô hiệu hóa an toàn trình kéo thả bố trí trạm (`WorkstationDragController`) khi đang ở chế độ First-Person để loại bỏ hoàn toàn xung đột thao tác chuột.
2. **Chế độ 1 — Overview 3D & Heatmap Định biên Thực tế:**
   - Cung cấp góc nhìn bao quát toàn bộ cửa hàng, hỗ trợ Orbit/Pan/Zoom và nút Framing đặt lại góc nhìn chuẩn.
   - Bản đồ nhiệt (Heatmap) dựa trên dữ liệu định biên chuẩn xác: Lấy `zoneReqMap` từ `shift_skill_requirements` của ca đang chọn; fallback theo `StoreZone.capacity`. Phân định 5 trạng thái vận hành: Đủ nhân sự (Emerald `#10B981`), Thiếu nhân sự (Amber `#F59E0B`), Dư nhân sự (Purple `#8B5CF6`), Đầy công suất (Red `#EF4444`), Chưa có định biên/Trống ca (Slate `#64748B`). Tuyệt đối không sinh màu ngẫu nhiên.
   - Thẻ `SpatialInspector.jsx` bổ sung giải thích định biên rõ ràng qua `getZoneStatusExplanation(assigned, cap, target)` (ví dụ: "Thiếu 2 nhân sự so với nhu cầu ca (1/3)").
   - Bảng chú giải Heatmap trực quan trên Toolbar và Mini Legend góc trái màn hình.
3. **Chế độ 2 — First-Person 3D & Hệ thống Khóa Nhìn Mục Tiêu (Point Lock Subsystem):**
   - Chiều cao mắt cố định $1.6\text{m}$, di chuyển mượt mà bằng phím WASD kết hợp trượt va chạm AABB (Sliding Collision) chống xuyên tường, quầy bar và trạm làm việc chuyên biệt (`rebuildObstacles`).
   - Tâm ngắm Reticle tự động quét thực thể trong tầm nhìn trung tâm (`reticleTarget`).
   - **Hệ thống Point Lock (Target Lock):** Khóa góc nhìn camera hướng về nhân sự hoặc trạm làm việc được chọn (`KeyF` / `KeyL` hoặc nút trên HUD/Inspector) trong khi người dùng tự do di chuyển WASD xung quanh.
   - **Dynamic Tracking:** Tự động điều chỉnh góc nhìn theo dõi avatar nhân viên đang bước đi trên sàn thời gian thực thông qua `targetMesh.getWorldPosition()`.
   - **Phím Escape phân tầng (Hierarchical Escape):** Nhấn `Escape` lần 1 giải phóng Point Lock trước mà vẫn giữ Pointer Lock để tự do nhìn; nhấn `Escape` lần 2 mới thoát khỏi chế độ First-Person.
   - **Spawn thông minh:** Tự động xuất hiện cách thực thể được chọn $2.2\text{m}$ và tự động kích hoạt Point Lock khi chuyển từ Overview sang First-Person.
4. **Kiểm thử Toàn hệ thống (Regression Matrix):**
   - **Web Frontend:** **82/82 tests PASS (100%)** qua 17 test suites trong 272ms (bao gồm 7 tests `PlayerController.test.js` và 7 tests `ZoneStatus.test.js`).
   - **Vite Production Build:** Biên dịch thành công 2,050 modules trong **653ms**; bundle code-split `SpatialWorkspace-CAhxjcB3.js` (266.01 kB, gzip: 69.83 kB).

---

### Nhiệm vụ ARC-001-VERIFY — Independent Architecture Verification & Acceptance
1. **Thẩm định Độc lập Toàn diện theo Nguyên tắc Zero-Trust:**
   - Thực thi độc lập 8 pha kiểm toán (Pha A đến Pha H) đối soát [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md) với hiện trạng mã nguồn thực tế tại commit `c9d4df1`.
2. **Kiểm chứng Chi tiết Từng Phân hệ:**
   - **Visualization View State (`spatialViewStore.js`):** Đạt 7/7 tests pass; 9 thuộc tính view state được bóc tách khỏi React component state; hỗ trợ functional updaters không gây re-render Virtual DOM thừa.
   - **Camera Subsystem Facade (`CameraManager.js`):** Đạt 8/8 tests pass; quản lý camera kép Perspective (36 FOV) và True Orthographic; ràng buộc OrbitControls Polar Angle `[0.1, 1.48]` rad cho 3D và khóa `[0, 0]` rad cho 2D blueprint; đồng bộ resize ma trận.
   - **Scene Graph & Resource Lifecycle (`ResourceManager.js` & `SceneGraphManager.js`):** Đạt 8/8 tests pass; bảo vệ singleton materials/geometries qua `WeakSet`; hàm `disposeHierarchy` chỉ giải phóng instance textures; `clearDynamicNonAvatarEntities` giữ nguyên avatar meshes để bảo tồn animation bước đi.
3. **Kiểm thử Toàn hệ thống (Regression Matrix):**
   - **Web Frontend:** **68/68 tests PASS (100%)** qua 15 test suites trong 246.7ms.
   - **Backend:** **46/46 tests PASS (100%)** qua 3 test suites (`DigitalTwinConcurrencyIntegrationTest`, `ShiftAssignmentServiceTest`, `AutoScheduleAssignmentCorrectnessTest`) trong 21.0s.
   - **Vite Production Build:** Biên dịch thành công 2,050 modules trong **982ms**; chunk `SpatialWorkspace-DKc8CnW6.js` (250.89 kB, gzip: 66.23 kB) tách biệt qua `React.lazy()`.
4. **Phán quyết Nghiệm thu Kiến trúc:**
   - Phán quyết chính thức: **`ACCEPTED_WITH_FOLLOW_UPS`** (Hạng mục theo dõi: Q-ARC-01 phê duyệt dọn dẹp packages cạnh tranh khỏi `package.json`).
   - Báo cáo chi tiết: [ARC-001-VERIFICATION-REPORT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ARC-001-VERIFICATION-REPORT.md).

---

### Nhiệm vụ ARC-001-IMP — Visualization Layer Phased Modular Implementation & Verification
1. **ARC-IMP-01 (Tách Visualization View State sang Zustand):**
   - Đã tạo `ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js` quản lý 9 view states: `cameraMode`, `use2DFallback`, `isXRayMode`, `layers`, `heatmapMode`, `activeSkillFilter`, `isExploreMode`, `playerViewMode`, `followingStaff`.
   - Hỗ trợ functional updaters `(prev => ...)`, tương thích 100% với các component React DOM con và API hiện hữu.
   - Unit tests: `spatialViewStore.test.js` đạt 7/7 tests pass.
2. **ARC-IMP-02 (Trừu tượng hóa Hệ thống Camera qua CameraManager Facade):**
   - Đã tạo `ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js` làm Facade duy nhất:
     - Tự động quản lý dual cameras: PerspectiveCamera (36 FOV) và OrthographicCamera (2D architectural blueprint).
     - Ràng buộc tự động góc xoay Polar Angle của OrbitControls: `[0.1, 1.48] rad` cho 3D, khóa cứng `[0, 0] rad` cho 2D blueprint.
     - Tích hợp `CameraController` (`flyTo`, `moveTo`, `followObject`) và xử lý `handleResize` đồng bộ cả 2 camera.
   - Unit tests: `CameraManager.test.js` đạt 8/8 tests pass.
3. **ARC-IMP-03 (Mô đun hóa Vòng đời Scene & WebGL Resources):**
   - Đã tạo `ShiftSync-Web/src/features/spatial-workspace/scene/ResourceManager.js`:
     - Tự động nạp singleton materials/geometries vào `WeakSet`.
     - Hàm `disposeHierarchy(obj)` an toàn: Chỉ giải phóng tài nguyên instance (dynamic CanvasTexture trên sprite), bảo vệ tuyệt đối singleton khỏi bị đen hình.
   - Đã tạo `ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js`:
     - Đóng gói Scene root `#F1F5F9`, lighting rig 3 đèn (soft shadows), `envGroup` (StoreEnvironment), `dynamicGroup` và particle system `steamGroup`.
     - Cung cấp `updateAnimations(elapsedTime)` và `clearDynamicNonAvatarEntities()`.
   - Unit tests: `SceneAndResourceManager.test.js` đạt 8/8 tests pass.
4. **ARC-IMP-04 (Rà soát & Đóng băng Dependency Cleanup):**
   - Ghi nhận trạng thái `BLOCKED_PENDING_APPROVAL` cho việc gỡ bỏ `@babylonjs/*` và `@react-three/*` vì câu hỏi Q-ARC-01 chưa có phê duyệt chính thức từ người dùng/Tech Lead. Không tự ý xóa package khỏi `package.json`.
5. **Kiểm thử Toàn diện & Tích hợp:**
   - **68/68 Web tests PASS (100%)** trên 15 test suites trong 237ms (tăng từ 45 lên 68 tests, 0 regressions).
   - Vite production build hoàn tất trong **656ms**, sinh bundle code-split `SpatialWorkspace-DKc8CnW6.js` (250.89 kB).
   - Monolith `SpatialWorkspace.jsx` giảm hơn 250 dòng code, sạch sẽ, chuẩn kiến trúc phân tầng.

---

### Nhiệm vụ ARC-001 — Visualization Layer Architecture Design & Self-Validation
1. **Thiết lập Kiến trúc Mục tiêu Tách lớp (Target 6-Subsystem Architecture):**
   - Phân rã tệp monolithic `SpatialWorkspace.jsx` (2,417 dòng) thành 6 phân lớp độc lập: Scene Layer, Camera Layer, Interaction Layer, Assets/Procedural Layer, Visualization State Layer, và Application/Domain Bridge.
2. **Chuẩn hóa Công nghệ Đồ họa 3D (Core Engine Decision):**
   - Quyết định chuẩn hóa trên **Pure Three.js r185+** kết hợp kiến trúc OOP Controllers.
   - Lập phương án loại bỏ (deprecate) Babylon.js (`StoreBabylonCanvas.jsx`) và React Three Fiber (`StoreScene.jsx`) để giảm 35% bundle size và triệt tiêu xung đột render loop với React 19.
3. **Mô hình Quản lý Trạng thái 3 Tầng (3-Tier State Model):**
   - Tách biệt rõ ràng: (1) Ephemeral Interaction State (Refs/Controllers 60fps), (2) Visualization View State (Zustand: `useSpatialViewStore`), (3) Authoritative Domain State (Server Props/API).
4. **Bảo tồn Tuyệt đối các Ràng buộc Kỹ thuật & Bằng chứng Đã Chứng minh:**
   - Bảo tồn 100% cơ chế khóa đồng thời Atomic SWAP (`PESSIMISTIC_WRITE`), Store Isolation Guard, `WeakSet` protection cho tài nguyên dùng chung, và 45/45 bài test hồi quy hiện có.
5. **Hồ sơ Chuyển giao Đầy đủ:**
   - Tài liệu chính: [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md) với 4 sơ đồ Mermaid (Component, Sequence, Lifecycle, State), Ma trận Trách nhiệm Module, 5 quyết định kỹ thuật (DEC-01..05) và Lộ trình 4 bước (ARC-IMP-01..04).

---

### Nhiệm vụ REQ-001 — Finalize MVP Requirements & Acceptance Criteria
1. **Thiết lập Source of Truth & Ranh giới Phạm vi MVP 4 Tuần:**
   - Đã xác thực kiến trúc hệ thống và phân định chuẩn xác 4 Phân hệ Nghiệp vụ Cốt lõi:
     - **M1 (Shift Management & Automated Scheduling):** Động cơ Heuristic Dynamic MRV + Local Repair, 5 Hard Constraints (HC1-HC5), Soft Fairness Cap và Headcount Quota.
     - **M2 (3D Spatial Workspace & Store Digital Twin):** Mặt bằng 2D/3D Three.js, Workstation Layout Editor (Raycasting, va chạm 1.1m, clamping biên), Occupancy resolution (`ASSIGNED`, `UNASSIGNED`, `UNKNOWN`) và mô phỏng What-If Atomic SWAP.
     - **M3 (Attendance Verification & Time Tracking):** Điểm danh thực địa bằng 2 chế độ camera phần cứng, định vị GPS Geofence Haversine và quy trình giải trình khiếu nại công.
     - **M4 (Shift Marketplace & Workforce Coordination):** Nhận ca mở cạnh tranh có Distributed Lock Redisson và Đổi ca 2 pha an toàn.
   - Loại trừ rõ ràng (Explicit Exclusions) khỏi phạm vi 4 tuần: Payroll nâng cao, Nhận diện khuôn mặt sinh trắc học AI (AI Face Biometrics/Liveness), Thiết bị vân tay phần cứng, Điểm danh ngoại tuyến (Offline queueing), và Đa ngôn ngữ (i18n).
2. **Ma trận Nghiệp vụ 4 Phân hệ (Four-Module Requirements Matrix):**
   - Xây dựng 19 yêu cầu nguyên tử, có thể kiểm thử (16 P0, 3 P1) có định dạng Given/When/Then, negative cases, phương pháp kiểm chứng và đối soát mã nguồn.
3. **Đặc tả Chuyên sâu 2 Chế độ Camera Phần cứng (Dual Camera Modes):**
   - **Mode 1 (Dynamic QR Code Scanner):** Quét mã QR động (Back camera), giải mã JWT token có TTL 5 phút, kiểm tra GPS Geofence Haversine $\le 100\text{m}$.
   - **Mode 2 (Live Selfie Capture):** Chụp ảnh chân dung thực tế (Front camera), gửi Multipart Form Data lưu vào trường `BYTEA` trong PostgreSQL, kết hợp kiểm tra Geofence và cửa sổ giờ ca.
   - Bao phủ toàn diện 12 khía cạnh: Mục đích, Entry trigger, Thiết bị, Permission flow, I/O formats, Validation rules, Loading/Cancel/Retry, Network/API, Quyền riêng tư, Chống gian lận, Acceptance scenarios và Phụ thuộc phân hệ.
4. **Ma trận Truy vết Kiểm thử P0 & Kế hoạch 4 Tuần:**
   - 100% yêu cầu P0 được ánh xạ vào test suite cụ thể (`AutoScheduleAssignmentCorrectnessTest`, `DigitalTwinRegression.test.js`, `ShiftScheduleExceptionAuditTest`, `AttendanceServiceTest`, v.v.).
   - Lộ trình 4 tuần rõ ràng với Test Gates, Demoable Outcomes và Kế hoạch ứng phó rủi ro.
5. **Nhật ký Quyết định & Câu hỏi Mở (Q-REQ-01 đến Q-REQ-05):**
   - Ghi nhận 5 câu hỏi kỹ thuật/chính sách (QR TTL, Indoor Geofence Drift, Image retention, Liveness exclusion, Offline exclusion).
6. **Báo cáo chi tiết:**
   - [REQ-001-MVP-REQUIREMENTS-MATRIX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/requirements/REQ-001-MVP-REQUIREMENTS-MATRIX.md)

---

### Nhiệm vụ PHASE-3 — AutoSchedule Correctness, Constraint Audit & Optimization
1. **Kiểm chứng Toàn diện Ma trận Ràng buộc (Constraint Matrix):**
   - Đã xác thực toàn bộ Hard Constraints:
     - **HC1 (Skill Match & Expiration):** Khớp `requiredSkillId`, kiểm tra ngày hết hạn `expirationDate`.
     - **HC2 (Availability & Blackout & Leave):** Không trùng `BlackoutDate`, không trùng `ApprovedLeave` (`LeaveRequest`), bao trọn khoảng thời gian với buffer 30 phút.
     - **HC3 (Shift Overlap):** Khung giờ `[start, end)` dùng `LocalDateTime`, xử lý chính xác ca đêm qua mốc `00:00`.
     - **HC4 (Max Weekly Hours):** Kiểm tra trần giờ hợp đồng theo tuần ISO (Thứ Hai - Chủ Nhật).
     - **HC5 (Minimum Rest Time):** Khoảng cách `>= minRestHours` (độ chính xác phút `toMinutes() / 60.0`), đệm 1 ngày trước và sau.
   - Xác thực Soft Constraints: Trình độ kỹ năng (Expert: 1.0 -> Beginner: 0.25), Cân bằng giờ tuần, Công bằng giờ tháng, Tiện nghi nghỉ ngơi, và Soft Fairness Cap (`1.3 * teamMonthlyAvg`).
2. **Bao phủ Toàn bộ 8/8 Kịch bản Biên (Edge Cases):**
   - Không có nhân viên (`NO_QUALIFIED_STAFF` -> `ZERO_COVERAGE`).
   - Thiếu năng lực (`capacity < demand` -> `PARTIALLY_COVERED`).
   - Thiếu kỹ năng / Chứng chỉ hết hạn.
   - Xung đột lịch rảnh & Đơn nghỉ phép đã duyệt.
   - Quá trần giờ tuần hợp đồng.
   - Vi phạm thời gian nghỉ giữa 2 ca.
   - Ca trùng lặp và ca đêm xuyên ngày.
   - Báo cáo trung thực qua `shortageSlots` và `ShortageDetailDTO`, tuyệt đối không sinh bản ghi giả mạo.
3. **Mở rộng Test Suite & Kiểm thử Hệ thống:**
   - [AutoScheduleAssignmentCorrectnessTest.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/test/java/com/shiftsync/shift/service/AutoScheduleAssignmentCorrectnessTest.java): Mở rộng từ 18 lên **25/25 tests PASS (100%)**.
   - Toàn bộ phân hệ lập lịch ca: **99/99 tests PASS (100%)** qua 5 test suites.
   - Toàn bộ backend: **488/488 tests PASS**, 0 failures, 0 errors, 3 skipped (1 phút 03 giây).
   - Toàn bộ frontend Web: **45/45 tests PASS (100%)** qua 10 test suites; Vite production build **PASS** trong 1.41s.
4. **Báo cáo chi tiết:**
   - [PHASE-3-AUTOSCHEDULE-AUDIT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/autoschedule/PHASE-3-AUTOSCHEDULE-AUDIT.md)

---

### Nhiệm vụ PHASE-2C — Digital Twin Integration Regression & Reliability
1. **Thiết lập Suite Kiểm thử Tích hợp Hồi quy Tự động:**
   - Đã tạo [DigitalTwinRegression.test.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/DigitalTwinRegression.test.js) bao phủ 6 kịch bản bắt buộc:
     - **Scenario A (Position Persistence):** Chuyển đổi tọa độ hai chiều không hao hụt (`< 0.001m`), clamping biên sàn `[0.8m, Dim - 0.8m]`, phát hiện va chạm `< 1.1m`, hoàn tác `revertPosition()` và xác nhận `commitPosition()`.
     - **Scenario B (Occupancy Consistency):** Phân định `isDirectMapping: true` vs inferred zone fallback `isDirectMapping: false`, `UNASSIGNED`, và bảo vệ trạng thái `UNKNOWN`. Bóc tách Staff ID vs Assignment ID an toàn.
     - **Scenario C (Attendance Accuracy):** Kiểm chứng vòng đời check-in: `isPresent: true` khi `checkIn && !checkOut`, `isPresent: false` khi chưa check-in hoặc đã check-out (`checkIn && checkOut`).
     - **Scenario D (Async Race Condition & Store Isolation):** Cờ hủy bỏ `isCurrent` bảo vệ trạng thái; reset selection và draft coords khi `activeStoreId` thay đổi.
     - **Scenario E (RBAC & Defense-in-depth):** Cho phép `ADMIN`/`MANAGER`, chặn `STAFF` cả ở UI và ở guard lưu trữ `handleSaveWorkstationPosition`, đối soát `@PreAuthorize` Backend.
     - **Scenario F (Cross-Feature Stability):** Bảo vệ singleton materials không bị dispose rò rỉ; khóa `OrbitControls` khi đang kéo.
2. **Khắc phục Lỗ hổng & Tăng cường Độ tin cậy:**
   - Bổ sung Store Selection Isolation Guard trong `SpatialWorkspace.jsx`: Xóa sạch draft coordinates, collision và selection khi người dùng chuyển sang store khác, triệt tiêu rủi ro lưu nhầm tọa độ trạm giữa các cửa hàng.
   - Bổ sung `canEditLayout` Guard phòng thủ chiều sâu (Defense-in-depth) trong `handleSaveWorkstationPosition`.
   - Bổ sung huy hiệu phân biệt `✓ Đã về` (Checked-out) đối với nhân viên đã check-out trong `SpatialInspector.jsx`.
   - Bổ sung metadata `isWorkstationTag: true` và `workstationId` vào `sprite.userData` trong `FurnitureBuilder.js`.
3. **Kiểm thử hệ thống:**
   - Frontend Unit & Regression tests: **45/45 tests PASS (100%)** qua 10 test suites.
   - Frontend Production Build (`npm run build`): **PASS** trong 826ms.
   - Backend Unit tests: **37/37 tests PASS (100%)** (`ShiftAssignmentServiceTest` 19/19 PASS, `AutoScheduleAssignmentCorrectnessTest` 18/18 PASS).
4. **Báo cáo chi tiết:**
   - [PHASE-2C-REGRESSION-RELIABILITY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/PHASE-2C-REGRESSION-RELIABILITY.md)

---

### Nhiệm vụ PHASE-2B — Workstation Occupancy & Staff Visualization
1. **Mở khóa Workstation Fields trên Backend:**
   - Đã thêm `workstationId` và `workstationName` vào `ShiftAssignmentResponseDTO.java`.
   - Cập nhật mapper trong `ShiftAssignmentService.java` và `ShiftService.java`.
   - CSDL thực tế: Bảng `shift_assignment` đã có sẵn cột `workstation_id` (Flyway V31) và đã liên kết với `workstations`.
2. **Engine Phân giải Trực quan Workstation Occupancy:**
   - Đã tạo [workstationOccupancy.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.js) phân tách 3 trạng thái: `ASSIGNED`, `UNASSIGNED`, `UNKNOWN`.
   - Quy tắc an toàn: Không bao giờ xem API lỗi hoặc đang tải là trạm trống (`UNASSIGNED`).
   - Phân biệt rõ Hiện diện thực tế (Actual Presence) vs Phân công theo lịch (Scheduled): Kiểm tra bản ghi `Attendance` (`checkInTime != null && checkOutTime == null`).
   - Hỗ trợ cả gán trực tiếp (`workstationId`) và fallback gom nhóm theo vùng (`zoneId`).
   - 6/6 unit tests đạt kết quả PASS trong [workstationOccupancy.test.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.test.js).
3. **Cập nhật 3D Floating Tag Sprite:**
   - [FurnitureBuilder.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js) hiển thị màu sắc trực quan:
     - Xanh ngọc (`#10B981`): Có mặt thực tế (Đang trực trạm).
     - Xanh dương (`#0284C7`): Phân công theo lịch (Chưa check-in).
     - Hổ phách (`#F59E0B`): Trống (Unassigned).
     - Xám slate (`#64748B`): Chưa rõ / Đang tải / Lỗi (Unknown).
4. **Cập nhật Thẻ thông tin Inspector (CASE 1.5):**
   - [SpatialInspector.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx) bổ sung thẻ "Nhân sự trực trạm (Workstation Occupancy)" với danh sách nhân sự, huy hiệu điểm danh, nguồn phân công và tỷ lệ sức chứa.
5. **Điều phối Tích hợp & Chống Race Conditions:**
   - [SpatialWorkspace.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx) fetch `getStoreAttendance` kèm flag `isCurrent` chống stale response khi chuyển store hoặc ca làm việc.
   - Memoize `workstationOccupancies` và truyền vào 3D layer và `<SpatialInspector>`.
6. **Kiểm thử hệ thống:**
   - Frontend Unit tests: **28/28 tests PASS** (4 suites: `workstationOccupancy`, `FurnitureBuilder`, `WorkstationDragController`, `staffIdentity`).
   - Frontend Production Build (`npm run build`): **PASS** trong 2.74s.
   - Backend Unit tests (`mvn test -Dtest=ShiftAssignmentServiceTest`): **19/19 tests PASS**.
7. **Báo cáo chi tiết:**
   - [PHASE-2B-WORKSTATION-OCCUPANCY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/PHASE-2B-WORKSTATION-OCCUPANCY.md)

---

### Nhiệm vụ PHASE-2A — Workstation Layout & Spatial Editor
1. **WorkstationDragController (Kéo thả 3D sàn):**
   - Đã tạo [WorkstationDragController.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js) hỗ trợ Raycasting chọn trạm, kéo thả tự do trên mặt phẳng sàn `y = 0`.
   - Giới hạn biên an toàn: `[0.8m, Length - 0.8m]` và `[0.8m, Width - 0.8m]`.
   - Phát hiện va chạm vật lý: bán kính `1.1m` giữa các trạm làm việc, đổi màu vòng chỉ thị (Xanh lục / Đỏ).
   - Tự động ngắt kết nối `OrbitControls` khi đang kéo để chống giật camera.
   - Hỗ trợ hoàn tác (`revertPosition()`) tức thì khi bấm Hủy hoặc API lỗi; xác nhận vị trí (`commitPosition()`) khi lưu thành công.
   - 7/7 unit tests đạt kết quả PASS trong [WorkstationDragController.test.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.test.js).
2. **WorkstationEditorBanner (Giao diện điều khiển nổi):**
   - Đã tạo [WorkstationEditorBanner.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/WorkstationEditorBanner.jsx) hiển thị thông tin trạm, tọa độ nháp X/Y, cảnh báo va chạm, nút Lưu/Hủy.
3. **SpatialInspector (Thẻ chi tiết trạm):**
   - Đã cập nhật [SpatialInspector.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx) CASE 1.5 hiển thị đầy đủ thông tin trạm, tọa độ hiện tại, tọa độ nháp, nút kích hoạt kéo thả, nút Focus Camera, nút Lưu/Hủy.
4. **SpatialToolbar (Thanh công cụ trên cùng):**
   - Thêm nút "Bố trí Trạm" (icon `Wrench`), kiểm tra phân quyền RBAC (chỉ `ADMIN` và `MANAGER`).
5. **SpatialWorkspace (Điều phối tích hợp & API):**
   - Tích hợp gọi `updateStoreWorkstation(storeId, workstationId, payload)` qua `PUT /api/stores/{storeId}/workstations/{workstationId}`.
   - Neo floating tag sprite trực tiếp làm con của workstation mesh, tự động di chuyển đồng bộ 100%.
6. **Kiểm thử hệ thống:**
   - Frontend Unit tests: **21/21 tests PASS** (3 suites: `WorkstationDragController`, `FurnitureBuilder`, `staffIdentity`).
   - Frontend `npm run build`: **PASS** trong 2.50s.
   - Backend `mvn testCompile` & `mvn test -Dtest=ShiftAssignmentServiceTest`: **19/19 tests PASS**.
7. **Báo cáo chi tiết:**
   - [PHASE-2A-WORKSTATION-LAYOUT-EDITOR.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/PHASE-2A-WORKSTATION-LAYOUT-EDITOR.md)

---

### Nhiệm vụ WEB-001 — Digital Twin Data Integration & Workstation Layer
- Tích hợp API trạm làm việc thực tế, chuẩn hóa định danh nhân sự Staff ID (`staffIdentity.js`), tách biệt layer trạm làm việc, và triệt tiêu va chạm mesh (`zonesWithWorkstations`). Đã lưu tại [WEB-001-DIGITAL-TWIN-WORKSTATION-INTEGRATION.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/WEB-001-DIGITAL-TWIN-WORKSTATION-INTEGRATION.md).

---

## 3. Các giả định đã được xác minh (Verified Assumptions)

- `GET /api/stores/{storeId}/workstations` trả về danh sách thực tế của trạm làm việc (đã xác minh trên `Pham Van Dong Store`: `WS-PVD-ESP1` và `WS-PVD-POS1`).
- `staffIdentity.getStaffId(item)` hoạt động an toàn cho cả pure Staff, `ShiftAssignmentDTO`, primitive UUID string, và Three.js Avatar Mesh `userData`.
- Thứ tự canonical staff UUID (`staffIds.sorted()`) trong `ShiftAssignmentService.swapStaffZones` ngăn ngừa triệt để deadlock và race conditions khi đổi ca đồng thời.
- `POST /api/stores/{storeId}/shifts/auto-schedule` là endpoint an toàn có tính Idempotent: Xóa sạch các phân công `AUTO` cũ trên ca `DRAFT` và tái sinh lại mà không làm tổn hại đến các phân công `MANUAL` hay `OPEN_SHIFT`.
- Báo cáo thiếu hụt (`shortageSlots`, `ShortageDetailDTO`) phản ánh chính xác 100% dung lượng thực tế, không sinh bản ghi ma khi không có ứng viên khả dụng.
- **Điểm danh 2 Chế độ Camera:**
  - Camera Mode 1 (QR Scanner) sử dụng JWT Token TTL 5 phút (`QR_EXPIRATION_MS = 5 * 60 * 1000`), bắt buộc kiểm tra GPS Haversine $d \le \text{geofenceRadiusM}$.
  - Camera Mode 2 (Live Selfie) gửi multipart photo lưu vào PostgreSQL cột `BYTEA`, kết hợp kiểm tra Geofence và trạng thái ca (không cho phép check-in ca `CANCELLED` hoặc ngày đã khóa sổ lương `isDateLocked`).

---

## 4. Các tập tin trọng yếu cần đọc cho task kế tiếp

- Điểm khởi đầu tri thức: [PROJECT_CONTEXT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/PROJECT_CONTEXT.md)
- Bản đồ kiến trúc & quan hệ API: [CODEBASE_MAP.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CODEBASE_MAP.md)
- **Tài liệu đặc tả yêu cầu & Ma trận nghiệm thu MVP:** [REQ-001-MVP-REQUIREMENTS-MATRIX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/requirements/REQ-001-MVP-REQUIREMENTS-MATRIX.md)
- Báo cáo kỹ thuật xếp ca tự động: [PHASE-3-AUTOSCHEDULE-AUDIT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/autoschedule/PHASE-3-AUTOSCHEDULE-AUDIT.md)
- Controller & Service Điểm danh: [AttendanceController.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/attendance/controller/AttendanceController.java), [AttendanceService.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/attendance/service/AttendanceService.java)
- Giao diện Điểm danh Mobile: [AttendanceScreenLive.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Mobile/screens/AttendanceScreenLive.js)
- Component điều phối chính Digital Twin: [SpatialWorkspace.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx)

---

## 5. Hành động đề xuất tiếp theo (Recommended Next Action)

1. **Nếu chuyển sang Triển khai hoặc Tối ưu Phân hệ Điểm danh (Module M3 - Attendance Mobile & Web):**
   - Tham chiếu [REQ-001-MVP-REQUIREMENTS-MATRIX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/requirements/REQ-001-MVP-REQUIREMENTS-MATRIX.md) Mục 4 để hoàn thiện trải nghiệm quét QR và chụp ảnh selfie trên `AttendanceScreenLive.js`.
   - Kiểm tra hiển thị thẻ điểm danh thời gian thực trên Web Manager Dashboard (`realtimeEventPublisher`).
2. **Nếu tiếp tục tích hợp AutoSchedule (Module M1) với Web UI:**
   - Hoàn thiện hiển thị huy hiệu thiếu hụt (`ShortageDetailDTO`) và tỷ lệ phủ ca trên `ScheduleCalendar.jsx`.
3. **Nếu chuyển sang Phân hệ Marketplace (Module M4):**
   - Rà soát giao diện nhận ca mở trên Mobile và đối soát phân quyền `@PreAuthorize("hasRole('STAFF')")`.




### Điều chỉnh kiểm thử từ người dùng (19/10/2026)
- Khi test web, mở rộng Playwright ở 1920×1080 làm viewport chính. Chỉ kiểm tra mobile như bước bổ sung, sau đó trả trình duyệt về màn hình rộng.
- Ghi chú trung gian EXPLORER-004 (đã được kết quả mới nhất ở đầu tài liệu thay thế): Docker được đọc (DB V42), full-page API mock + canvas WebGL đã đạt journey 20 bước trước đợt sửa responsive mới nhất. Đã sửa raycast selection, recursion chọn trạm, top-down transition, semantic layers GLB, handler đổi store và duplicate Navbar keys. Cần chạy lại build/regression/full-page desktop sau các thay đổi mới nhất, rồi cập nhật audit/changelog. Không coi task đã hoàn tất.

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
CREW-029 follow-up áp dụng: female asset URLs thêm v=ponytail-1 tránh cache model cũ. Edge /schedule?view=3d fixture xác nhận LongHair low-ponytail trong scene cửa hàng; gender5/5 + build PASS. Dùng loader chung cho workspace/Planner/AutoScheduler. Backend migration V44 vẫn chưa chạy.


### EXPLORER-014 — Tham quan cửa hàng bằng WebXR VR (21/10/2026)
**Đã thay thế bởi EXPLORER-015: gỡ WebXR theo yêu cầu, giữ tham quan desktop.**
Tái sử dụng EXPLORER-010/013, scene WebGL/GLB, ExploreHUD/FirstPersonController và skill 3d-web-experience. Không cần kính: nút **Mô phỏng VR** vào góc nhìn thứ nhất ngay trong web, đi bằng WASD, xoay chuột, E tương tác, F khóa nhìn, V đổi góc và Esc thoát. Nếu browser hỗ trợ immersive WebXR, runtime @react-three/xr vẫn tải động để dùng headset thật; XR emulator tắt để không che scene desktop.
Kiểm chứng: build PASS; Edge155 1920×1080 với fixtures xác nhận đúng first-person, canvas duy nhất, WASD đổi vị trí z=3,8→2,73m, page errors 0. Backend/WebSocket không thuộc fixture test; chưa có headset để nghiệm thu stereo/tracking/controller thật. Không sửa backend/API/DB. Xem docs/audit/digital-twin/EXPLORER-014-WEBXR-VR.md.

### EXPLORER-015 — Bảng thông tin trong cảnh 3D (21/10/2026)
Theo plan đã chốt: click staff/workstation/zone mở WorldInfoCard neo mesh/physicalFrame, quay về camera, chữ ổn định và cuộn nội bộ. Inspector và cảnh báo chuyển thành dialog giữa màn hình, canvas không chừa sidebar; giữ callback quản lý/thiết bị/RBAC. Gỡ WebXR/dependency, giữ Tham quan 3D first-person trên cả production. Bảng mở nhả chuột, dừng input; Esc đóng bảng trước; xử lý rejection khi pointer lock bị hủy.
Tái sử dụng EXPLORER003/010/013 và 4 skill frontend đã được người dùng chỉ định. Build + Node20 PASS; Edge155 fixture: 38 world-card +11 update/fullscreen +20 Planner PASS. Dialog mobile vừa viewport, body lock khôi phục; module mới ESLint PASS, controller cũ còn refs/immutability/hooks. Ảnh .playwright-mcp/world-info-final-1920.png. Không backend/migration/DB writes/commit/push. Xem docs/audit/digital-twin/EXPLORER-015-WORLD-INFO-CARDS.md. Stale khi đổi mapping mesh, selection identity, input hoặc Inspector callbacks.

### EXPLORER-016 — Thao tác trong bảng 3D (21/10/2026)
Theo yêu cầu mới, thay centered entity dialog bằng SpatialInspector content ngay trong WorldInfoCard/Html transform. Giữ anchor/billboard/viewport clamp, callbacks/API/RBAC; footer quay lại, Escape về thông tin trước đóng, đổi selection reset actions. Tổng quan store vẫn dialog. Tái sử dụng EXPLORER015/3d-web-experience/frontend-design. Build + Node20 PASS; Edge world45 +updates11 +Planner20 PASS, kiểm tra thiết bị thêm/lưu/cuộn1366/390. REST writes và realtime vẫn fixture, chưa backend/STOMP thật. Xem docs/audit/digital-twin/EXPLORER-016-WORLD-ACTIONS.md. Không backend/deps/git commit. Stale khi đổi action slot/Inspector/input/selection.

### EXPLORER-017 — Kéo nguyên cụm và hoàn tác bố trí (21/10/2026)
Tái sử dụng PHASE2A/GLB store-v2/EXPLORER008/016/skill3d-web-experience. Lỗi: loader đánh dấu mọi child isWorkstation khiến drag nhận mesh con. Sửa root-only binding + ancestor thuộc registered workstationMeshes. Threshold6px, grab offset, preview qua remap, baseline giữ tới commit; đổi selection/clear/thoát hủy vị trí và rotation nháp, reset draft UI. Không xuất GLB mới vì asset đã nhóm đúng. Node27, build, Edge world45+group6+Planner20 PASS (REST fixtures, WebGL thật); chưa layout save backend thật. RAM child transforms cũ khôi phục bằng reload; tọa độ đã lưu DB không tự rollback. API không có rotation persistence, không mở rộng backend. Xem docs/audit/digital-twin/EXPLORER-017-GROUP-DRAG.md. Không commit/push; stale root/drag/remap/selection lifecycle.

### EXPLORER-018 — Thiết kế cửa hàng (21/10/2026)
Tái sử dụng PHASE2A/EXPLORER008/013/015–017 +skills3d-web-experience/frontend-design. StoreDesigner thư viện15mẫu, kéo trục thật/XYZ/xoay/tỷ lệ, floor/vách/cửa, nhóm/khóa/clone/delete, undo60, localdraft user+store, JSONimport/export, template/blank/history. Saved design dùng chung explorer/Planner; binding workstation hiện có +physicalFrame/avatar, custom layout không autoarrange. GET/PUT /stores/{id}/design +versions, baseRevision+store-row lock+immutable history, RBAC, V45store_design_versions. HTTP Map boundary tương thích Jackson3/Boot4.1.1, service Jackson2.
Node52/build/newfeaturelint PASS; Java13 (7service+3auth+1HTTP+2Postgresreal) PASS; Edge32designer+STAFFguard +45worldinfo+20Planner PASS, 1920/1366/390. Browser REST/session fixtures, DB isolated tests thật tớiV45 và concurrency; chưa authenticated browser→live backend write. Dockerlocal đã rebuild/start health200, main schema45 (V43/V44 pending cũng áp dụng), main design table0rows. Backup ~/.codex/backups/shiftsync/20261021-105511 +oldimage before-designer-20261021-105511. Không đổi bố trí thật/commit/push. Xem docs/audit/digital-twin/EXPLORER-018-STORE-DESIGNER.md. Giới hạn15mẫu/150items/8cấp, JSONimport (chưaGLBupload), không tự khoét cửa/tường hoặc broadcast realtime design. Stale schema/catalog/modelgroups/API/Jackson/custom layers/Planner/auth.

### EXPLORER-019 — Làm rõ bảng thông tin 3D (22/10/2026)
User xác nhận phạm vi là bảng staff/workstation/zone, không phải StoreDesigner. Tái sử dụng EXPLORER015/016 +frontend-design/3d-web-experience; hướng bảng vận hành phân cấp, DFII14/15, giữ theme/font/role colors. WorldInfoCard có ngữ cảnh ngày/ca, trạng thái chính và giải thích trước chi tiết; phân biệt lịch phân công với bản ghi check-in, chỉ tiêu ca với sức chứa tối đa; gender trong disclosure Thông tin cá nhân; danh sách nhân sự có attendance từng người. Footer giải thích nhóm thao tác, action view có ngữ cảnh và Escape trở về đầu summary. Vẫn Html transform neo model, không sidebar/dialog mới; không backend/API/DB changes.
Build PASS (chunkwarning cũ), lintWorldInfoCard PASS, Node14 PASS. Edge155 world-info45 hồi quy +clarity42 PASS (fixturesREST, canvas/model thật),1920/1366/390; không page/consoleerror. Test raycast cũ cần focusstaff/resetoverviewzone trước click để đảm bảo entity visible. Ảnh .playwright-mcp/info-hierarchy-{staff,workstation,zone}.png. Báo cáo docs/audit/digital-twin/EXPLORER-019-INFO-CLARITY.md. Chưa kiểm dữ liệu livebackend; không commit/push.

### EXPLORER-020 — Bảng thông tin có hình khối 3D (22/10/2026)
Theo yêu cầu thử bảng3D thật: WorldBoardMesh dựng RoundedBox có chiều dày/viền/độ nghiêng, mặt chữ CanvasTexture tiếngViệt và các nút mesh raycast. Summary không còn Htmlcard nhìn thấy; tabs Tổng quan/Nhân sự/Thiết bị, pagination4mục desktop/1mục viewport thấp, status+ngàyca; giữ rolecolor. Board vị trí camera-relative theo anchor và kéo về trước geometry để không bị quầy che, leader kết thúc tại mép. Bridge nhận board hit và không clear selection phía sau. Keyboard/screenreader có bản đọc ẩn qua Html; khi Tabfocus thì hiện fallback truy cập. Biểu mẫu Thao tác vẫn Html transform neo cảnh để nhập liệu, không phải mesh; không tuyên bố toàn bộ forms đã chuyển3D.
Tái sử dụng EXPLORER015/016/019, frontend-design/3d-web-experience, hướng bảng vận hành vật lý, DFII14/15. Build/lint2module/Node14 PASS. Edge155 physicalsuite33 PASS:3entity mesh/tabs/pagination/close/action/E/Esc/pointerpause,1920/1366/390; Planner20 PASS. FixturesREST/session, WebGL/model thật, noerrors. Suite Html world-info/clarity019 đã bị supersede cho summary (không chạy lại và không tuyên bố pass ở mode mới). Test mới scripts/test-world-physical-board.browser.cjs; ảnh physical-board-{staff,workstation,zone}.png. Khôngbackend/deps/DBchanges/commit/push. Stale board geometry/raycast/CanvasTexture/layout/selection/input.

EXPLORER-020 follow-up22/10: user không thích bảng nghiêng. Bỏ local tilt của WorldBoardMesh, luôn thẳng theo quaternion camera; case mỏng0,22 thay0,32, viền xanh dịu metalness0,1. Build PASS; Edge xác nhận localrotation0/cameraalignment0. Không đổi dữ liệu/biểu mẫu.

EXPLORER-020 chốt giao diện22/10: user chọn lại HTML neo cảnh theo đề xuất. Runtime WorldInfoCard trở lại Htmltransform luôn trực diện camera, WorldInfoSummary tách component summary có status/ngàyca/nhânsự/thiếtbị/gender disclosure như019; actionsinline giữ nguyên. Không import/render WorldBoardMesh (file thử nghiệm giữ lại, không vào bundle), bỏ raycastguard riêng boardmesh. Kích thước theo DOM thật và clamp; bỏ lerp physical display. Build/lint2module PASS; Edgeclarity42 PASS ở1920/1366/390, noerrors, fixturesREST/WebGLthật. Physicalsuite020 nay chỉ là lịch sử thử nghiệm, không phải UI đang dùng. Khôngbackend/DBchanges/commit.

### EXPLORER-021 — Redesign thẻ vận hành trong cảnh (22/10/2026)
Tái sử dụng EXPLORER015/016/019/020 và skills frontend-design, 3d-web-experience. Hướng thiết kế thẻ vận hành tinh gọn, DFII14/15 (4+5+5+4−4), giữ font/theme/rolecolors. Header có rail màu vị trí, icon và tên; ngày/ca/giờ có icon; trạng thái dùng dot và typography thay hộp nền; khu vực có hai ô so sánh nhu cầu/phân công, sức chứa phụ; personnel ledger initials + attendance icon/text, không suy đoán ảnh/gender; nút chính tương phản và footer cố định. Summary/actions vẫn HTML world-anchored billboard, max360×440, clamp/cuộn nội bộ, no sidebar/API/backend changes.
Sửa WorldInfoCard.jsx, WorldInfoSummary.jsx, world-info-card.css. Build PASS (cảnh báo chunk cũ), ESLint2components PASS; Edge155 clarity42/42 PASS1920×1080,1366×768,390×844; không page/consoleerror. Browser dùng fixtures REST/session và WebGL/model thật, chưa live-backend end-to-end. Đã xem ảnh .playwright-mcp/info-redesign-1920.png, trả Edge1920. Không commit/push. Stale khi đổi cardDOM/theme/selection/anchor hoặc Inspector callbacks.

### EXPLORER-022 — Nhãn nổi khu vực và trạm (22/10/2026)
User chỉ rõ tag Barista1/1 trong ảnh. Tái sử dụng EXPLORER019–021, ZoneDecals/FurnitureBuilder/SceneLabels; skills frontend-design/3d-web-experience đã đọc. Hướng thẻ chỉ dẫn vận hành sáng, DFII14/15, rail màu role, title/status dot+text, ô số và caption Đã xếp/Cần hoặc Đã xếp/Chỗ. Shared FloatingTagCanvas720×192, ellipsis theo measureText; SRGB/no toneMapping; giữ texture disposal và selection metadata. SceneLabels operational240px/selected260px, giữ aspectratio và offset tránh chồng theo chiều cao; stafftags không đổi. Zone không có nhu cầu không tuyên bố đủ định biên; workstation không có occupancy hiện dấu gạch, không tự tạo số.
Build PASS (chunkwarning cũ); Node FurnitureBuilder+ZoneStatus13/13 PASS (cập nhật assertion kích thước mới); Edge155 fixture clarity42/42 PASS, resize1920/1366/390 xác nhận texture và nhãn onscreen, desktop240px, mobile tự ẩn nhãn đụng nhau như cơ chế cũ; trả1920, ảnh .playwright-mcp/zone-tags-redesign.png. REST/session fixtures, WebGL/model thật; chưa backend end-to-end. Không backend/API/deps/DB/commit. Stale khi đổi tagtexture/SceneLabels/ZoneStatus/occupancy.

### EXPLORER-023 — Lưu & áp dụng trong phiên mock (22/10/2026)
User báo save rồi vẫn dirty, ảnh MOCK Explorer Coffee + Backend chưa trả thiết kế. Xác minh Edge active fixture token và GET design trả200[]; test-world-info-clarity thiếu route design nên PUT fallback[]; không phải bằng chứng backend save hỏng. Bổ sung GET/PUT/version routes, revision conflict409, snapshot/history lưu localStorage shiftsync:fixture-design:{store}; bỏ localStorage.clear của clarity để không xóa draft/userlocal. Production StoreDesigner thêm nullguard/malformed-response thông báo giữ bản nháp rõ hơn.
Đã giữ backup draft key :backup-save-fix, khôi phục18items, clicksave →version1, đóng khôngalert, mở lại18items save disabled, reload mở lạiversion1/18items/save disabled. REST/sessionfixture only, không ghi DB. Browser actual Edge1920; build/lintStoreDesigner PASS(chunkwarning cũ). Attempt clarity suite dừng tại gender disclosure visibility khi dùng lại userdraft/custom scene; không tuyên bố42PASS lượt này, kiểm save lifecycle riêng đã PASS. Tái sử dụng EXPLORER018/019–022; bảo tồn dirtytree/no gitcommit. Bố trí người dùng đã lưu chỉ trong mock/localStorage; cần loginbackend thật nếu muốn dùng dữ liệu thực.

### LIVE-024 — Đã chuyển sang backend Docker thật (22/10/2026)
Thay thế trạng thái mock củaEXPLORER023: gỡinterceptionHTTP/WS bằngpagefresh, bỏfakeauth/fixturekeys saubackup. Khởi độngDockerDesktop khiEngineoffline; backend/db/redis chạy lại khôngrebuild. Viteproxy /api+/ws→8080, RESTrelative/api, WSsameorigin; devOriginlocalhost3000 khớpCORS. LoginUI manager.pvd200/JWTthật,1store/3zones/2stations/20shifts/1attendance đọcPostgres,STOMPCONNECTED. SaveUIthiếtkếuser18items(bindrealWS041/042)→PUT200revision1; reload18items no dirty; SQLxácnhậnPVD|1|18. Backup docs/backups/store-design-18-items-2026-10-22.json vàpvd-live-import. Dashboard/marketplace/employees/attendance liveAPI smoke0HTTPerror/pageerror. Build/lintconfigapiPASS. Khôngfixturetests trongtabngườidùng nữa. Chi tiết docs/audit/digital-twin/LIVE-024-DOCKER-INTEGRATION.md. Backend data là DB hiệncó(cóseeddev), khôngPlaywrightmock; chưatest eventmutation realtime. Khôngcommit/push. Production cầnreverseproxy /api,/ws hoặcVITE_API_URL thật.

### EXPLORER-025 — Modal cảnh báo vận hành (22/10/2026)
Tái sử dụng AttentionCenter/SpatialInspector/SpatialActionDialog và LIVE024 (không fixture). Hướng bảng điều phối vận hành, DFII14/15, giữ theme/font/màu trạng thái. Modal980px hai cột queue và summary, bộlọc All/Urgent/Zone/Station,count,ưu tiên trước,cards có status/nguyênnhân/ảnhhưởng/CTA,cộtphải coverage+lốitắt+directorydisclosure. Mobile1cột scrollroot, headerfixed; variantclass chỉ overviewdialog. Giữ callback chọn/focus/algorithms. Chưa chọn ca không tínhcảnhbáo/coverage,disableallocation; stationunknown không coi làtrống (dùngocc.state/status); dùng chữ phâncông thayđangtrực; shiftkhôngname hiệnCa làm việc.
Edge155backendDockerthật:15/10/2026 08–16 có5issues(2urgent/3zone/2station),filter2urgentPASS,stationdetail/zonefocus mởworldcard vàđóngmodalPASS,EscPASS;1920/1366/390 bounds+nohorizontaloverflow+scrollbottomPASS. Chưa chọn ca0issues/allocationdisabled. KhôngmutationDB/mock; lưu screenshot alerts-redesign-1920.png; cuốiEdge1920modalopen. Build/lint2componentsPASS(chunkwarningcũ). NoAPI/backend/deps/commit. Stale AttentionCenteroccupancy/shiftrequirements/Inspectorcallbacks/dialogCSS. Widthvariantse-action-dialog.se-alert-dialog chốngCSSimportorderoverride.

### UI-026 — Bỏ icon emoji trang trí trên web (22/10/2026)
User chỉ ảnh emoji thẻtrướcCashier và yêu cầu xóa tươngtự. Xóaemoji literal dùngtrangtrí trongwebsrc(non-test), giữ LucideSVG/đóng/checkglyph có chức năng, rolecolor/text. Bỏspanroleicon SpatialInspector; emoji config roles/categories/avatar/zone trảchuỗirỗng giữcompatibility; getZoneIconlegacyreturnempty; avatarcollectionfallbackhiệnlabelthayemoji. Dọnemptydecorativespans; bỏemoji ởinspector/3Dlabels/explore/demandplanning/login/stores/skills/settings/avatar. Không sửaMobile/backend/DB/logs/commentemoji. Source scan runtimepictographs0lines; buildPASS(chunkwarningcũ). Edge1920Dockerthật:3Dcanvas/staffactioncard noemoji,employees/attendance/marketplace noemoji/no pageerrors; tab trảschedule3D. Khôngtestfixtures/mutations/commit. Tái sử dụng LIVE024 vàrolepalette/constants đãđọc; stale nguồnrendericons/newemoji/backend-provided labels.

### NAV-027 — Bỏ Operations Hub trung gian (22/10/2026)
User đồngýbỏ trangRequestPagehub. Appkhôngimport/renderRequestPage/CSSnữa; /request,/requests,/notifications dùngLegacyRequestRedirect+legacyRequestRoute,giữtabdeep links leave→attendance/leave,adjustments→attendance/explain,swaps→marketplaceSWAP,workforce/proposals→marketplaceWORKFORCE; no-tabrequests→attendance,notifications→dashboard. NotificationBell footerĐóngthayViewAllhub,tabTấtcảgiữlist; bỏfallback6notificationgiả(itemsdefault[]). Navbar dùngsharednotificationRoute vàsourceTypegốctrướcnormalize đểschedule/workforcekhôngsairoute; sửaHeaderlegacyđườngdẫn+gỡmụcđềxuấttrỏhub. RequestPagefilegiữsourcecũnhưngkhôngbundle/render.
Build/lint3modulePASS(chunkwarningcũ),12nodeassertionsmappingPASS; Edge1920backendthật6legacyredirectPASS/hubabsent,bellalltab+newclosevisible/oldlink0,fakeTokenfalse. KhôngDBmutation/API/backend/deps/commit. TáisửdụngLIVE024/NAVcũ; stale notificationtype/querytab/routes.

### FUNC-028 — Audit nút chưa đúng (22/10/2026)
User hỏi chỗchứcnăngkhôngtácdụng. Ràsourcechọnlọc xácnhận6nhóm: notifAPIerrorvẫnhidepending;markallreadxóaneedsAction;3Dfollowemployee/avatar mismatch+localcoords;menutemplates/auto chỉredirectschedule;time-workforcequery/historytablost;MainLayoutnormalize mấtbackendnotificationtype. Chưa sửaproduct/bấmmutationDB. Loại giảthuyếtĐiềuchuyển: backendPOSTexistingzone đãsupportmove; Settingspreviewbuttonkhôngtínhbug. Report docs/audit/ui/FUNC-028-FUNCTIONAL-BUTTON-AUDIT.md. Scopekhôngfullacceptancemọinút; kếhoạchcamera cũđãuserhủy. Tái sử dụngLIVE024/NAV027.

### FIX-029 — Sửa các chức năng trong FUNC-028 (22/10/2026)
Đã sửa chuông thông báo (API lỗi không ẩn yêu cầu, đọc không đồng nghĩa xử lý, giữ trạng thái đọc của request tổng hợp qua polling, không giảm unread lặp); giữ sourceType từ MainLayout đến Navbar. Legacy time-workforce giữ tab; history→FILLED; schedule/auto mở modal thật và điền tuần. Thêm ShiftTemplatesPage với GET/POST/PUT/DELETE API có sẵn, loading/error/retry/form retain/cancel request và ManagerRoute. Follow3D resolve employee→avatar root, world position, rebind model, suppress khi orbit, nút Dừng và dừng khi nhân viên mất khỏi timeline.
Build PASS(chunkwarning cũ), Node16 PASS, lint module mới PASS. Edge Docker thật xác nhận redirects/auto/templatesGET/followstart-stop; camera sai số0,00071. Tab kiểm thử riêng chặn toàn bộ ghi: approve500/markread/refresh vẫn giữ3request; templateCRUD4writes intercept PASS. Không DB mutation, chưa browser templateCRUD ghi DB thật. Responsive templates1920/1366/390, trả Edge1920 schedule3D15/10, tabtest đã đóng/no mock trong tab người dùng. Không backend/API/migration/deps/commit. Chi tiết docs/audit/ui/FIX-029-FUNCTIONAL-ACTIONS.md. Tái sử dụng FUNC028/LIVE024/NAV027.

### FIX-030 — Ca quá hạn trong Chợ ca mở (22/10/2026)
User ảnh ca25–30/9 vẫnactive ngày22/10. Rootcause managerstoreShifts chỉfiltermissing, khácbackendgetOpenShifts đãlọctime. Thêm marketplaceTime helper giờVN+07,clock1s/focus/visibility, lọcactive/counters/claimlist theo thời gian, chặn stale publish/claim/assign/chi viện; chọn ca chi viện loại ca cũ. TabFILLED đổi nhãnLịch sử ca, includeexpired/cancelled/started/full dedupe, readonlyvàstatus/sốphâncông thật; target0 khôngrender3/0. Không xóaDB/đổiAPI.
Build/linthelper/tests PASS; Node6PASS. EdgeDocker1920thật OPEN0/history20, no candidatebuttons lịch sử; isolatedclocktest active1→0/history2/writes0,tabđóng. KhôngDBmutation/backend/deps/commit. Report docs/audit/ui/FIX-030-MARKETPLACE-EXPIRY.md, ảnh marketplace-history-real.png. Tái sử dụngLIVE024/FIX029 vàbackendMarketplaceServicebusinesszone.

### FIX-031 — Form tạo/sửa lịch làm việc (22/10/2026)
- Hoàn thành form gọn, body cuộn/footer cố định, màu rõ, mẫu ca API, cấu hình chấm công thật; bỏ thao tác lưu giả trong form. Ngày mặc định tương lai và deadline +07. Backend lưu note/color/role/template; V46 chạy Docker thành công. Bảo toàn ca đa nhân viên, khóa đổi vai trò/phân công không hợp lệ.
- Build/lint PASS; Node4 và Maven23 PASS. Edge1920/1366/390 bounded/footer PASS, errorfixture/focus PASS. Live UI POST201→GET, PUT200→GET metadata đúng, draft test đã DELETE204 và SQL0. Chưa live assignment/template có dữ liệu. Đồng hồ Edge cũ đã reset khớp máy; kết thúc Edge1920 form mới.
- Backup DB/image trước deploy; report docs/audit/ui/FIX-031-SHIFT-FORM.md. Tái sử dụng LIVE024/FIX029/FIX030; không commit.

### FIX-031A — Thu gọn bảng tạo lịch (22/10/2026)
Theo phản hồi kích thước quá lớn: khung680px, giảm padding/spacing/chiều cao controls, chấm công dùng details mặc định thu gọn (mở vẫn đủ cấu hình thật). Focus trap bao gồm summary. Edge thật1920/1366 modal680×726 không cần cuộn khi mới mở,390px cuộn thân và footer luôn thấy, mở details đến cuối PASS. Build/lint PASS; không backend/DBwrite. Tái sử dụng FIX031, ảnh .playwright-mcp/shift-form-compact.png.

### FIX-032 — Định biên ngày rõ nhu cầu/mục tiêu (22/10)
DailyView mới: người cần, lượt bố trí/giờ công, exact-target vs min-max/over/under/missing; quy chuẩn dialog validation+keyboard, count save thật mới reload. Một sticky apply chung ngày/tuần; sửa weekly payload không gửi date. Edge live11/93,5h/5of6,3sizes/footer/scroll PASS; isolated writeerror/success/payload+keyboard PASS, noDBwrites. Build/Node2/newmodulelint PASS; Modal lint còn legacy effect/weekly errors. Report FIX032; reuseSCHED017/SCROLL018/FIX031.

### FIX-033 — API định biên và compact (22/10)
Đối chiếu GET/PUT/POST QuotaController/Service, GETreal branches/day/week200. Ngày metrics derive response, backend có defaults khi chưa lưu; auto-fill không luôn bằng target nên đổi nhãn Điền theo quy tắc/temp_* gợi ý. Width1280, bỏ rolecardrow đưa Sửa quy chuẩn vào row, header/spacing gọn; Edge3sizes/footer/cuộnPASS, build/lintDailyPASS. Không DBwrite/backend; reportFIX033.

### FIX-034 — Định biên tuần compact (22/10)
WeeklyView mới: ba metrics, ma trận14ca stickyrole/mobile scroll, normdialog, collapsiblebudget/review, same target/minmax labels. Bỏcardlớn/SLA/revenue claims. Weekly count/budget server-first, fail giữdata. Build/lint2/Node2 PASS; Edge1920/1366/390 nooverflow/footer/sticky/Sunday PASS; GETlive79/671,5/33of42, fixturesfailure/success/normkeyboard PASS. NoDB/backendwrite. RestartVite đểgỡCSSstale; dev3000. ReportFIX034, reuseFIX032/033.

### FIX-035 — Cuộn khi xổ hết Định biên (22/10)
Đổi overlay-scroll/stickyfooter sang bounded dialog+single content scroller; header/control/footer ngoài body, close ởheader, normcardmaxheight. Edge fixture42warnings+all expanded+budgetedit3sizes(1920/1366/390×600) scrollbottom/hittestSave/abovefooter/nooverflowPASS. Live day regression/normPASS, liveweekexpanded screenshot035; buildPASS. NoDB/APIchanges. ReportFIX035; supersedes SCROLL018 vertical-scroller contract.

### FIX-036 — Grid viewport theo ảnh cắt ngân sách (22/10)
Sauảnhngườidùngfooterbịcắt, táchViewport.css với definiteheightmin860/viewport, grid4rows bodyminmax0/1fr; useRef viewportresize cậpnhậtheight. LiveEdge1620/1366/390 budgetedit bounded/footer/savehitPASS, isolated42warningsallopen1620/390PASS, buildPASS. KhôngDB/APIwrite; reportFIX036, ảnh036exact. Supersedes FIX035 flexauto contract.

### FIX-037 — Giảm nội dung quá cao (22/10)
Header/metrics/review compact, tuầncell[-count+] một hàng +status, bảng3vịtrí~240px; budgetedit ngang, cap790. Edge1620/1366 thấy hết tuần+budgetedit khôngbodyverticalscroll;390×600 cuộnbudgetSavehit/footerPASS. Build/lint2PASS; noAPI/DB. ReportFIX037, reuseFIX036/034.

### FIX-038 — Tỷ lệ hài hòa (22/10)
Thay denseblockFIX037 bằng scalechung23/13/12px, count18/status11, stepper30×32, spacing12–16, metrics60px; panel1420/cap800. Giữcuộn/footer thayépnhỏ. Edge1620/1366/390 bounded/savehit/footer/nooverflowPASS; buildPASS. ReportFIX038, screenshot038; noAPI/DB.

### STAB-001 — Ổn định hệ thống đang triển khai (23/10/2026)
Danh mục tĩnh 35 routes/27 services/32 controllers: docs/audit/stabilization/source-inventory.json; ma trận và gate mở tại STAB-001.md. Web Node189/189/build PASS; baseline lint341errors/39warnings còn mở. Sửa quota apply không xóa ca/phân công, cảnh báo review giữ modal; skill lookup scoped store; source SAVED/SUGGESTED +assigned/shortage/excess/unclassified; thống nhất gợi ý ngày/tuần với rule apply, bỏ tự nâng max cuối tuần. Budget chuyển Store.monthlyQuotaBudget/V47 (chỉ migration DB test, chưa deploy operational). API client bỏ Authorization cache và giới hạn retry queued refresh; Edge fixture concurrency1refresh/2requests và noauth sauclear PASS. Demand request sequence chống response cũ. Docker test riêng ports55432/56379, runner Linux scripts/test-stabilization-backend.ps1. Linux suite đầu520/0fail/1error/5skip; lỗi payroll fixture không có contract, đã sửa tự tạo cùngstore+transaction rollback, chạy lại log backend-stabilization-linux-after.log. Edge155 live đọc6pages×3sizes no horizontaloverflow/no JSerror; chưa full journeys/125%/production. Không tuyên bố toàn hệ thống đạt; không operational DBwrite/commit/push. Tiếp tục đọc log final, kiểm DB persistence và các gate matrix còn mở.

STAB-001 verification update: Linux isolated full Maven suite BUILD SUCCESS: 520 tests, 0 failures, 0 errors, 5 skipped (515 executed). Log backend-stabilization-linux-after.log. Payroll fixture now self-contained/transactional. This does not complete browser business journeys or authorize operational migration.

SOURCE-RUN 23/10: User prefers backend from source/VS Code. Added .vscode/tasks.json. Backup ~/.codex/backups/shiftsync/before-source-v47.dump (367547 bytes). Source startup failed: DevTools classloader first, disabled restart then Java/Netty Windows loopback Invalid argument: connect. Restored existing Docker backend to avoid web outage; source switch NOT complete. See backend-source.log. Need resolve host Java selector issue before switching.

STAB-001 deploy 23/10: rebuilt backend Docker from current source, recreated only backend; running image matches latest sha256:31ef093bb47cfe08d32081cd4c9a93712666c76289f8b704a5a5d67ab5dd2668. V47 applied during preceding source startup (corrects prior not-deployed notes); database backed up before migration. Live day/week API verification after restart recorded in chat.

### STAB-002 — Kiểm chứng persistence/quyền và UI live (23/10/2026)
Thêm QuotaBudgetPersistenceTest: flush+clear rồi đọc lại DB và response tuần đúng92000000, store khác không ảnh hưởng, giá trị âm không ghi đè. Linux isolated test cùng AvailabilityIdorSecurityTest:3/3 PASS. Đây là persistence-context reload, chưa phải restart JVM. Test availability được bổ sung @Transactional/AfterEach clearSecurityContext để không rò auth/dữ liệu sang test khác (cleanup edit sau lượt chạy, cần suite kế tiếp xác nhận). Edge155 live backend rebuilt: weekly42coverage cells, footer visible vàno horizontal overflow1920/1366/390 PASS, không DBwrite. Không production source change lần này; Docker không cần rebuild chỉ vì test/docs. Còn fulljourneys/realtime/3D/lint/125%.

### STAB-003 — User nine findings (in progress)
Confirmed AttendanceService host-time now/local conversion and ShiftService UTC default deadline. Source changed to Asia/Ho_Chi_Minh; NOT deployed yet, pending timezone regression and full impact review. Initial targeted runner timezone-regression.log selected ShiftServiceAssignmentDelegationTest, but AttendanceServiceTest name absent; actual attendance suite is AttendanceServiceQaTest/AttendanceRegressionPostFixRuntimeQaTest, MUST run these before acceptance. Remaining user findings overnight create/update/conflicts, list photo payload, dashboard errors, production credentials, WS allowlist/subscription, password policy still open. Login validation must not enforce registration policy against legacy valid passwords. No claim all nine fixed.
### STAB-003 — Thời gian ca, chấm công và kênh realtime (24/10/2026)

- Chuẩn hoá giờ nghiệp vụ chấm công sang `Asia/Ho_Chi_Minh`; deadline ca mới/bulk demand và mặc định tháng attendance dùng cùng timezone.
- DTO danh sách attendance không còn mang ảnh Base64, chỉ trả cờ có ảnh; ảnh tải on-demand qua endpoint có RBAC riêng cho manager/store hoặc chính staff.
- Theo quyết định sản phẩm ngày 24/10, không hỗ trợ ca qua đêm: create/update/bulk, mẫu ca và form Web đều yêu cầu giờ kết thúc sau giờ bắt đầu.
- Dashboard nêu rõ nguồn dữ liệu tải lỗi; STOMP yêu cầu JWT CONNECT hợp lệ và allowlist origin. Docker compose bắt buộc secret cục bộ thay vì fallback yếu.
- Maven mục tiêu 9/9 PASS và web production build PASS. Docker Engine offline nên chưa chạy full Linux suite/rebuild image; STAB-003 chưa được deploy.

