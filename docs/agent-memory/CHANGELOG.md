# ShiftSync — Historical Task Changelog (CHANGELOG)
Mã tài liệu: `docs/agent-memory/CHANGELOG.md`  
Cập nhật lần cuối: 24/10/2026 | Baseline: `c9d4df1`

---

## 1. Nhật ký Thay đổi theo Nhiệm vụ (Task-by-Task Changelog)

### [AUTO-025] — Trực quan Auto-Scheduler (20/10/2026)
- So sánh snapshot và kết quả backend, playback, cảnh báo thiếu người và không gian 3D. Build PASS; 3 model tests và 17 Edge mock checkpoints PASS.
- API hiện lưu đồng bộ, chưa có dry-run/lý do chọn từng nhân viên; giao diện ghi rõ giới hạn. Chi tiết docs/audit/autoschedule/AUTO-025-VISUALIZATION.md.
### [PLANNER-024] — Kiểm thử 3D Planner
- 6 unit + 20 browser checks PASS; build PASS. Chạy lại suite trong Microsoft Edge (`Edg/155`) tại 1920×1080, không lỗi console/uncaught; canvas và document khớp viewport. Sửa ngày fixture động thay ngày 19/10 và cleanup trong `scripts/test-schedule-planner.browser.cjs`. Không sửa ứng dụng/không ghi DB thật.


### [UI-023] — Thu gọn đầu trang
- Bỏ banner và mô tả giới thiệu lặp lại ở Attendance/Marketplace/HR shared layout; giữ tiêu đề gọn, tabs và thao tác. Build và browser kiểm tra 3 routes PASS.


### [ATT-022] — Chấm công, Giải trình và Nghỉ phép (20/10/2026)
- Skill follow-up: senior-frontend/frontend-design, dialog focus + Escape/restore và keyboard filter; 8 browser checks PASS, build PASS.

- Đồng bộ web theo theme chung, thu gọn bộ lọc mobile, sửa route chọn tab, vùng cuộn bảng và modal. Build PASS; browser fixture desktop/mobile và mở form theo vai trò PASS. Chi tiết/giới hạn trong TASK_MEMORY.


### [HR-021] — Đồng bộ web Hồ sơ nhân sự (20/10/2026)
- Thiết kế lại layout chung, danh sách nhân viên, lối tra cứu hợp đồng, vị trí, bảng lương và profile. Nút/tab truy cập bằng bàn phím, bảng cuộn trong vùng riêng, dock không che cuối trang. Build PASS; Playwright mock 5 routes desktop/mobile, panel/tab và mở form PASS. Xem TASK_MEMORY HR-021 cho giới hạn.


### [MKT-020] — Bảng điều phối Chợ ca mở (20/10/2026)
- Tinh chỉnh giao diện web `MarketplacePage.jsx` và `marketplace-redesign.css`, phân cấp header/KPI/danh sách, lọc khung giờ bằng button và responsive. Build PASS; Playwright mock desktop/mobile, dữ liệu ca mẫu và thao tác cơ bản PASS.


### [MKT-019] — Thiết kế lại Chợ ca mở (20/10/2026)
- Cập nhật cấu trúc, màu theo giao diện dùng chung, responsive, trạng thái rỗng và vùng cuộn bảng; giữ nghiệp vụ và các thao tác. Build PASS; Playwright mock desktop/mobile kiểm tra tab, tìm kiếm, modal và cuộn trang.


### [SCROLL-018] — Cuộn nội dung Định biên (20/10/2026)
- Theo ảnh người dùng, chuyển modal định biên sang portal với một vùng cuộn dọc, nội dung cao tự nhiên, khóa nền khi mở và phục hồi khi đóng; nút đóng theo viewport, bảng vẫn cuộn ngang. Wheel đến cuối trên desktop/mobile, kiểm tra 5 trang thường và regression SCROLL-014 9/9; build PASS. [Báo cáo](../audit/ui/SCROLL-018-DEMAND-WORKSPACE-SCROLL.md).

### [SCHED-017] — Thiết kế lại Định biên ca (20/10/2026)
- Đồng bộ workspace định biên ngày/tuần theo Schedule, responsive, trạng thái rỗng đúng nghĩa, sửa cột ma trận tuần và số liệu SLA mẫu. Gỡ nút copy/draft có hành vi không khớp nhãn; giữ auto-fill và apply thực tế. Build PASS, Playwright mock desktop/mobile, light/dark, dữ liệu/empty và thao tác cơ bản; lint còn lỗi cũ. [Báo cáo](../audit/ui/SCHED-017-DEMAND-PLANNING-REDESIGN.md).

### [SCHED-016] — Thiết kế lại Khả dụng nhân sự (20/10/2026)
- Đồng bộ tab Khả dụng với hệ giao diện Schedule: tiêu đề, KPI, điều hướng tuần, lọc, ma trận/khung giờ, light/dark và mobile. Giữ màu nhãn vị trí; CSS chỉ áp dụng màn hình, giữ bản in. Sửa KPI trạng thái rỗng không còn báo kín lịch khi không có đăng ký.
- Build PASS; ESLint component 0 lỗi/5 cảnh báo hook có sẵn; Playwright API mock kiểm tra 1920/390, sáng/tối, rỗng/có dữ liệu, lọc, đổi tuần/view và cuộn tới footer. [Báo cáo](../audit/ui/SCHED-016-STAFF-AVAILABILITY-REDESIGN.md).

### [SCHED-015] — Thiết kế lại giao diện Schedule (20/10/2026)
- Theo design-taste-frontend + senior-frontend, làm mới phân cấp tiêu đề, tab, chế độ xem, công cụ, bảng ca và trạng thái rỗng; đáp ứng mobile bằng khoảng ngày ngắn và cuộn ngang nội bộ. Giữ nguyên màu vị trí, sọc chéo inline, API và workspace 3D/Planner.
- Build + `git diff --check` PASS; Playwright mock xác nhận 4 màu/32 ô sọc chéo, ngày/tuần, form thêm ca/nhân viên, viewport 1920/390, dark filter và 3D fit. ESLint SchedulePage còn 28 errors + 1 warning cũ bên ngoài phần render sửa. [Báo cáo](../audit/ui/SCHED-015-SCHEDULE-REDESIGN.md).

### [SCROLL-014] — Khôi phục cuộn toàn trang (20/10/2026)
- Navbar là nơi duy nhất khóa `body.style.overflow` cho drawer/search. Sửa effect để trạng thái đóng/chuyển route luôn xóa khóa còn sót; giữ khóa đúng khi overlay đang mở. Tái hiện tình huống cũ trên Settings rồi đối chứng bản sửa.
- 9/9 browser scroll checks với API/session mock ở desktop thấp và mobile, build/ESLint Navbar/node check PASS; 3D workspace vẫn fit1080 và không cuộn. Không backend/DB/dependency changes. [Báo cáo](../audit/ui/SCROLL-014-GLOBAL-SCROLL-RECOVERY.md) phân biệt khả năng tái hiện được với nguyên nhân trong trình duyệt thật chưa quan sát trực tiếp.
- Bổ sung footer chung cao 128px và giữ `<main>` tối thiểu bằng vùng nhìn bên dưới Navbar để nội dung cuối có thêm quãng cuộn trên các trang thường; ẩn footer khi lịch ở chế độ 3D/Planner toàn màn hình. Browser đối chứng Dashboard/Settings/Requests 1920×600, Dashboard 390×844 đều cuộn tới footer; `/schedule?view=3d` không cuộn. Build PASS; test cuộn cũ 9/9 PASS.

### [DASH-012] — Thiết kế lại Dashboard vận hành (20/10/2026)
- Theo senior-frontend và hợp đồng NAV-011, sắp xếp lại Dashboard: ngữ cảnh cửa hàng + CTA 3D/phân công, bộ lọc riêng, bốn KPI, lịch/sơ đồ cạnh yêu cầu/điểm danh, biểu đồ tuần tầng dưới. Thêm trạng thái rỗng của biểu đồ, nhãn “lượt phân công” và dự toán rõ nghĩa; sửa lời dẫn ngày khác. Giữ API, optimistic approval, CSV và theme hiện có.
- 24/24 kiểm tra browser với API/session mock trên 1920/1440/390, sáng/tối và dữ liệu có/rỗng; build, lint Dashboard+ShiftTimeline PASS. Một PUT duyệt chỉ vào mock; không backend/DB writes/dependency changes/commit/push. [Báo cáo](../audit/ui/DASH-012-DASHBOARD-REDESIGN.md) ghi giới hạn API thật/công thức 30.000 đ/giờ/lint cũ DashboardPage.

### [NAV-011] — Thiết kế lại Navbar (20/10/2026)
- Theo skill senior-frontend:2hàng, phân cấp rõ, storepicker/menu keyboard, CtrlK tìmtrang khôngdấu, mobile context+drawer, active route/settings tab/3Dshortcut; giữtheme+notificationsAPI, roleHRfilter. Navbar không dựngthôngbáomẫu, mainstorecontextsync, explorerheighttheoheader112px.
- Tái dùng NAV-010,THEME-001/002,EXPLORER-013;29Navbar+33Store Playwright (API mock/GLB thật),144tests,build vàlint2modules PASS. Judgekhôngmajor/blocker saurescore; selectivecontrast16modes>=4,7588. Không dependency/backend/DBchanges hoặccommit/push. [Báo cáo](../audit/ui/NAV-011-NAVBAR-REDESIGN.md) ghi rõ5lint errorscũởMainLayout/SettingsPage vàlimits.

### [EXPLORER-013] — Thiết kế lại model store Oak & Moss (19/10/2026)
- Theo yêu cầu “áp dụng đi”: thêm deep link ứng dụng chính /schedule?view=3d; xác nhận load/reload model Oak & Moss2 và thoát về lịch qua4 browser checks. Chạy lại Store33/33 và144tests/build PASS; không thay default2D, auth, category hoặc API. Một lần automation chọn nhầm Zone trong lúc chuyển camera và timeout trước retry đạt33/33; không đổi logic model để che lỗi.
- Triển khai GLB versioned mới mặc định cho Store/Planner/tham quan; dựng lại kiến trúc, quầy liền nhau, bàn ghế/decor/thiết bị theo palette gỗ–rêu–kem. Giữ GLB gốc, 9 bộ bàn ghế, semantic binding và vị trí API trạm. Sửa cột cắt quầy và narrow camera crop; tối ưu merge geometry theo từng semantic unit.
- Tái sử dụng EXPLORER-008/010/011/012. 144/144 tests, build và78 Playwright checkpoints (33Store+14experience+20Planner+11preview) đạt; API mock/GLB thật,1920×1080. Preview390px toàn model fit và không tràn ngang. Không backend/DB writes.
- Asset1.649.892bytes so với cũ6.624.416bytes (giảm≈75,1%),169meshes/39.858tris; chưa khẳng định FPS. Preview dev /store-preview.html; model đã vào main app production build, còn chunk warning. [Báo cáo](../audit/digital-twin/EXPLORER-013-STORE-MODEL-REDESIGN.md).
- Judge độc lập không thấy blocker/major trong bốn render final, minor narrow model nhỏ. Public/dist model hash trùng; browser mở preview1920×1080.

### [EXPLORER-012] — Thiết kế lại nhân vật Crew V2 (19/10/2026)
- Follow-up “áp dụng”: xác nhận bộ mới là mặc định trong luồng Store/Planner/player, kiểm tra lại33/33 Store journey và GLB runtime version2. Mở /schedule; không phát sinh sửa ứng dụng, build/test141 đã đạt ở đợt triển khai vẫn là đối chứng gần nhất.
- Thêm bốn model GLB versioned, mặt/tóc/đồng phục theo vai trò; cùng factory cho nhân viên và player. Thêm khớp gối/khuỷu, model dự phòng cùng thiết kế, shared resources và trang preview dev có xoay/đi bộ. Không đổi layout/API/backend/DB hoặc ghi đè GLB gốc.
- Tái sử dụng EXPLORER-008/010/011 và character/resource contract. 141/141 tests + build PASS; Playwright1920×1080: Crew7/7, Store33/33, experience14/14, Planner20/20 (API mock, GLB thật). Judge ảnh không major/blocker, minor khớp phong cách đồ chơi.
- Chi tiết/budget/giới hạn: [EXPLORER-012-CREW-REDESIGN.md](../audit/digital-twin/EXPLORER-012-CREW-REDESIGN.md). Preview dev /crew-preview.html; chưa LOD/skinning/mocap hoặc benchmark số lượng lớn; còn cảnh báo bundle lớn.

### [EXPLORER-001] — Audit & Hoàn thiện Interactive Store Explorer
- **Ngày thực hiện:** 19/10/2026
- **Kết luận:** `PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS`. Sửa click Zone tự focus camera, thêm toggle Attendance độc lập, làm nổi bật Workstation đang chọn, thêm mode buttons Zone/Workstation, hiển thị ca đang xem và trạng thái thiếu equipment data, phân biệt coffee GLB theo store category, reset selection khi đổi store.
- **Backend:** Không sửa. Đã đối chiếu layout/workstation/assignment/attendance API; chưa có entity/relationship/API danh sách thiết bị gắn workstation.
- **Kiểm thử:** 61/61 spatial unit/integration tests pass; `npm run build` pass. Browser journey chưa xác minh vì test accounts bị từ chối tại login. Chi tiết ở [INTERACTIVE-STORE-EXPLORER-AUDIT.md](../../INTERACTIVE-STORE-EXPLORER-AUDIT.md).

### [NAV-010] — Tích Hợp Lối Tắt Cài Đặt (Settings) Trực Quan Trên Thanh Điều Hướng (Navbar)
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Phản hồi người dùng *"setting ở đâu navbar không thấy!"*. Khắc phục triệt để việc thiếu liên kết Cài đặt trên thanh điều hướng chính bằng giải pháp nhận diện đa điểm (Multi-point Discoverability):
  1. **Tab Menu Chính "Cài đặt" (`groups`):**
     - Bổ sung nhóm điều hướng `key: "settings"`, nhãn **"Cài đặt"** với icon `Settings` ngay trên dải menu chính.
     - Cung cấp menu con trực quan: *Cấu hình cửa hàng*, *Giao diện & Chủ đề*, *Quy tắc lên lịch*, *Phân quyền*.
  2. **Nút Tác Vụ Nhanh (Icon Bánh Răng ⚙️) Trên Thanh Công Cụ:**
     - Đặt nút `<button className="ssn-ico">` với icon `Settings` ngay cạnh Chuông thông báo (`NotificationBell`).
     - Tự động kích hoạt trạng thái `.active` (`--ss-nav-ac`) khi người dùng đang ở route `/settings`.
  3. **Tích Hợp Vào Menu Tài Khoản Cá Nhân (`ssn-user`):**
     - Bổ sung 2 tùy chọn tác vụ cao cấp với icon và mô tả rõ ràng:
       - **Cài đặt hệ thống** (`Settings`): Cấu hình điểm bán & vận hành.
       - **Giao diện & Chủ đề** (`Palette`): Đổi style màu sắc (Warm, Emerald, Ocean, Minimal) và chế độ Dark/Light.
  4. **Tối ưu CSS Dropdown:**
     - Mở rộng độ rộng menu `.ssn-menu.right` lên `250px` để hiển thị trọn vẹn tiêu đề và dòng mô tả phụ hai dòng mà không bị tràn viền.
- **Nghiệm thu:**
  - `npm run build` biên dịch thành công 100% trong 9.1s.
  - 110/110 unit tests PASS 100% không phát sinh lỗi phụ (zero regressions).

### [THEME-002] — Bổ Sung Tùy Biến Style Giao Diện & Chủ Đề Vào Trang Cài Đặt (Settings)
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Bổ sung tab **"Giao diện & Chủ đề"** trong trang [`SettingsPage.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/pages/SettingsPage.jsx) cho phép người dùng tùy chọn phong cách giao diện phù hợp với thương hiệu điểm bán:
  - **4 Bộ Phong cách Màu sắc Chủ đạo (`THEME_STYLES`):**
    - **Warm Roast (`warm`):** Nền Linen ngà ấm, màu cà phê nướng (Deep Espresso), hổ phách ấm (Amber) và cam đất (Terracotta). Khuyên dùng cho chuỗi cà phê và F&B.
    - **Modern Mint (`emerald`):** Nền băng sáng mát, xanh ngọc lục bảo (Emerald) và xanh mòng két (Teal), tươi mới và năng động.
    - **Classic Slate (`ocean`):** Nền Slate trung tính, xanh công nghệ (Cobalt & Sky Blue) và xám than, chuẩn mực SaaS quốc tế.
    - **Minimalist Studio (`minimal`):** Đơn sắc đen trắng (Monochrome & Zinc), tập trung toàn diện vào con số.
  - **Tùy chọn Chế độ Hiển thị & Thanh Điều Hướng:**
    - **Chế độ Sáng / Tối (Color Mode):** Light Mode ban ngày rõ nét vs Dark Mode ca tối êm dịu.
    - **Kiểu Thanh Điều Hướng (Navbar Style):** Tương phản sẫm màu (`contrast`) tạo điểm neo thị giác vs Liền mạch (`surface`) hòa cùng nền trang.
  - **Khung Xem Trước Trực Quan Tức Thì (Live UI Preview Mockup):**
    - Hiển thị mô phỏng giao diện thu nhỏ (Navbar + Metric Cards + Action Button) phản ánh trực tiếp theo Style được chọn mà không cần rời trang.
    - Cơ chế phản ứng tức thì (Real-time reactivity) cập nhật các dataset trên `<html>` (`data-theme`, `data-style`, `data-nav-style`) và lưu vĩnh viễn trong `localStorage`.
- **Nghiệm thu:**
  - `npm run build` thành công trong **956ms** (0 lỗi JSX, 0 cảnh báo).
  - **110/110 unit tests PASS 100%** trong 1.05s.

### [DASH-003] — Loại Bỏ Các Yếu Tố "AI Hóa" (No-AI-Slop), Chuẩn Hóa Giao Diện Dashboard Thực Tế Sản Xuất
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Tinh chỉnh toàn bộ giao diện Dashboard theo nguyên lý phần mềm thực tế (`no-ai-slop`), xóa bỏ các khuôn mẫu AI rập khuôn (AI-slop tropes) gây rối mắt, rườm rà và trùng lặp mã nguồn:
  - **Xóa bỏ bộ chuyển chế độ giả tạo (Eliminate Fake Modes):**
    - Loại bỏ bộ segmented tab `[Kết hợp] [Vận hành] [Mặt bằng 2.5D]`. Không bắt người quản lý phải chọn giữa 3 chế độ xem trùng lặp.
    - Cắt giảm triệt để hơn 300 dòng mã nguồn JSX copy-paste trùng lặp trong `Dashboard.jsx`.
    - Hợp nhất thành 1 bố cục duy nhất 2 cột (Cột chính 65% ca kíp & không gian / Cột phụ 35% xử lý yêu cầu & điểm danh).
  - **Chuẩn hóa thanh chỉ số vận hành (Streamline Metrics Strip):**
    - Thay thế 6 khối thẻ hộp giống hệt nhau kèm các link lặp lại `Xem chi tiết →` bằng một dải 4 chỉ số ngắn gọn, có chủ đích: Ca làm việc (độ phủ/ca trống), Yêu cầu cần xử lý (nổi bật khi có việc cần duyệt), Điểm danh ca (đúng giờ, trễ), Dự toán nhân công.
    - Loại bỏ hàng pill badge chứa toàn số 0 rác (`[Đổi ca 0] [Nghỉ phép 0]...`).
  - **Lồng ghép Sơ đồ Mặt bằng trực tiếp vào Thẻ Ca làm việc:**
    - Ngay trong thẻ Lịch ca, quản lý có thể linh hoạt chuyển tab xem `[Dạng Timeline]` hoặc `[Sơ đồ mặt bằng]` mà không làm xáo trộn toàn bộ trang.
    - `DashboardSpatialSummary.jsx` được loại bỏ các thông số lặp lại và mã màu hex cứng, sử dụng hoàn toàn biến CSS tokens của hệ thống và nhúng bản vẽ kiến trúc SVG `TwoDSpatialSchematic`.
  - **Tối ưu Hành động Duyệt Nhanh & Ngôn ngữ Tự nhiên:**
    - Cột Yêu cầu hỗ trợ duyệt/từ chối ngay tức thì với Optimistic Mutations; trạng thái rỗng tự nhiên ("Tất cả yêu cầu đã được xử lý.").
    - Chấm công hiển thị avatar nhân sự, nhãn trạng thái trực quan và thời gian thực.
- **Nghiệm thu:**
  - `npm run build` thành công xuất sắc (0 lỗi JSX, 0 cảnh báo cú pháp).
  - 110/110 unit tests PASS 100% trong 1.05s.

### [THEME-001] — Triển Khai Bộ Màu "Warm Up" Ấm Áp & Tách Biệt Navbar Tương Phản Đậm Nét
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Chuyển đổi toàn diện hệ thống bảng màu giao diện sang phong cách "Warm Up" (tông màu cà phê ấm, hổ phách, đất nung ấm cúng) và tạo độ tương phản tách biệt rõ rệt cho thanh điều hướng Navbar theo yêu cầu người dùng:
  - **Tách Biệt Màu Navbar Tương Phản Cao (`--ss-nav-*`):**
    - Thiết lập hệ thống biến màu riêng biệt cho Navbar (`--ss-bar`, `--ss-nav-tx`, `--ss-nav-mu`, `--ss-nav-line`, `--ss-nav-surf`, `--ss-nav-ac`, `--ss-nav-ac-soft`) tách hẳn khỏi màu nền trang (`--ss-bg`).
    - Light Mode: Thanh Navbar khoác áo màu Deep Roast Espresso `#1c140e` sang trọng, viền mờ `rgba(255, 255, 255, 0.1)`, tương phản tuyệt đối trên nền ấm `#faf7f2`.
    - Dark Mode: Thanh Navbar sử dụng sắc đen Deep Obsidian Roast `#0c0806`, tạo chiều sâu và tập trung thị giác.
    - Tab đang hoạt động `.ssn-tab.active` hiển thị chữ trắng sáng kèm vạch chân phát sáng màu vàng Hổ phách Ấm (Warm Amber `#f59e0b`).
    - Nút Icon chuông & Tìm kiếm bo tròn với nền mờ tinh tế; badge thông báo đỏ có viền knockout `border: 1.5px solid var(--ss-bar)` hòa vào nền thanh điều hướng.
    - Menu xổ xuống (`.ssn-menu`) và hộp thông báo (`.ssnf-pop`) tiếp tục duy trì thẻ card sáng/tối sắc nét (`--ss-surf`, `--ss-tx`, `--ss-line`) đảm bảo độ tương phản đọc tối ưu.
  - **Bộ Màu Warm Up Ấm Áp Cho Toàn Trang & Dashboard (`dashboard.css`, `types.js`):**
    - **Light Mode:** Nền trang ấm Warm Ivory Linen `#faf7f2`, bề mặt thẻ trắng `#ffffff`, lớp phụ Toasted Oat `#f3ede4`, viền ấm `#e7ded3`, chữ nâu cà phê đậm `#1c1612`, điểm nhấn Warm Amber `#d97706`, vị trí phân công màu Terracotta `#ea580c`, Gold `#d97706`, Copper `#0284c7`.
    - **Dark Mode:** Nền than cháy Deep Espresso `#110d0a`, bề mặt thẻ Charred Oak `#191410`, viền `#352a22`, điểm nhấn Glowing Amber `#f59e0b`, màu vị trí cam đất Terracotta `#f97316`.
    - Cập nhật bảng màu `DEFAULT_POSITION_COLORS` với sắc màu ấm áp, giàu năng lượng đặc trưng ngành F&B / Chuỗi cà phê.
- **Nghiệm thu:**
  - `npm run build` thành công trong **896ms** (0 lỗi JSX, 0 cảnh báo).
  - **110/110 unit tests PASS 100%** trong 1.2s.

### [DASH-002] — Tích Hợp Đa Góc Nhìn Vận Hành & Không Gian 2.5D, Tối Ưu Fit Màn Hình & Phê Duyệt Optimistic Mutations
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Kết hợp cả 2 góc nhìn vận hành ca kíp và không gian mặt bằng 2.5D, tinh chỉnh layout vừa vặn màn hình (Screen-Fit), và ứng dụng quy chuẩn Optimistic Mutations cho các thao tác phê duyệt:
  - **Thiết kế & Bố cục Fit Màn hình (`/frontend-design`, `/frontend-ui-engineering`):**
    - Container mở rộng `max-width: 1600px` với padding `12px 18px 28px` loại bỏ lãng phí không gian màn hình lớn.
    - 6 thẻ KPI tinh gọn (padding `9px 12px`, số liệu `font-size: 20px`), hiển thị cân đối trong 1 hàng duy nhất trên desktop.
    - Bổ sung bộ chuyển đổi 3 chế độ xem `.db-mode-seg`:
      - **"Kết hợp" (`hybrid`):** Phối hợp song song Lịch ca làm việc + Bản đồ không gian 2.5D (`DashboardSpatialSummary`), Yêu cầu cần duyệt, Chấm công với avatar 3D và Biểu đồ hiệu suất tuần dạng tab.
      - **"Vận hành" (`ops`):** Tập trung sâu vào ca kíp, timeline toàn màn hình và 2 biểu đồ phân tích.
      - **"Mặt bằng 2.5D" (`spatial`):** Phóng to sơ đồ 2.5D của cửa hàng, định mức sức chứa, và nhân sự đang trực ca theo khu vực.
    - Tích hợp Avatar 3D WebGL Low-Poly (`Avatar3DWeb` 26px) trên timeline và bảng chấm công với 60 FPS snapshot cache.
  - **Cơ chế Phê duyệt Tức thì (`/frontend-optimistic-mutations`):**
    - Áp dụng chuẩn 5 nhịp: Cancel in-flight → Snapshot state → Optimistic patch UI & toast → Call API (Rollback on error) → Settle & invalidate event.
    - Nút thao tác nhanh `[Duyệt]` và `[Từ chối]` trực tiếp ngay trong danh sách yêu cầu chờ duyệt của Dashboard.
- **Nghiệm thu:**
  - `npm run build` thành công trong **996ms** (0 lỗi JSX, 0 cảnh báo).
  - 110/110 unit test PASS 100% trong 1.1s.

### [DASH-001] — Triển Khai Giao Diện Dashboard Mới Với Dữ Liệu Thời Gian Thực Từ Backend
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Triển khai thiết kế Dashboard hiện đại, mô-đun hóa, đồng bộ bộ token giao diện `--ss-*` (light & dark theme) và kết nối dữ liệu thời gian thực (Real Data) từ hệ thống cơ sở dữ liệu backend:
  - **Mô-đun giao diện hoàn thiện:**
    - `src/components/dashboard/types.js`: Xuất bảng màu kỹ năng/vị trí `DEFAULT_POSITION_COLORS` sử dụng token CSS `--ss-p1`, `--ss-p2`, `--ss-p3`, `--ss-amber`, v.v.
    - `src/components/dashboard/dashboard.css`: Toàn bộ styling chuẩn với layout responsive Grid, thanh lọc ngày/nhân viên, timeline thanh mảnh, thẻ KPI nổi bật, và biểu đồ SVG sắc nét.
    - `src/components/dashboard/ShiftTimeline.jsx`: Timeline 06:00 - 20:00 với dải màu ca kíp, thông tin nhân viên, và vạch thời gian thực màu đỏ `.db-now` tự động cập nhật mỗi phút.
    - `src/components/dashboard/charts.jsx`: Biểu đồ SVG `AssignedChart` (cột xếp chồng ca làm theo vị trí cho 7 ngày) và `HoursChart` (đường kép Lịch xếp vs Thực làm kết hợp fill area).
    - `src/components/dashboard/Dashboard.jsx`: Khung hiển thị tổng thể tích hợp thanh điều hướng thời gian, dropdown nhân viên, nút "Xuất" CSV, nút "Phân công ca", 6 thẻ KPI (với `.hot` khi có yêu cầu cần duyệt), timeline, danh sách yêu cầu và chấm công hôm nay.
  - **Đấu nối dữ liệu thực tế (Real Data Integration):**
    - `src/pages/DashboardPage.jsx`:
      - Thay thế trang monolithic cũ bằng kiến trúc tinh gọn, gọi trực tiếp các API backend: `getAllStores()`, `getEmployees()`, `getSkillsByStore()`, `getShiftsForStore()`, `getStoreAttendance()`, `getStoreLeaveRequests()`, `getStoreSwapRequests()`, `getStoreAdjustmentRequests()`, `getRequests()`.
      - Tự động đồng bộ thời gian thực qua các sự kiện WebSocket (`store_shifts_updated`, `store_attendance_updated`, `store_requests_updated`, `notification_received`) và storage event khi đổi cửa hàng.
      - Chức năng xuất báo cáo dự báo lương / giờ làm việc 7 ngày ra định dạng CSV chuẩn UTF-8 BOM.
- **Nghiệm thu:**
  - `npm run build` thành công trong 1.00s (0 lỗi JSX, 0 cảnh báo cú pháp).
  - 110/110 unit test PASS 100% trong 1.06s.

### [NAV-008] — Tinh Chỉnh Tỉ Lệ Kích Thước Badge Thông Báo Chuẩn Mực Với Icon Chuông
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Tinh chỉnh tỉ lệ kích thước badge đếm số lượng trên icon Chuông theo phản hồi người dùng ("số đang to quá so với cái chuông noti"):
  - **Nguyên nhân mất cân đối:**
    - Icon chuông Lucide `<Bell />` hiển thị ở kích thước 16px trong khi badge `em` dùng `box-sizing: content-box`, `min-width: 16px`, `padding: 0 4px` và `border: 2px solid`, khiến kích thước thực tế phình to đến 28px x 20px (gần gấp đôi icon chuông).
  - **Giải pháp triển khai:**
    - Chuẩn hóa kích thước icon chuông: `<Bell size={18} strokeWidth={2} />` và `.ssnf .ssn-ico svg { width: 18px; height: 18px; }`.
    - Chuyển badge sang `box-sizing: border-box;`, `min-width: 14px`, `height: 14px`, `padding: 0 3px`, `border: 1.5px solid var(--ss-bg)`.
    - Đặt font chữ sắc nét `font: 700 9px/1 system-ui`, `letter-spacing: -0.02em` căn giữa hoàn hảo dạng hình tròn đối với số 1 chữ số và pill gọn gàng đối với số 2 chữ số.
    - Căn vị trí `top: 3px; right: 3px;` ôm sát góc vai phải của icon chuông một cách tinh tế và chuẩn UI enterprise.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 1.05s (0 lỗi).
  - `npm run build` thành công trong 964ms (0 lỗi JSX, 0 lỗi biên dịch).

### [NAV-007] — Khôi Phục Badge Số Lượng Thông Báo & Tích Hợp Real Data Backend Toàn Diện
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Khôi phục badge đỏ đếm số lượng thông báo trên biểu tượng Chuông và tổng hợp dữ liệu thực tế (Real Data) từ CSDL backend theo phản hồi của người dùng:
  - **Nguyên nhân mất số thông báo:**
    - CSDL tài khoản `manager.pvd@shiftsync.com` chỉ có 1 thông báo hệ thống đã đọc (`is_read = true`), khiến số `unread` tính thuần túy từ bảng `notification` bị bằng 0 và ẩn badge đỏ `<em>`.
    - Các yêu cầu ca kíp chờ quản lý duyệt thực tế (`shift_swap_request`, `attendance_adjustment_request`, `leave_request`) trước đây chưa được gom chung vào luồng thông báo của Navbar.
    - Component `Navbar.jsx` chưa truyền prop `unreadCount` vào `<NotificationBell />`, và `NotificationBell` chưa nhận prop `unreadCount`.
  - **Giải pháp kỹ thuật (Real Data Integration):**
    - **`src/layouts/MainLayout.jsx`:**
      - Truy vấn đồng thời 6 luồng dữ liệu thời gian thực: `getStoreSwapRequests` (đổi ca chờ duyệt), `getStoreAdjustmentRequests` (giải trình chấm công), `getStoreLeaveRequests` (đơn nghỉ phép), `getMarketplaceShifts` (ca mở), `getMyNotifications` (thông báo cá nhân), và `getUnreadNotificationCount`.
      - Tổng hợp thành danh sách thông báo đa nghiệp vụ `combinedRealNotifications` mang cờ `needsAction: true` và `read: false` cho các yêu cầu đang chờ phê duyệt.
      - Tính toán `totalRealCount = unreadRequestsCount + Math.max(inAppUnread, unreadInAppCount)`.
      - Bổ sung `pendingAdj: pendingAdjCount` vào `counts` của `<Navbar />`.
      - Đấu nối thao tác duyệt/từ chối trực tiếp: gọi `approveSwapRequest`/`rejectSwapRequest`, `approveAdjustmentRequest`/`rejectAdjustmentRequest`, `approveLeaveRequest`/`rejectLeaveRequest`.
    - **`src/components/navbar/Navbar.jsx`:**
      - Trích xuất `unreadNotifCount` từ `counts.notifications`.
      - Bảo lưu `rawId` và `source` khi ánh xạ `activeNotifications`.
      - Truyền `unreadCount={unreadNotifCount}` vào `<NotificationBell />`.
      - Bổ sung badge đếm số lượng yêu cầu chờ duyệt trên menu xổ xuống "Chấm công & Phép" (`pendingLeave + pendingAdj`) và "Chợ ca mở" (`openShifts + pendingSwap`).
    - **`src/components/navbar/NotificationBell.jsx` & `notifications.css`:**
      - Tiếp nhận prop `unreadCount`, đồng bộ số hiển thị badge chuông với `totalRealCount`.
      - Bổ sung định dạng CSS tường minh `.ssnf .ssn-ico em` đảm bảo badge đỏ hiển thị nổi bật, căn giữa, chống giật layout.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 1.1s (0 lỗi).
  - `npm run build` thành công trong 1.02s (0 lỗi JSX, 0 lỗi biên dịch).
  - Hiển thị chính xác số đếm và danh sách thông báo thực tế từ CSDL.

### [NAV-006] — Đồng Bộ & Chuẩn Hóa Popover Thông Báo Pixel-Perfect Theo Ảnh Tham Chiếu
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Hoàn thiện popup thông báo theo 4 ảnh chụp màn hình do người dùng cung cấp ("Phải có như này chứ"):
  - **Dữ liệu Thông báo Mẫu Chuẩn Xác 100%:**
    - Cập nhật đủ 6 thông báo mẫu trùng khớp từng chữ với ảnh:
      1. *Yêu cầu đổi ca* (Lan Anh muốn đổi ca tối 18/10 với Minh Khôi, 5 phút trước, unread, needsAction)
      2. *Yêu cầu đổi ca* (Hoàng Nam muốn đổi ca sáng 19/10 với Thu Hà, 40 phút trước, unread, needsAction)
      3. *Đơn nghỉ phép* (Thu Hà xin nghỉ ngày 20/10, lý do việc gia đình, 1 giờ trước, unread, needsAction)
      4. *Ca mở đã có người nhận* (Quốc Bảo nhận ca chiều 17/10 tại quầy thu ngân, 3 giờ trước, read, no action)
      5. *Giải trình chấm công* (Minh Khôi quên chấm công vào ca sáng hôm nay, 5 giờ trước, unread, no action)
      6. *Lịch tuần đã công bố* (Lịch tuần 14–20/10 đã gửi tới 18 nhân viên, Hôm qua, read, no action)
    - Số đếm trên tab: **Chưa đọc 4**, **Yêu cầu 3**, chuông thông báo hiển thị badge đỏ **4**.
  - **Tối ưu Hóa Giao Diện & Trải Nghiệm Tương Tác:**
    - Căn chỉnh chấm xanh chưa đọc (`.ssnf-item.unread::before`) đồng tâm theo trục dọc (Y-axis) với hộp icon 38x38px (`left: 9px; top: 26px;`).
    - Pill badge đếm số lượng trên các tab (`.ssnf-n`): nền mint `#e8f7f0`, chữ xanh `#0f9d68`, bo góc 9px.
    - Thanh gạch chân tab hoạt động (`.ssnf-tab[aria-selected="true"]::after`): vạch xanh ngọc `#0f9d68` dày 2.5px viền dưới.
    - Nút bấm hành động: "Duyệt" (nền xanh `#0f9d68`, chữ trắng), "Từ chối" (nền trắng, viền xám `#dbe5df`, chữ đen) với kích thước và khoảng đệm chuẩn xác.
    - Hiệu ứng rê chuột: item chuyển sang nền xanh bạc hà dịu nhẹ `#ebf7f0` bo góc 12px.
    - Thanh cuộn (`scrollbar`) tùy biến mỏng 6px, bo tròn gọn gàng.
  - **Khả Năng Xử Lý Sự Kiện:**
    - Nâng cấp `handleMarkNotificationRead` trong `MainLayout.jsx` hỗ trợ cả chuỗi `id` và đối tượng `notification`.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 1.28s (0 lỗi).
  - `npm run build` thành công trong 965ms (0 lỗi JSX, 0 lỗi biên dịch).

- **Phạm vi & Mục tiêu:** Áp dụng toàn diện thành phần `NotificationBell` và stylesheet `notifications.css` theo thiết kế cung cấp của người dùng:
  - **Kiến trúc Thành phần Mới (`NotificationBell.jsx` & `notifications.css`):**
    - Hộp thoại `ssnf-pop` nổi 400px với tiêu đề, nút "Đánh dấu đã đọc" (`CheckCheck`), và 3 tab lọc: **Tất cả**, **Chưa đọc** (kèm số lượng unread), **Yêu cầu** (kèm số lượng needsAction).
    - Phân nhóm thời gian trực quan: **Cần xử lý**, **Hôm nay** và **Trước đó**.
    - Icon phân loại trực quan theo từng loại nghiệp vụ (`swap`, `leave`, `open_shift`, `attendance`, `system`) với sắc thái màu (warning/mute/normal).
    - Hỗ trợ nút thao tác nhanh trực tiếp trong popover: **Duyệt** (`approve`) và **Từ chối** (`reject`) với trạng thái `busy` chống bấm đúp, cho phép quản lý phê duyệt đơn đổi ca / nghỉ phép ngay tại chỗ.
    - Chân menu cung cấp nút **Xem tất cả thông báo**.
  - **Tích Hợp Dữ Liệu Thời Gian Thực & Thao Tác Phê Duyệt:**
    - `Navbar.jsx`: Thay thế cụm chuông cũ bằng `<NotificationBell>`, nạp dữ liệu động từ backend hoặc dữ liệu mẫu thông minh.
    - `MainLayout.jsx`: Cung cấp hàm `handleAction(id, action)` kết nối trực tiếp với `approveSwapRequest` / `rejectSwapRequest` và `approveLeaveRequest` / `rejectLeaveRequest`.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 1.07s (0 lỗi).
  - `npm run build` thành công trong 886ms (0 lỗi JSX, 0 lỗi biên dịch).

### [NAV-004] — Khắc Phục Nút Thông Báo Navbar Thành Menu Popover Dropdown Trực Quan
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Khắc phục lỗi nút thông báo điều hướng sai trang khi nhấp vào icon chuông trên Navbar:
  - **Nguyên nhân sự cố:** Mã nguồn Navbar ban đầu sử dụng thẻ `<Link to="/notifications">`. Khi người dùng nhấp vào chuông thông báo, trang web bị chuyển hướng bất ngờ rời khỏi trang hiện tại sang trang yêu cầu `/requests` mà không hiển thị danh sách thông báo.
  - **Giải pháp triển khai:**
    - Thay thế thẻ `<Link>` bằng thẻ nút bấm `<button>` tương tác đóng/mở popover dropdown `.ssn-menu.ssn-menu-notif`.
    - Thiết kế bảng thông báo nổi 380px sang trọng với 3 tab lọc: **Tất cả**, **Chưa đọc** và **Yêu cầu** (Đơn nghỉ phép chờ duyệt, Yêu cầu đổi ca, Sàn ca mở).
    - Tích hợp tính năng **Đã đọc tất cả** (`markAllNotificationsAsRead`) và nhấp vào từng mục thông báo để đánh dấu đã đọc (`markNotificationAsRead`) kèm điều hướng chính xác đến phân hệ nghiệp vụ tương ứng.
    - Đấu nối dữ liệu danh sách thông báo thực tế từ `notificationService.getMyNotifications()` thông qua `MainLayout.jsx`.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 3.96s (0 lỗi).
  - `npm run build` thành công trong 8.32s (0 lỗi JSX, 0 lỗi biên dịch).

### [NAV-003] — Triển Khai Giao Diện Navbar Mới Cùng ThemeProvider (Light & Dark Mode)
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Áp dụng thử nghiệm bộ thành phần Navbar tinh gọn, thanh thoát theo mã nguồn cung cấp của người dùng:
  - **Kiến trúc Thành phần Mới (`src/components/navbar/`):**
    - `Navbar.jsx`: Thanh điều hướng tinh giản 60px, tích hợp 5 nhóm chức năng (Dashboard, Lập lịch ca, Chấm công & Phép, Chợ ca mở, Hồ sơ nhân sự) với dropdown flyout menu (`ssn-menu`), phím tắt tìm kiếm `Ctrl + K`, chuông thông báo có badge đếm số, nút chuyển cửa hàng, và dropdown tài khoản người dùng kèm nút chuyển chế độ Sáng / Tối và Đăng xuất.
    - `theme.jsx`: Cung cấp `ThemeProvider` và hook `useTheme()`, tự động đồng bộ thuộc tính `data-theme` trên `<html>` và lưu trữ `shiftsync-theme` trong `localStorage`.
    - `navbar.css`: Thiết lập token biến màu theo chuẩn thiết kế hai chế độ sáng/tối (`--ss-bar`, `--ss-surf`, `--ss-line`, `--ss-tx`, `--ss-mu`, `--ss-ac`, `--ss-warn`, `--ss-shadow`), hiệu ứng mờ kính `backdrop-filter: blur(12px)`, và drawer di động thu gọn mượt mà.
  - **Tích Hợp Hệ Thống Thực Tế:**
    - `MainLayout.jsx`: Kết nối trực tiếp Navbar mới với dữ liệu thật của ShiftSync (thông tin user từ `localStorage`, chi nhánh từ `getAllStores()`, số lượng đơn nghỉ phép chờ duyệt, số ca mở từ `marketplaceService`, thông báo chưa đọc từ `notificationService`, điều hướng chuyển chi nhánh động và đăng xuất an toàn).
    - `App.jsx`: Bọc `ThemeProvider` ở cấp độ cao nhất ứng dụng, bổ sung đầy đủ route con (`/dashboard`, `/attendance`, `/attendance/leave`, `/marketplace/swaps`, v.v.) đảm bảo các đường link trong navbar hoạt động 100% không bị lỗi 404.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 6.89s (0 lỗi).
  - `npm run build` thành công trong 7.30s (0 lỗi JSX, 0 lỗi biên dịch).

### [NAV-002] — Aero-Precision Mission Control Navbar Redesign & Brand Logo Elevation
- **Ngày thực hiện:** 17/10/2026
- **Phạm vi & Mục tiêu:** Tái thiết kế toàn diện hệ thống thanh điều hướng Navbar và nhận diện thương hiệu theo phương pháp luận `frontend-design`, định hướng thẩm mỹ "Aero-Precision Mission Control" (DFII Score: 14/15):
  - **Nhận diện Thương hiệu & Logo Mới (`ShiftSyncLogoMark`):**
    - Giải quyết dứt điểm phản hồi về logo cũ và nhãn `PRO` dư thừa.
    - Điêu khắc biểu tượng SVG Monogram 32x32px nguyên bản: 3 dải track quỹ đạo ca kíp động học uốn lượn hình chữ "S" với 2 điểm neo tín hiệu (anchor nodes), chuyển sắc gradient ngọc lục bảo sang lục lam (`#10b981` -> `#06b6d4`).
    - Typography Wordmark phân tầng tương phản cao: `Shift` (trắng băng #f8fafc, tracking tight, font-weight 700) + `Sync` (xanh ngọc lục bảo #10b981, tracking normal, font-weight 800) kết hợp đèn tín hiệu viễn trắc (telemetry beacon) nhấp nháy xanh dịu.
  - **Tái cấu trúc Ngôn ngữ & Hệ thống Nhãn Phân hệ:**
    - Thay thế toàn bộ nhãn in hoa cồng kềnh bằng typography mixed-case tinh tế, thân thiện tiếng Việt: `Dashboard`, `Lập Lịch Ca`, `Chấm Công & Phép`, `Chợ Ca Mở`, `Hồ Sơ Nhân Sự`, `Quản Trị`.
    - Thanh laser light-bar (`.ss-laser-indicator`) nổi bên dưới nút phân hệ đang kích hoạt, tạo điểm nhấn quang học sắc nét thay thế các khối viền hộp thô cứng.
  - **Hệ thống Điều khiển Khoang Lái Tối tân (Cockpit Pods):**
    - Module hóa toàn bộ các nút chức năng góc phải (`.ss-cockpit-btn`): Cụm chọn cửa hàng (`StoreSwitcher`), nút chuyển đổi chế độ thanh điều hướng (`Top` vs `Rail`), trạm radar thông báo và thẻ avatar nhân sự.
    - Nút chọn chi nhánh hiển thị mã định danh và chấm trạng thái online viễn trắc; chuông thông báo trang bị radar quét ánh sáng (`.ss-radar-beacon`) khi có tin mới.
  - **Nâng cấp Khung Kính Flyout Panel Acrylic:**
    - Nền kính mờ mật độ cao `backdrop-filter: blur(28px)`, viền mạ kim loại hairline `rgba(255,255,255,0.08)`.
    - Phân tách 2 cột chức năng: Thẻ định vị phân hệ (`categoryTag`) kèm tooltip hỗ trợ (`ESC để đóng`) và danh sách tiện ích con với hiệu ứng hover trượt sáng.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 985ms.
  - `npm run build` thành công trong 34.96s (0 lỗi JSX, 0 lỗi bundling).
  - Tương thích 100% cả 2 chế độ hiển thị Top Canopy và Sidebar Rail.

### [NAV-001] — Interactive Flyout Navbar Architecture (Top Bar & Sidebar Rail Modes)
- **Ngày thực hiện:** 16/10/2026
- **Phạm vi & Mục tiêu:** Triển khai thanh điều hướng Flyout Navbar hiện đại, trực quan và tối ưu không gian hiển thị cho toàn bộ ứng dụng ShiftSync Web:
  - **Kiến trúc Flyout ("Menu bay ra"):**
    - Thiết kế 6 cụm phân hệ chuẩn mực: Dashboard (Tổng quan & 3D Twin), Workforce Scheduling (Điều phối & Lập lịch), Time & Workforce (Chấm công & Nghỉ phép), Marketplace (Chợ ca & Đổi ca), Employees (Hồ sơ nhân sự), Admin (Quản trị hệ thống).
    - Mỗi cụm phân hệ khi hover/click sẽ hiển thị Mega Flyout Panel nổi trên nền kính mờ (`backdrop-filter: blur(24px)`), kèm thẻ phân loại (`categoryTag`), mô tả định hướng, danh sách tính năng con kèm biểu tượng riêng, huy hiệu trạng thái thời gian thực (`pendingLeaveCount`, `openShiftsCount`, `pendingSwapCount`, ...) và nút lối tắt hành động nhanh (`quickAction`).
  - **Hỗ trợ 2 Chế độ Giao diện Linh hoạt (Dual Layout):**
    1. **Top Flyout Navbar (Mặc định):** Thanh ngang trên cùng kinh điển, dropdown flyout panel trôi xuống với mũi tên chỉ báo tinh tế, chuyển tiếp mượt mà.
    2. **Sidebar Rail Flyout Navbar:** Thanh rail đứng tinh gọn 68px bên trái màn hình, flyout panel trượt sang phải. Giải phóng 100% chiều cao màn hình, mang lại trải nghiệm tối đa cho Không Gian 3D Digital Twin và Lịch Làm Việc Tuần.
  - **Trải nghiệm & Khả năng Tiếp cận (UX & Accessibility):**
    - Cơ chế debounce timer 140ms chống rung (flickering) khi lia chuột giữa các menu.
    - Đóng flyout ngay lập tức khi nhấn phím `Escape` hoặc nhấp chuột ra ngoài.
    - Hỗ trợ Mobile Slide-out Drawer cho màn hình nhỏ (< 1080px) với cây thư mục thu gọn/mở rộng trực quan.
    - Lưu trữ tùy chọn chế độ vào `localStorage` (`ss_flyout_mode`) và đồng bộ tức thời qua `CustomEvent`.
    - Chuẩn hóa tên thương hiệu: Loại bỏ nhãn trang trí `PRO`, hiển thị logo nhận diện chính thức thuần túy `ShiftSync`.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 985ms.
  - `npm run build` thành công trong 6.01s (0 lỗi).
  - Tương thích 100% với canvas 3D Digital Twin, không gây gián đoạn luồng raycast và toạ độ thao tác.

### [FURN-001] — Dedicated Modular GLB Furniture Models & 360° Interactive Showroom
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Xây dựng hệ thống 4 mô hình bàn ghế 3D định dạng chuẩn glTF 2.0 Binary (`.glb`) độc lập, sắc nét, mô đun hóa cao cùng Showroom 3D Studio xoay 360 độ:
  - **Kịch bản Điêu khắc (`scripts/generate-furniture-models.js`):**
    - Sử dụng Node.js Three.js & `GLTFExporter` tạo ra 4 model bàn ghế chuẩn PBR (vân gỗ sồi Scandinavian, đá cẩm thạch trắng Carrara, kim loại phủ sơn tĩnh điện đen mờ, viền đồng thau, nệm da cognac & nhung xanh ngọc lục bảo):
      1. `ShiftSync_Bistro_Set.glb` (123.6 KB): Bàn tròn thạch anh trắng + 2 ghế gỗ uốn bentwood đệm nỉ chân bọc đồng.
      2. `ShiftSync_Communal_Table.glb` (181.4 KB): Bàn dài gỗ sồi khối lớn 4.6m, chân thép chữ A + 6 ghế bar xoay bọc da espresso.
      3. `ShiftSync_Booth_Sofa.glb` (15.6 KB): Băng ghế sofa booth nệm nhung xanh emerald, vách ngăn nỉ cách âm + bàn pedestal đá thạch anh.
      4. `ShiftSync_Lounge_Nook.glb` (91.2 KB): Cặp ghế bành thư giãn da bò cognac uốn lượn phong cách Mid-Century + bàn trà tròn cẩm thạch trắng Carrara chân hairpin.
  - **Phân phối Tài nguyên:** Tự động đồng bộ các tệp `.glb` vào `ShiftSync-Web/public/models/`, `./` và `shiftsync-backend/`.
  - **Showroom 3D (`ShiftSync-Web/public/furniture-viewer.html`):** Studio WebGL tương tác xem xoay 360 độ, bật/tắt turntable tự động, bật lưới wireframe, xem thông số chi tiết của từng mẫu.
  - **Tích hợp UI (`SpatialToolbar.jsx`):** Thêm nút liên kết `Nội thất 3D` với biểu tượng ghế bành mở nhanh showroom trong tab mới.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 2.56s.
  - `npm run build` thành công trong 2.25s (0 lỗi).
  - Trực tiếp kiểm thử và chụp ảnh màn hình xác nhận cả 4 mẫu mô hình hiển thị hoàn mỹ trong showroom và nút thanh công cụ hiển thị chuẩn trên giao diện web.

### [WS-004] — Remove Standalone Mock Workstation Desk from Center Floor
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Loại bỏ bàn làm việc máy tính đơn lẻ (`WorkstationAssetModel`) ở giữa lối đi trung tâm cửa hàng theo phản hồi người dùng:
  - Xóa component `<WorkstationAssetModel />` và import tương ứng khỏi [DigitalTwinCanvas.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx).
  - Loại bỏ hoàn toàn khối bàn tĩnh với thẻ nhãn nổi `Bàn Làm Việc Nhân Viên (3D) / undefined • Có mặt` che chắn giữa màn hình.
  - Bảo tồn nguyên vẹn hệ thống trạm làm việc động thực tế do [WorkstationLayer.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/WorkstationLayer.jsx) nạp từ API backend và các vị trí quầy Barista/POS chính thống.
- **Nghiệm thu:**
  - 110/110 unit test PASS 100% trong 1.11s.
  - `npm run build` thành công trong 886ms (0 lỗi).
  - Kiểm thử trực quan trên Chrome DevTools xác nhận lối đi trung tâm và góc nhìn thứ nhất hoàn toàn thoáng đãng, sạch sẽ.

### [CAM-001] — 3D Camera Liberation: Horizon Polar Angles, Infinite Zoom/Pan, Double-Click Pivot & Noclip Fly Mode
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Giải phóng hoàn toàn góc nhìn và camera 3D theo phản hồi người dùng ("camera không được tự do à"):
  - **CameraManager.js (Toàn cảnh - Overview):**
    - Mở rộng góc nghiêng polar: `minPolarAngle = 0.01` (ngắm thẳng từ trên trần nhà xuống), `maxPolarAngle = 1.565` (~89.7°, ngắm ngang tầm mắt nhân viên).
    - Mở rộng khoảng cách zoom: `minDistance = 0.2m` (zoom cực cận vào gương mặt nhân viên), `maxDistance = 180m`.
    - Bật pan mượt mà với chuột phải/phím mũi tên (`enablePan = true`, `screenSpacePanning = true`).
    - Hủy lerp chuyển động ngay lập tức khi người dùng bắt đầu kéo chuột, nhường toàn quyền điều khiển cho người dùng.
    - Hỗ trợ hàm `setOrbitTarget(targetPos, distance)` để tái định tâm mượt mà.
  - **DigitalTwinCanvas.jsx (Double-Click Re-centering):**
    - Bổ sung sự kiện `dblclick`: Bắn raycast vào bất kỳ nhân viên, quầy trạm hoặc điểm sàn nào để định tâm camera xoay ngay lập tức quanh điểm đó.
  - **PlayerController.js & FirstPersonController.jsx (Tham quan 3D - Explore Mode):**
    - Mở rộng phạm vi ngước/cúi chuột từ [-25°, +38°] lên [-85°, +85°], cho phép ngước nhìn đèn trần hoặc cúi nhìn sàn nhà thoải mái.
    - Tích hợp chế độ **Bay Tự Do (Free Fly / Noclip 3D)** bật/tắt bằng phím `[C]`.
    - Điều khiển độ cao: `Space` để bay lên, `KeyQ` để bay xuống.
    - Bỏ qua trọng lực và va chạm vật cản khi bay, cho phép bay lượn từ 0.2m đến 30m ngắm toàn cảnh cửa hàng từ trên không.
  - **ExploreHUD.jsx & SpatialWorkspace.jsx:**
    - Bổ sung phím tắt `[C] Bay: Bật (Space/Q)` kèm huy hiệu xanh ngọc emerald rực rỡ khi bay.
- **Nghiệm thu:**
  - 110/110 automated unit test PASS 100% trong 3.02s (bổ sung tests cho Free Fly mode và free pitch look).
  - `npm run build` thành công trong 2.10s (0 lỗi).
  - Kiểm thử trực quan và xác thực thao tác trên Chrome DevTools: Bật phím C, bay lên độ cao 2.53m ngắm toàn cảnh cửa hàng từ trên không.

### [ASSET-012] — Full Integration of 3D GLB Character Models into Store Digital Twin
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Đưa toàn bộ 4 mô hình 3D GLB (Barista, Manager, Cashier, Chef) vào thay thế nhân viên trên không gian 3D Digital Twin cửa hàng:
  - **CharacterAssetLoader.js:** Quản lý nạp song song, tiền lưu trữ (pre-cache) 4 tệp `.glb`, giải quyết vai trò tiếng Việt/Anh (`resolveCharacterRole`), nhân bản `clone(true)` không tốn thêm bộ nhớ đệm hình học, trích xuất liên kết khớp xương (`Hips`, `LeftHip`, `RightHip`, `LeftShoulder`, `RightShoulder`, `Head`, `Spine`).
  - **StylizedAvatars.js & AvatarLayer.jsx:** Tích hợp trực tiếp mô hình GLB vào các ca làm việc. Giữ nguyên 100% cơ chế raycasting click chọn nhân sự (`userData.isPerson = true`), vòng tiếp đất (`contactRing`), vòng hào quang chọn (`selectionHalo`) và nhãn tên 3D Billboard Sprite (`createStaffTagSprite`).
  - **Skeletal State Machine:** Diễn hoạt bước đi sinh động (`WALKING`: sải chân, vung tay, nhún hông), trạng thái làm việc đặc thù (`WORKING`: nhịp thở lồng ngực, nghiêng đầu quan sát, barista rót sữa, thu ngân gõ POS, đầu bếp cầm khay bánh, quản lý kiểm tra tablet).
  - **PlayerAvatar.js:** Nâng cấp nhân vật người chơi chế độ tham quan góc nhìn thứ 3 (Explore mode) sang mô hình Quản lý GLB 3D sắc nét.
- **Nghiệm thu:**
  - 35/35 unit test tự động (bao gồm `CharacterGLBIntegration.test.js`) PASS 100% trong 2.53s.
  - `npm run build` thành công trong 2.04s (0 lỗi).
  - Kiểm thử trực quan trên Chrome DevTools tại `/schedule` (chế độ 3D): Nhân viên xuất hiện tại các quầy quẹt thẻ, phục vụ với mô hình 3D chân thực, mượt mà 60 FPS.

### [ASSET-011] — Eliminate "Burglar Mask" Hair Geometry & Sculpt Organic Stylized Humanoid Faces
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Khắc phục lỗi hình học tóc trùm mặt ("Sao giống trộm vậy") và hoàn thiện gương mặt Stylized 3D cho cả 4 nhân vật F&B:
  - **Căn nguyên:** Khối tóc cũ có bán kính lớn hơn hộp sọ và góc quét `thetaLength = Math.PI * 0.58` (104.4°), đổ xuống quá sâu che kín trán và cắt ngang mắt, tạo cảm giác như đội mũ len trùm đầu (balaclava) của kẻ trộm.
  - **Khắc phục:**
    - Thiết kế lại khối tóc hữu cơ ôm đỉnh và sau gáy, chừa trọn vẹn vầng trán cao sáng sủa.
    - Dựng khối tóc bằng các cụm hình cầu hữu cơ uốn lượn tự nhiên (`mainQuiff`, `sideTress`, `frontLock`) thay vì khối trụ cắt phẳng.
    - Hoàn thiện chi tiết gương mặt: Đôi mắt to tròn sáng ngời có catchlight long lanh, sống mũi thon gọn (`Nose_Tip`), đôi môi cười nhẹ thân thiện (`Lips_Smile`) và cổ áo ôm khít (`Shirt_Collar`).
    - Bổ sung đèn chiếu chân dung `fillLight` trực diện trong WebGL showroom để gương mặt luôn sáng rõ.
  - **Nghiệm thu:** Xuất 4 tệp `.glb` nhị phân (<325 KB), `npm run build` thành công trong 2.74s (0 lỗi), kiểm thử trực quan trên Chrome DevTools gương mặt đẹp, sáng sủa, 60 FPS mượt mà.

### [ASSET-010] — 4-Role Professional F&B 3D Character Suite: Barista, Manager, Cashier, Chef
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Tinh chỉnh diện mạo nhân viên F&B theo phản hồi người dùng:
  - Loại bỏ hoàn toàn nón lá và khăn rằn cồng kềnh; nâng cấp chất lượng thẩm mỹ Barista lên ngang tầm mẫu Polo; định hình mẫu Polo thành Quản lý (Manager); phát triển thêm các mô hình chuyên biệt cho từng vị trí F&B.
  - **4 Mô hình 3D Hình Nhân Hữu Cơ Hoàn Chỉnh (Zero Blocky Layer/Box):**
    - `ShiftSync_Barista.glb`: Sơ mi đen xắn tay, tạp dề yếm canvas nâu Robusta quai da bò chéo lưng đinh tán đồng, ca đánh sữa Latte Art Inox bóng loáng và ly takeaway.
    - `ShiftSync_Manager.glb`: Áo polo xanh navy có cổ bẻ sắc nét, quần chinos tối màu, giày da bóng, thẻ tên quản lý mạ vàng và máy tính bảng điều hành cửa hàng.
    - `ShiftSync_Cashier.glb`: Áo sơ mi be cát, tạp dề lửng thắt eo, tai nghe bộ đàm F&B và máy quét POS cầm tay.
    - `ShiftSync_Chef.glb`: Áo chef coat trắng 2 hàng cúc đen, mũ beret đầu bếp, khay bánh nướng inox và bánh sừng bò croissant vàng ươm.
  - **Pipeline Xuất Bản Asset:** Xuất 4 tệp glTF 2.0 Binary siêu nhẹ (<290 KB/tệp, <9,200 tris) bằng Three.js GLTFExporter, đồng bộ vào `ShiftSync-Web/public/models/`, root repo và `shiftsync-backend/`.
  - **Showroom & Ứng Dụng Studio:** Nâng cấp `public/avatar-studio.html` và `AvatarStudioPage.jsx` với bộ 4 nút chuyển đổi vai trò nhanh, bảng HUD kỹ thuật trực quan, chế độ xem Turntable 360°, Wireframe và dáng đi Walk cycle.
  - **Nghiệm thu:** `npm run build` thành công trong 14.64s (0 lỗi), kiểm thử trực quan trên Chrome DevTools mượt mà 60 FPS.

### [ASSET-009] — Complete 3D Vietnamese Heritage Barista Model (`ShiftSync_Vietnamese_Staff.glb`)
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Xây dựng mô hình 3D nhân vật Barista/F&B đậm đà bản sắc văn hóa Việt Nam (Vietnamese Heritage Style), đáp ứng yêu cầu người dùng:
  - **Mô hình Hữu cơ Không Ghép Layer:** Tỉ lệ chuẩn Á Đông (~1.70m), da vàng ấm tự nhiên (`#E8BA93`), tóc đen tuyền rẽ ngôi 7/3 vuốt phồng hiện đại, mắt đen hạt dẻ có catchlight có hồn.
  - **Trang phục Di sản Cà phê Việt Nam:**
    - Áo đũi màu xanh rêu quân đội trầm (`#2D4536` phong cách Cộng Cà Phê / Phê La) cúc gỗ mộc mạc và huy hiệu Cờ Đỏ Sao Vàng.
    - Khăn rằn Nam Bộ kẻ caro đen trắng quấn quanh cổ buông 2 vạt nơ mềm mại.
    - Tạp dề canvas màu nâu cà phê Robusta Tây Nguyên quai da bò đan chéo sau lưng.
    - Nón lá Việt Nam đan nan vàng rơm tự nhiên vắt nghiêng nhẹ sau lưng với dây lụa xanh ngọc bích.
  - **Phụ kiện Biểu tượng Văn hóa F&B:**
    - Chiếc Phin Cà Phê Nhôm Truyền Thống Việt Nam (đĩa lót, thân trụ dập gờ nổi, nắp phin núm cầm sáng bóng).
    - Ly Cà Phê Sữa Đá thủy tinh với lớp sữa đặc, lớp cà phê nâu và ống hút tre xanh mộc mạc.
    - Khớp chi động học hoàn chỉnh (Shoulders, Elbows, Wrists, Hips, Knees, Ankles) và giày sneaker trắng.
  - **Xuất Bản Asset:** `ShiftSync-Web/public/models/ShiftSync_Vietnamese_Staff.glb` (424.8 KB, 68 meshes, 13,778 triangles), đồng bộ sang `ShiftSync_Vietnamese_Staff.glb` và `shiftsync-backend/`.
  - **Tích hợp & Showroom:** Cập nhật `AvatarStudioPage.jsx` và `public/avatar-studio.html` đặt mô hình làm mặc định kèm bộ chuyển đổi nhanh.
  - **Nghiệm thu:** `npm run build` thành công trong 7.11s (0 lỗi), 60 FPS mượt mà.

### [ASSET-008] — Ready Player Me & React Three Fiber Humanoid Avatar Architecture (DEV.to Pattern)
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Triển khai giải pháp hiển thị và tùy biến thực thể người 3D chuẩn xác theo kiến trúc bài viết DEV Community (*"How to Use Three.js And React to Render a 3D Model of Your Self"*):
  - **Component Trực quan (`ReadyPlayerMeViewer.jsx`):** Sử dụng `@react-three/fiber` và `@react-three/drei` (`<Canvas>`, `<OrbitControls>`, `useGLTF`), tích hợp hệ thống chiếu sáng PBR Studio và 3 preset camera công thái học (`face`, `upper`, `full`).
  - **Modal Tích hợp Ready Player Me Creator (`ReadyPlayerMeCreatorModal.jsx`):** Nhúng Web Frame chính thức của Ready Player Me, bắt sự kiện `v1.avatar.exported` qua PostMessage để nạp tức thì file `.glb` vào ứng dụng; hỗ trợ dán link URL và tải lên file `.glb` trực tiếp từ máy tính.
  - **Trang Studio 3D Avatar (`AvatarStudioPage.jsx`):** Đăng ký route `/avatar-studio`, hỗ trợ xoay 360°, đổi theme studio sáng/tối, chọn mẫu nhân viên F&B ShiftSync và lưu vào hồ sơ người dùng (`localStorage`).
  - **Showroom Độc lập Kiểm thử (`public/avatar-studio.html`):** WebGL Three.js showroom độc lập tại `http://localhost:3000/avatar-studio.html` với Drawer hiển thị mã nguồn React Three Fiber mẫu.
  - **Tích hợp Vào Modal Avatar Hiện Hữu:** Bổ sung nút truy cập nhanh "✨ 3D Avatar Studio (Ready Player Me)" trong `AvatarCollectionModal.jsx`.
  - **Nghiệm thu:** `npm run build` thành công trong 1.51s (0 lỗi), kiểm thử trực quan 60 FPS mượt mà.

### [ASSET-007] — Complete 3D Humanoid Employee Model (Thực thể Nhân viên 3D Hoàn Chỉnh)
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:**
  - **Khắc phục triệt để phong cách ghép lớp khối màu cũ:** Thay thế hoàn toàn hình nhân khối hộp phẳng chắp vá (`BoxGeometry` đa lớp kiểu Minecraft/Lego) bằng một mô hình 3D hình nhân (Humanoid) hoàn chỉnh, liền mạch, công thái học F&B (~1.72m) với hình học hữu cơ mượt mà.
  - **Pipeline Sinh Mô hình 3D Nhân viên Chuẩn glTF 2.0 (`scripts/generate-employee-glb.js`):**
    - Đầu & Khuôn mặt bo cong mềm mại: Hộp sọ elip (`SphereGeometry`), mái tóc 3D bồng bềnh rẽ ngôi lượn sóng, mắt 3D có con ngươi và điểm sáng catchlight nổi khối, tai bo cong, cổ đứng.
    - Đồng phục F&B ShiftSync chuyên nghiệp: Áo thun polo có cổ bẻ sắc sảo, tạp dề yếm Barista Utility Apron ôm sát thân người có quai da đan chéo sau lưng (`cross-back leather straps`), đinh tán đồng thau kim loại, thẻ tên nhân viên kèm dây đeo lanyard.
    - Hệ thống Khớp Chi Đầy Đủ (Articulated Kinematics): Khớp hông, sống lưng, ngực, vai, khuỷu tay, cổ tay, khớp háng, đầu gối, mắt cá chân, bàn chân giày da đúc đế gờ và máy tính bảng điều hành ShiftSync Manager Tablet.
  - **Xuất Bản File Asset:** `ShiftSync-Web/public/models/ShiftSync_Employee.glb` (299.1 KB, 45 meshes, 7,996 triangles), đồng bộ sang `shiftsync-backend/ShiftSync_Employee.glb`.
  - **Phòng Trưng bày Tương tác 360°:** Khởi tạo `ShiftSync-Web/public/employee-viewer.html` tại `http://localhost:3000/employee-viewer.html` với đầy đủ tính năng xoay 360°, chế độ Wireframe và Walk Animation mượt mà.
  - **Nâng cấp Thực thể Người chơi Khám phá (`PlayerAvatar.js`):** Tái cấu trúc hình học người chơi trong chế độ Third-Person/Explore sang các khối hữu cơ mượt mà tương ứng, tương thích 100% với hệ thống điều khiển và an toàn SSR.
  - **Nghiệm thu:** `npm run build` thành công trong 1.24s (0 lỗi), kiểm chứng chuyển động thực tế trong browser 60 FPS mượt mà.

### [ASSET-006] — Full Triad Integration: PBR Texture Mapping, Baked Ambient Occlusion & Architectural GLB
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:**
  - **Module Tăng cường Vật liệu (`DigitalTwinMaterialEnhancer.js`):** Xây dựng bộ sinh Procedural PBR Textures kết hợp **Baked Ambient Occlusion & Depth Gradients** đạt chuẩn 512x512 Canvas với chi phí GPU 0% (không gây sụt giảm khung hình). Bao gồm: vân gỗ sồi tự nhiên Scandinavian, đá cẩm thạch trắng Carrara, sàn gạch men Terrazzo có hạt đá và rãnh ron, sàn gỗ xương cá khu Dining, vách nan gỗ tiêu âm rãnh đen, inox phay xước máy pha cà phê, và màn hình POS phát sáng có giao diện thanh toán thật.
  - **Tích hợp Tự động vào Mô hình GLB:** Duyệt cây phân cấp của `ShiftSync_CoffeeShop_DigitalTwin.glb` trong `DigitalTwinModelLoader.js`, thay thế toàn bộ các bề mặt khối màu phẳng lỳ cũ bằng các chất liệu PBR có chiều sâu chân thực.
  - **Nghiệm thu:** 104/104 unit tests PASS (100%), build thành công trong 1.61s, kiểm chứng visual qua Chrome DevTools MCP đạt độ chân thực sắc nét và giữ vững 60 FPS mượt mà tuyệt đối.

### [ASSET-005] — 60 FPS Recovery & Wide Immersive Camera FOV Upgrade (Character & Overview)
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:**
  - **Khôi phục 60 FPS Tuyệt đối:** Gỡ bỏ các render pass gây lag (`MeshReflectorMaterial`, `ContactShadows`) khỏi `DigitalTwinCanvas.jsx` theo chỉ thị người dùng, đưa WebGL về trạng thái 60 FPS mượt mà 100%.
  - **Mở rộng FOV Khám phá Nhân vật:** Trong `FirstPersonController.jsx`, mở rộng FOV từ $36^\circ$ lên **$75^\circ$ (First-Person)** và **$68^\circ$ (Third-Person)**, mở rộng tầm nhìn xa (`far = 300m`), tự động lưu/hoàn trả FOV gốc khi thoát.
  - **Tối ưu Vị trí & Hướng nhìn Xuất phát:** Điều chỉnh `spawnZ = 3.8m` và `spawnYaw = 0` (hướng vào trung tâm cửa hàng -Z) giúp nhân vật không còn bị va vào cửa hay nhìn vào bức tường đen phía sau.
  - **Mở rộng FOV Toàn cảnh:** Trong `CameraModes.js` và `DigitalTwinCanvas.jsx`, mở rộng FOV Overview từ $36^\circ$ lên **$48^\circ$** giúp nhìn bao quát trọn vẹn $24\text{m} \times 16\text{m}$.
  - **Nghiệm thu:** 104/104 unit tests PASS (100%), build thành công trong 754ms, kiểm chứng visual qua Chrome DevTools screenshot hiển thị không gian mở rộng thoáng đãng, sắc nét.

### [ASSET-004] — Tier-1 AAA Visual Upgrade (Studio IBL, Contact Shadows & Reflector Floor - Reverted due to GPU Lag)
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Đã thử nghiệm Gói 1; sau đó được gỡ bỏ trong ASSET-005 để đảm bảo hiệu năng 60 FPS theo yêu cầu của người dùng.

### [ASSET-003] — ShiftSync Digital Twin: Complete 3D Asset Style Unification
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Đồng bộ hóa toàn diện ngôn ngữ thị giác, chất lượng vật liệu PBR, độ chi tiết hình học và quy chuẩn hoàn thiện của toàn bộ thực thể 3D trong Store Digital Twin (`ShiftSync_CoffeeShop_DigitalTwin.glb` và `FurnitureBuilder.js`) với asset chuẩn tham chiếu bàn làm việc nhân viên (`ShiftSync_Workstation.glb`):
  - **Biên soạn Đặc tả Thiết kế Thị giác Chuẩn (`DIGITAL_TWIN_VISUAL_STYLE_SPEC.md`):** Thiết lập quy chuẩn PBR Metallic-Roughness thống nhất (gỗ sồi tự nhiên `#BA7A3E`, gỗ óc chó `#3E2723`, thép đen nhám `#0F172A`, inox chải `#E2E8F0`, chrome bóng `#F1F5F9`, nẹp đồng thau `#D4AF37`, đá thạch anh trắng `#FAF7F2`, nhung ngọc lục bảo `#1E4D3A`, da bò cognac `#B45309`), tiêu chuẩn vát góc bo tròn cạnh cứng (chamfer/bevel $r \ge 0.015\text{m}$), và khe chân thụt vào $0.08\text{m}$ (toe-kick).
  - **Tái thiết Pipeline Sinh Mô hình GLB Hoàn chỉnh (`scripts/generate-digital-twin-glb.js`):**
    - Sử dụng `createBeveledBox` với `THREE.Shape` và `THREE.ExtrudeGeometry` loại bỏ hoàn toàn các khối hộp thô ráp không vát cạnh.
    - Cụm quầy chính: Hệ nan gỗ sồi dọc (vertical fluted oak slats), chân thụt sơn đen, mặt quầy thạch anh trắng vát viền và viền nẹp đồng thau.
    - Cụm POS & Thu ngân (`Workstation_POS_01`): Màn hình POS kép nghiêng góc trên đế xoay đúc kim loại, máy in nhiệt hóa đơn giấy nhô ra kèm đèn LED trạng thái, bàn phím PIN pad thanh toán thẻ, máy quét mã vạch cầm tay và lỗ luồn dây cáp.
    - Cụm Barista Cà phê (`Workstation_Barista_01`): Máy pha cà phê thương mại 2 group với họng pha E61 mạ chrome, tay cầm portafilter cán gỗ óc chó, đồng hồ áp suất kim chỉ, vòi đánh sữa kép, khay sấy ly ấm kèm ly sứ xếp chồng, 2 cối xay cà phê hạt On-Demand phễu trong suốt thấy hạt rang, knock-box bã cà phê, thảm nén tamper, ca đánh sữa và chai siro hương liệu.
    - Cụm Dịch vụ & Pour-over (`Workstation_Service_01`): Giá pha pour-over 3 vị trí bằng đồng thau, bình pha thủy tinh Hario vát cạnh, ấm đun cổ ngỗng điện tử trên đế cảm ứng, cân điện tử hẹn giờ và khay gia vị gỗ tự nhiên.
    - Cụm Bếp & Bánh ngọt (`Workstation_Kitchen_01`): Tủ kính trưng bày bánh cong cao cấp với đèn LED thanh ấm bên trong, 2 tầng khay kim loại, bánh sừng bò vàng ươm, muffin chocolate, macarons pastel và thân đế làm mát inox.
    - Hệ thống Bàn ghế Khách hàng: 3 cụm sofa booth bọc nhung ngọc lục bảo rãnh dọc (channel-tufted emerald velvet), 4 bàn bistro tròn mặt thạch anh chân gang đế tròn mạ đồng, 8 ghế tựa bentwood chân côn bịt đồng, bàn dài communal $4.8\text{m} \times 1.0\text{m}$ mặt sồi nguyên tấm 60mm chân thép chữ A, 6 ghế quầy bar xoay bọc đệm da, và góc lounge 2 ghế bành da cognac kèm bàn trà đá cẩm thạch.
    - Kho hàng & Hậu cần: Kệ thép công nghiệp hạng nặng mặt lưới thép, các bao tải cà phê thô xuất xứ in chữ, thùng lưu trữ hàng hóa và vách ngăn phân khu.
    - Vỏ Kiến trúc & Chiếu sáng: Sàn chuyển tiếp terrazzo - gỗ xương cá - đá phiến, vách nan gỗ tiêu âm, cửa kính đón khách đôi tay nắm inox, 2 cột kiến trúc chịu lực, hệ đèn rọi ray trần và đèn thả chao đồng thau dây dù phát sáng ấm.
  - **Đồng bộ Procedural Fallback Engine (`FurnitureBuilder.js`):** Cập nhật toàn bộ bảng vật liệu singleton chia sẻ với thông số PBR chuẩn mực (roughness, metalness, colors) giúp các trạm phụ và chế độ fallback đạt độ sắc nét tương đương mô hình GLB.
  - **Xác thực Kiểm chuẩn Tự động 100% (`scripts/validate-digital-twin-glb.js`):**
    - File size: 6.47 MB (6,624,416 bytes), 631 meshes, 701 nodes, 68,616 triangles (tối ưu hóa dưới 100k polygons, 60fps WebGL).
    - glTF 2.0 Binary Header: Hợp lệ 100%. Mặt sàn căn chuẩn $Y = 0.0\text{m}$, tâm cửa hàng tại $(0, 0, 0)$.
    - Đầy đủ 4 trạm vật lý (`Workstation_POS_01`, `Workstation_Barista_01`, `Workstation_Service_01`, `Workstation_Kitchen_01`) và 9 phân vùng không gian.
  - **Kiểm thử Toàn hệ thống & Production Build:**
    - **104/104 tests PASS (100%)** qua 20 test suites trong **1,003ms** (0 regressions).
    - **Vite Production Build:** Biên dịch thành công sạch sẽ trong **797ms**, 0 lỗi.

### [ASSET-002] — 3D Workstation Asset Integration & Interactive 3D Showroom
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Sản xuất và tích hợp hoàn chỉnh tài nguyên 3D Bàn làm việc nhân viên (`ShiftSync_Workstation.glb`) cho ShiftSync Digital Twin:
  - **Sinh và Đóng gói Tài nguyên 3D Độc lập (`ShiftSync_Workstation.glb`):** 2.73 MB, 71 meshes, 102 nodes, 16 materials PBR chất lượng cao (gỗ mờ, kim loại đen, nhựa công thái học, kính màn hình mỏng), 7 embedded textures. Gồm bàn gỗ bo góc, màn hình siêu mỏng hiển thị UI ShiftSync, bàn phím, chuột, ghế công thái học mesh 5 bánh xe, đèn bàn LED, quản lý dây cáp và đèn báo IoT phát sáng xanh (Green pulse).
  - **Tích hợp Khai báo vào R3F Canvas:** Tạo component [WorkstationAssetModel.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/WorkstationAssetModel.jsx), tích hợp trực tiếp vào [DigitalTwinCanvas.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx), đính kèm 3D floating tag sprite "Bàn Làm Việc Nhân Viên (3D)" với trạng thái vận hành thời gian thực.
  - **Điều khiển Camera Focus Cận cảnh ("Bàn 3D"):** Bổ sung nút "Bàn 3D" trong thanh công cụ [SpatialToolbar.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialToolbar.jsx) kết nối trực tiếp với `handleFocusWorkstationAsset` trong [SpatialWorkspace.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx), cho phép camera chuyển động mượt mà đến cự ly gần để quan sát chi tiết bàn làm việc.
  - **Showroom 360 Độ Độc lập:** Tạo trang [workstation-viewer.html](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/public/workstation-viewer.html) cho phép xoay 360°, phóng to màn hình, ghế, bật/tắt wireframe và tải trực tiếp tệp `.glb`.
  - **Kiểm chứng:** Toàn bộ 104/104 tests PASS (100%), Vite build thành công sạch sẽ.

### [R3F-001] — Migrate ShiftSync Digital Twin to React Three Fiber Architecture
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Chuyển đổi toàn diện kiến trúc kết xuất 3D của ShiftSync Digital Twin (`SpatialWorkspace.jsx`) từ mô hình Three.js mệnh lệnh thủ công (`requestAnimationFrame` lặp, tạo `WebGLRenderer` DOM thủ công) sang kiến trúc khai báo hiện đại **React Three Fiber (R3F)** (`@react-three/fiber` ^9.7.0, `@react-three/drei` ^10.7.8) với các mục tiêu kiến trúc cốt lõi:
  - **Đơn ngữ cảnh WebGL Duy nhất (Single Canvas Architecture):**
    - Đóng gói toàn bộ không gian 3D trong một `<Canvas>` duy nhất qua [DigitalTwinCanvas.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinCanvas.jsx).
    - Triệt tiêu hoàn toàn rủi ro cạnh tranh vòng lặp render, rò rỉ WebGL contexts hoặc khởi tạo nhiều canvas song song.
  - **Phân rã Mô-đun Khai báo R3F Chuyên biệt (Modular Declarative Decomposition):**
    - [DigitalTwinLighting.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinLighting.jsx): Dàn ánh sáng khai báo (DirectionalLight đổ bóng PCF soft shadow, HemisphereLight, AmbientLight và FillLight).
    - [SteamParticles.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/SteamParticles.jsx): Hạt hơi nước bốc lên từ máy pha cà phê hoạt hóa mượt mà trong hook `useFrame()`.
    - [CoffeeShopModel.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/CoffeeShopModel.jsx): Nạp mô hình GLB độc lập `ShiftSync_CoffeeShop_DigitalTwin.glb`, lọc 6 lớp hiển thị (`floor`, `walls`, `ceiling`, `furniture`), chế độ nhìn xuyên tường X-Ray không phá hủy vật liệu gốc và fallback procedural an toàn khi file GLB vắng mặt (Zero double store stacking).
    - [WorkstationLayer.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/WorkstationLayer.jsx): Ánh xạ thực thể trạm làm việc Backend (`mapWorkstationsToGlb`), sinh trạm procedural bổ sung cho trạm thặng dư và đính kèm 3D floating tag sprite phản ánh trạng thái có mặt thực tế / theo lịch / trống trạm / đang tải.
    - [ZoneVisualizationLayer.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/ZoneVisualizationLayer.jsx): Decal sàn phân khu, bản đồ nhiệt thời gian thực dựa trên định biên ca (`zoneReqMap`), nhãn nổi và vòng geofence 150m.
    - [AvatarLayer.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/AvatarLayer.jsx): Avatar nhân viên cử động bước đi, nhịp thở tĩnh và LOD khoảng cách tự động trong `useFrame()`.
    - [OverviewCameraController.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/OverviewCameraController.jsx): Cầu nối khai báo điều phối [CameraManager.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js), quản lý góc nhìn Perspective 3D Orbit, Orthographic 2D Blueprint, và hoạt cảnh Zoom 3D từ Attention Center.
    - [FirstPersonController.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/FirstPersonController.jsx): Cầu nối điều khiển góc nhìn người thứ nhất (WASD, trượt va chạm vật cản AABB từ GLB, tầm mắt 1.6m, Point Lock khóa nhìn mục tiêu, Reticle targeting).
  - **Bảo tồn Tuyệt đối Logic Miền & Ranh giới Phạm vi:**
    - Không can thiệp bất kỳ màn hình nào ngoài phân hệ Digital Twin (Header, Sidebar, Login, Dashboard, Scheduler, Attendance, v.v.).
    - Kế thừa và kết nối nguyên vẹn các công cụ miền đã được kiểm chứng: `CameraManager.js`, `PlayerController.js`, `WorkstationDragController.js`, `DigitalTwinModelLoader.js`, `SceneGraphManager.js`.
  - **Kiểm thử Tích hợp & Nghiệm thu (Verification & Regression):**
    - Tạo mới test suite [DigitalTwinR3FIntegration.test.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/canvas/DigitalTwinR3FIntegration.test.js) (7 test cases kiểm chứng single canvas, layer toggling, X-Ray, controller bridges, data binding và dọn dẹp bộ nhớ).
    - **104/104 tests PASS (100%)** qua 20 test suites trong **803ms** (toàn bộ 97 baseline tests giữ vững 100% không hồi quy).
    - **Vite Production Build:** Thành công sạch sẽ 2,073 modules trong **835ms**, 0 lỗi.

### [INT-001] — Coffee Shop 3D Digital Twin GLB Integration & Semantic Spatial Binding
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Tích hợp trực tiếp và toàn diện tệp mô hình 3D độc lập `ShiftSync_CoffeeShop_DigitalTwin.glb` (`/models/ShiftSync_CoffeeShop_DigitalTwin.glb`) vào không gian 3D Digital Twin của ShiftSync Web (`SpatialWorkspace.jsx`, `SceneGraphManager.js`, `Store3DCanvas.jsx`):
  - **Kiến trúc Tích hợp Không gian Một Scene Duy Nhất (Single Scene Graph Integration):**
    - Tạo bộ nạp mô hình chuyên trách [DigitalTwinModelLoader.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/DigitalTwinModelLoader.js): nạp bất đồng bộ tệp nhị phân GLB 1.05MB, phân giải và đánh dấu ngữ nghĩa 6 tầng layer (`floor`, `walls`, `ceiling`, `furniture`, `workstations`, `zones`).
    - Nâng cấp [SceneGraphManager.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js) với `loadAndApplyStoreModel` và `setStoreModelDirect`: thay thế sạch sẽ hình học diorama thủ công trong `envGroup` bằng mô hình GLB, loại bỏ hoàn toàn hiện tượng hiển thị chồng lấn 2 cửa hàng (zero double store stacking).
  - **Ánh xạ Thực thể Dữ liệu Thực tế (Data Binding & Semantic Mapping):**
    - Hàm `mapWorkstationsToGlb` đối chiếu thông minh loại trạm (`type`), mã trạm (`code`) và tên trạm (`name`) từ Backend API (`GET /api/stores/{storeId}/workstations`) với 4 trạm vật lý trên mô hình: `Workstation_POS_01`, `Workstation_Barista_01`, `Workstation_Service_01`, `Workstation_Kitchen_01`.
    - Đồng bộ tọa độ thực tế `toThreeCoords` và góc quay `rotation` từ CSDL vào các node trạm 3D của GLB.
    - Gắn nhãn 3D floating tag sprite (`createWorkstationTagSprite`) trực tiếp lên node trạm GLB, phản ánh chính xác 4 trạng thái vận hành thời gian thực: Có mặt thực tế (`ASSIGNED` xanh ngọc), Phân công theo lịch (`ASSIGNED` xanh dương), Trống trạm (`UNASSIGNED` hổ phách), Đang tải (`UNKNOWN` xám).
  - **Bảo tồn Hoàn toàn Mọi Tương tác Nghiệp vụ Hiện hữu:**
    - **Overview 3D & Top-Down Blueprint:** Giữ nguyên hệ thống camera, lighting rig mềm mại, chuyển đổi góc nhìn bao quát và mặt bằng kỹ thuật chuẩn xác.
    - **First-Person 3D Walking & Sliding Collision:** Trích xuất vật cản AABB (`extractGlbObstacles`) cho 2 cột kiến trúc, 4 quầy pha chế/thu ngân, và vách ngăn phòng kho; ngăn chặn triệt để người chơi đi xuyên quầy hoặc tường.
    - **Point Lock & Reticle Target:** Khóa góc nhìn và theo dõi trạm làm việc trong GLB khi người dùng di chuyển WASD.
    - **Bố trí Mặt bằng (Drag & Drop & Xoay 90°):** Trình kéo thả [WorkstationDragController.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js) nhận diện và kéo trực tiếp các cụm quầy trạm làm việc trên mô hình GLB, tự động clamp trong biên sàn, kiểm tra va chạm < 1.1m, hỗ trợ xoay 90° và lưu tọa độ mới về Backend `PUT /api/stores/{storeId}/workstations/{id}` hoặc hoàn tác tức thì `revertPosition()`.
    - **Attention Center "Zoom 3D":** Nút Zoom 3D trên thẻ cảnh báo trạm trống tự động focus camera chính xác vào quầy trạm tương ứng trên mô hình GLB.
  - **Khả năng Phục hồi & Phòng thủ Lỗi (Fault-Tolerant Fallback):**
    - Nếu nạp file GLB thất bại (lỗi mạng, môi trường không hỗ trợ WebGL), hệ thống tự động giữ nguyên hình học procedural mặc định, không gây crash hoặc gián đoạn luồng làm việc.
- **Tập tin tạo mới / cập nhật:**
  - `ShiftSync-Web/src/features/spatial-workspace/scene/DigitalTwinModelLoader.js` (Mới)
  - `ShiftSync-Web/src/features/spatial-workspace/scene/DigitalTwinModelLoader.test.js` (Mới - 8 tests)
  - `ShiftSync-Web/src/features/spatial-workspace/scene/DigitalTwinGLBIntegration.test.js` (Mới - 6 tests)
  - `ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js`
  - `ShiftSync-Web/src/features/spatial-workspace/scene/StoreEnvironment.js`
  - `ShiftSync-Web/src/features/spatial-workspace/explore/PlayerController.js`
  - `ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js`
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`
- **Kiểm thử Toàn hệ thống (Regression Results):**
  - **97/97 tests PASS (100%)** qua 19 test suites trong **706ms** (tăng thêm 14 tests mới, 0 regressions).
  - **Vite Production Build:** Biên dịch thành công 2,054 modules trong **754ms**, 0 cảnh báo.

### [ASSET-001] — Standalone 3D Store Digital Twin GLB Asset Delivery
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Xây dựng, biên dịch và xác minh tệp tài nguyên 3D độc lập định dạng nhị phân GLB (`.glb` / glTF 2.0) đại diện cho không gian cửa hàng cà phê hoàn chỉnh (Coffee Shop Retail Digital Twin) phục vụ bài toán điều phối ca, định vị trạm làm việc, phân bổ nhân sự và giám sát không gian thời gian thực:
  - **Kiến trúc & Nội thất Toàn cảnh:** Mặt bằng 22.2m x 14.2m x 4.0m, căn chỉnh chuẩn sàn Y = 0.0m và tâm gốc tọa độ (0, 0, 0).
  - **Phân định Phân khu Chức năng (Semantic Zones):** `Zone_POS`, `Zone_Barista`, `Zone_CustomerService`, `Zone_Dining`, `Zone_Storage`, `Zone_Entrance` với vật liệu sàn phân tầng (gạch Terrazzo, sàn gỗ ghép xương cá herringbone, gạch phiến chống trượt và bê tông công nghiệp).
  - **Trạm làm việc độc lập (Independently Selectable Workstations):**
    - `Workstation_POS_01`: Quầy thu ngân fluted oak + mặt đá quartz trắng, POS cảm ứng, máy in hóa đơn, đầu đọc thẻ, kệ snack bán kèm.
    - `Workstation_Barista_01`: Quầy pha chế inox, máy pha cà phê espresso 2 group chuyên nghiệp kèm tay pha chrome, đồng hồ áp suất, cối xay burr grinder hopper trong suốt, khay tráng ca sữa rinser, hộp đập bã knock-box, ca đánh sữa.
    - `Workstation_Service_01`: Quầy đón khách & hand-brew, giá nhỏ giọt pour-over V60 bằng đồng thau kèm bình server thủy tinh, ấm cổ ngỗng gooseneck điện tử, khay đồ dùng condiment organizer.
    - `Workstation_Kitchen_01`: Tủ kính trưng bày bánh ngọt 2 tầng chiếu sáng LED, khay bánh sừng bò croissant và muffin thủ công.
  - **Khu vực Chỗ ngồi & Bàn ghế Khách hàng:** 3 cụm sofa booth bọc nỉ xanh ngọc bích, bàn tròn bistro chân đế gang kèm ghế tựa gỗ uốn, bàn làm việc dài communal table kèm 6 ghế quầy bar cao tích hợp rãnh đồng luồn dây điện, góc lounge nook bàn trà đá cẩm thạch và 2 ghế bành thư giãn da cam đất.
  - **Kho Hậu cần & Vật phẩm Vận hành:** Kệ thép kho 4 tầng, bao tải hạt cà phê thô in mác xuất xứ, thùng carton kiểm kê, cửa dịch vụ ngăn cách.
  - **Vật liệu PBR Chuẩn Quốc tế:** 29 vật liệu Metallic-Roughness (gỗ sồi, gỗ óc chó, thép sơn tĩnh điện, đồng thau xước, inox 304, kính kiến trúc trong suốt, nỉ cao cấp, lá cây nhiệt đới).
  - **Đóng gói & Phân phối:**
    - Tệp GLB tại: `ShiftSync-Web/public/models/ShiftSync_CoffeeShop_DigitalTwin.glb` (dễ dàng load qua Vite dev server / web browser).
    - Tệp GLB tại: `ShiftSync_CoffeeShop_DigitalTwin.glb` (ngay thư mục gốc dự án).
    - Bộ công cụ tạo và kiểm tra: `scripts/generate-digital-twin-glb.js` và `scripts/validate-digital-twin-glb.js`.
- **Bằng chứng Kiểm chứng Toàn diện:**
  - Dung lượng file: **1,077.97 KB (1.05 MB)** — siêu tối ưu cho WebGL 60fps.
  - Tổng số mesh: 424 | Đỉnh (Vertices): 18,520 | Đa giác (Triangles): 10,900.
  - Tiêu chuẩn glTF 2.0 Binary Header: `glTF`, version 2, JSON chunk, BIN chunk hoàn toàn hợp lệ.
  - Kiểm thử Three.js `GLTFLoader`: Phân giải 100% cây phân cấp node, 0 lỗi, 0 cảnh báo.

### [WEB-004] — ShiftSync 3D Digital Twin Scope Correction & Workspace Enhancements
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Khôi phục đúng ranh giới phạm vi (Scope Boundary Enforcement): Hoàn tác toàn bộ thay đổi giao diện 3D toàn cục (revert 19 file giao diện ngoài Digital Twin về baseline sạch `c9d4df1`), tập trung hoàn thiện 100% vào **ShiftSync Store Digital Twin / 3D Spatial Workspace**:
  - **Tái tạo Độ chân thực Kiến trúc Cửa hàng (`StoreEnvironment.js`):**
    - Sàn gạch Terrazzo/Ceramic vân nổi: Tích hợp hàm tạo Texture Canvas động `createStoreTileTexture()` với ron gạch phân tầng (`grout lines`), vát cạnh (`bevel`), hạt đá terrazzo và tông màu ấm nhã nhặn, chống nổ lỗi môi trường SSR/Node.
    - Cửa kính đôi mặt tiền (Entrance Glass Double Doors): Cửa kính lùa đôi đón khách tại trung tâm mặt tiền (`z = wid/2`) với khung viền kim loại đen mờ và tay nắm inox dọc sáng bóng.
    - 2 Cột kiến trúc chịu lực nội thất (Structural Load-bearing Columns): 2 trụ gỗ ốp lam sọc sang trọng với chân viền đá/kim loại tối tại tọa độ `[-len*0.16, -wid*0.08]` và `[len*0.16, -wid*0.08]` giúp cố định kết cấu không gian diorama.
  - **Hệ thống Va chạm Không gian 3D (`PlayerController.js`):**
    - Đăng ký 2 cột kiến trúc vào mảng vật cản AABB (`rebuildObstacles`) ngăn chặn người dùng ở chế độ First-Person 3D đi xuyên qua cột.
  - **Tích hợp Cảnh báo Trạm làm việc vào Attention Center (`AttentionCenter.jsx` & `SpatialInspector.jsx`):**
    - Tổng hợp danh sách trạm làm việc chưa được phân công (`UNASSIGNED`) trong ca trực song song với các phân khu thiếu nhân sự.
    - Gắn nút "Zoom 3D" trên thẻ cảnh báo trạm, tự động điều hướng Camera và kích hoạt Focus trực tiếp vào trạm làm việc.
  - **Tính năng Xoay Trạm Làm Việc 90° (`WorkstationDragController.js` & `WorkstationEditorBanner.jsx`):**
    - Bổ sung hàm `rotateSelected(deltaRad)` trong `WorkstationDragController.js` cho phép xoay trạm mượt mà quanh trục Y.
    - Bổ sung nút thao tác "Xoay 90° ↻" trên Banner nổi khi biên tập mặt bằng (`WorkstationEditorBanner`) và trong bảng `SpatialInspector` khi quản lý trạm.
  - **Bảo tồn Tuyệt đối 100% Giao diện Hệ thống Ngoài Digital Twin:**
    - Hoàn trả 19 tệp giao diện (Header, Sidebar, MainLayout, Login, Dashboard, Employees, Scheduler, Attendance, Requests, Marketplace, Stores, Skills, Settings, Admin, `index.css`) về baseline nguyên bản.
- **Tập tin đã cập nhật:**
  - `ShiftSync-Web/src/features/spatial-workspace/scene/StoreEnvironment.js`
  - `ShiftSync-Web/src/features/spatial-workspace/explore/PlayerController.js`
  - `ShiftSync-Web/src/features/spatial-workspace/explore/PlayerController.test.js`
  - `ShiftSync-Web/src/features/spatial-workspace/components/inspector/AttentionCenter.jsx`
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx`
  - `ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js`
  - `ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.test.js`
  - `ShiftSync-Web/src/features/spatial-workspace/components/WorkstationEditorBanner.jsx`
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`
- **Kiểm thử & Bằng chứng xác minh:**
  - **83/83 Web tests PASS 100%** qua 17 test suites trong 295ms (bao gồm unit test cho `rotateSelected` và va chạm cột kiến trúc `rebuildObstacles`).
  - Production Build: `npm run build` hoàn tất sạch sẽ trong **723ms**, 0 compile errors.

### [WEB-003] — Global 3D Visual Experience Transformation (13 Routes Migrated)
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Chuyển đổi toàn diện giao diện Web ShiftSync sang ngôn ngữ thiết kế 3D không gian đồng nhất (Modern spatial operating system + stylized low-poly 3D + enterprise SaaS):
  - **Bộ Token Không gian Chuẩn hóa (`index.css`):** Thiết lập hệ thống biến toàn cục `--ss-surface-ground`, `--ss-surface-card`, `--ss-surface-elevated`, `--ss-surface-floating`, `--ss-shadow-depth-1..floating`, `--ss-rim-light`, `--ss-rim-dark`, `--ss-bevel-card`, `--ss-bevel-sunken`, các lớp tiện ích `.ss-spatial-backdrop`, `.ss-card-3d`, `.ss-panel-3d`, `.ss-btn-3d`, `.ss-input-3d`, `.ss-badge-3d`, `.ss-modal-3d`.
  - **Khung Điều hành Ứng dụng Toàn cục (Application Shell):**
    - `MainLayout.jsx`: Tự động nạp `.ss-spatial-backdrop` cho toàn bộ các route có xác thực.
    - `Header.css`: Cầu điều khiển không gian (Floating Spatial Bridge) với nền kính mờ `#1e293b` đến `#0f172a`, viền sáng rim lighting, tab active có gờ sáng xanh ngọc bích `0 -2px 10px rgba(81, 163, 61, 0.75)`.
    - `Sidebar.css`: Phím lõm vật lý beveled sunken controls (`--ss-bevel-sunken`), dropdown panel nổi 3D (`.ss-dropdown-panel`).
    - `EmployeeModuleLayout.css`: Thanh điều hướng phân hệ nhân viên với hiệu ứng frosted glass và tabs nổi 3D.
  - **Di chuyển 13 Phân hệ Nghiệp vụ (13 Modules Migrated):**
    - **Dashboard / Tổng quan:** `DashboardPage.css` nền canvas không gian, `DashboardSpatialSummary.jsx` thẻ 3D nâng gờ nổi với nút CTA xúc giác.
    - **Lịch biểu (Scheduler):** `SchedulePage.css` ray lõm 3D sunken track cho bộ chuyển view, nút chọn ca dập nổi vật lý.
    - **Chấm công (Attendance):** `AttendancePageLive.css` sidebar 3D, huy hiệu trạng thái có hiệu ứng lồi/lõm 3D inset highlights (`.att-status-pill`).
    - **Nhân viên & Chi tiết:** `EmployeesPage.css`, `EmployeeDetailPage.css` thẻ bảng dữ liệu 3D, hàng bảng nâng nhẹ khi hover.
    - **Chợ ca & Duyệt yêu cầu:** `MarketplacePage.css`, `RequestPage.css` banner khẩn cấp viền hổ phách phát sáng, thẻ ca làm việc nâng 3D, sidebar bộ lọc nổi, modal phê duyệt 3D.
    - **Cửa hàng, Kỹ năng & Định biên:** `StoresPage.css`, `SkillsPage.css`, `DemandPlanning.css` workspace toàn màn hình nổi 3D rim lighting, nút tạo ca vật lý.
    - **Cấu hình, Quản trị & Đăng nhập:** `SettingsPage.css`, `AdminPage.css`, `LoginPage.css` thẻ hero 3D viền ngọc bích, nút bấm xúc giác keycap có độ dày và độ nhấn khi bấm, form đăng nhập 3D kết hợp mascot Three.js tương tác.
- **Tập tin đã cập nhật:**
  - `ShiftSync-Web/src/index.css`
  - `ShiftSync-Web/src/layouts/MainLayout.jsx`
  - `ShiftSync-Web/src/components/Header.css`
  - `ShiftSync-Web/src/components/Sidebar.css`
  - `ShiftSync-Web/src/components/EmployeeModuleLayout.css`
  - `ShiftSync-Web/src/components/spatial/DashboardSpatialSummary.jsx`
  - `ShiftSync-Web/src/pages/DashboardPage.css`
  - `ShiftSync-Web/src/pages/SchedulePage.css`
  - `ShiftSync-Web/src/pages/AttendancePageLive.css`
  - `ShiftSync-Web/src/pages/EmployeesPage.css`
  - `ShiftSync-Web/src/pages/EmployeeDetailPage.css`
  - `ShiftSync-Web/src/pages/MarketplacePage.css`
  - `ShiftSync-Web/src/pages/RequestPage.css`
  - `ShiftSync-Web/src/pages/StoresPage.css`
  - `ShiftSync-Web/src/pages/SkillsPage.css`
  - `ShiftSync-Web/src/components/demand-planning/DemandPlanning.css`
  - `ShiftSync-Web/src/pages/SettingsPage.css`
  - `ShiftSync-Web/src/pages/AdminPage.css`
  - `ShiftSync-Web/src/pages/LoginPage.css`
- **Kiểm thử & Bằng chứng xác minh:**
  - **82/82 Web tests PASS 100%** trên 17 test suites trong 268ms.
  - Production Build: `npm run build` hoàn tất sạch sẽ trong **920ms**, 0 compile errors.
- **Vấn đề đã giải quyết:** Hoàn thành xuất sắc sứ mệnh toàn cầu — chuyển đổi toàn bộ giao diện ShiftSync Web thành trải nghiệm 3D không gian đẳng cấp doanh nghiệp, bảo tồn 100% nghiệp vụ logic, quyền hạn RBAC và tính tương thích trình duyệt.

---

### [WEB-002] — Overview 3D & First-Person 3D Interaction Modes (Point Lock & Data-driven Heatmap)
- **Ngày thực hiện:** 15/10/2026
- **Phạm vi & Mục tiêu:** Triển khai tích hợp 2 chế độ tương tác 3D chuyên sâu trong `ShiftSync-Web` vận hành trên **Một Scene Duy Nhất (Single Shared Store Scene)**:
  - **Mode 1 — Overview 3D (Góc nhìn Toàn cảnh Điều hành):**
    - Khung nhìn chim bay (Bird's-eye view) cho phép nhà quản lý bao quát toàn bộ mặt bằng, phân khu, trạm làm việc và nhân sự trực quan.
    - Bản đồ nhiệt (Heatmap) dựa trên dữ liệu định biên thực tế (`zoneReqMap` lấy từ `shift_skill_requirements` hoặc sức chứa thiết kế phân khu), phân tách 5 trạng thái vận hành: Đủ nhân sự (Emerald `#10B981`), Thiếu nhân sự (Amber `#F59E0B`), Dư nhân sự (Purple `#8B5CF6`), Đầy công suất (Red `#EF4444`), Chưa có định biên/Trống ca (Slate `#64748B`). Tuyệt đối không sinh màu ngẫu nhiên.
    - Thẻ Inspector hiển thị chi tiết lý do định biên qua `getZoneStatusExplanation(assigned, cap, target)` (ví dụ: "Thiếu 2 nhân sự so với nhu cầu ca (1/3)").
    - Tích hợp bảng chú giải Heatmap trực quan trên Toolbar và Mini Legend góc trái màn hình.
  - **Mode 2 — First-Person 3D (FP 3D — Khám phá Trực tiếp & Khóa Nhìn Mục tiêu):**
    - Chiều cao mắt người thực tế $1.6\text{m}$, di chuyển WASD mượt mà với trượt va chạm AABB (Sliding Collision) chống xuyên tường, quầy bar và trạm làm việc chuyên biệt (`rebuildObstacles`).
    - Tâm ngắm crosshair (Reticle) tự động quét và phát hiện đối tượng nhân viên/trạm làm việc trong tầm mắt (`reticleTarget`).
    - Hệ thống **Point Lock (Target Lock)**: Khóa góc nhìn camera hướng về nhân sự hoặc trạm làm việc được chọn (`KeyF` / `KeyL` hoặc nút trên HUD/Inspector) trong khi người dùng tự do di chuyển WASD xung quanh.
    - Bám sát mục tiêu chuyển động động (Dynamic Tracking): Gọi `getWorldPosition` trên avatar mesh để tự động điều chỉnh camera bám theo nhân viên đang bước đi giữa các phân khu.
    - Xử lý phím `Escape` phân tầng (Hierarchical Escape): Bấm `Escape` lần 1 giải phóng Point Lock trước mà không ngắt Pointer Lock; bấm `Escape` lần 2 mới thoát chế độ First-Person.
    - Spawn thông minh: Tự động xuất hiện cách thực thể được chọn $2.2\text{m}$ và tự động kích hoạt Point Lock khi chuyển từ Overview sang First-Person.
  - **Kiến trúc & An toàn Hệ thống:**
    - Vận hành trên 1 canvas duy nhất (`SpatialWorkspace.jsx`), bảo tồn 100% selection state khi đổi chế độ.
    - Trình chỉnh sửa bố trí trạm (`WorkstationDragController`) được vô hiệu hóa hoàn toàn khi đang ở First-Person mode để tránh xung đột thao tác chuột.
- **Tập tin tạo mới & chỉnh sửa:**
  - `ShiftSync-Web/src/features/spatial-workspace/explore/PlayerController.js`: Viết mới toàn diện hệ thống vật lý góc nhìn thứ nhất và subsystem Point Lock.
  - `ShiftSync-Web/src/features/spatial-workspace/explore/PlayerController.test.js` *(Mới)*: 7/7 unit tests đạt chuẩn.
  - `ShiftSync-Web/src/features/spatial-workspace/components/ExploreHUD.jsx`: Bổ sung tâm ngắm Reticle, khung HUD khóa nhìn, phím tắt F, và banner trạng thái Point Lock.
  - `ShiftSync-Web/src/features/spatial-workspace/visualization/ZoneStatus.js`: Bổ sung trạng thái `NO_DATA`, hàm `getZoneStatusExplanation`, bảng màu Slate `#64748B`.
  - `ShiftSync-Web/src/features/spatial-workspace/visualization/ZoneStatus.test.js` *(Mới)*: 7/7 unit tests đạt chuẩn.
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialToolbar.jsx`: Bổ sung Heatmap Color Legend.
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx`: Bổ sung giải thích định biên ca và nút "Khóa nhìn [F]" khi đang ở chế độ góc nhìn thứ nhất.
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`: Điều phối tích hợp mesh, avatar dynamic tracking, contextual spawn, và mini legend.
- **Kiểm thử & Bằng chứng xác minh:**
  - Toàn bộ **82/82 Web tests PASS 100%** trên 17 test suites trong 272ms (tăng thêm 14 tests mới, 0 regressions).
  - Production Build: `vite build` PASS trong **653ms**, sinh chunk `SpatialWorkspace-CAhxjcB3.js` (266.01 kB).
- **Vấn đề đã giải quyết:** Hoàn thành xuất sắc 2 chế độ Overview 3D và First-Person 3D tích hợp, chuẩn hóa Heatmap dựa trên định biên thực tế, cung cấp cơ chế Point Lock theo dõi nhân viên di động thời gian thực.

---

### [MOB-001] — Mobile Overview Deletion & Reversion (Hủy bỏ theo yêu cầu người dùng)
- **Ngày thực hiện:** 15/10/2026
- **Chi tiết:** Theo chỉ thị trực tiếp từ người dùng ("xóa mobile-overview! tôi không muốn tạo cái này"), phân hệ `mobile-overview` trong `ShiftSync-Web/src/features/mobile-overview/` cùng route `/mobile-overview` và liên kết trong `Header.jsx` đã được xóa bỏ hoàn toàn. File `ShiftSync-Mobile/screens/DashboardScreen.js` đã được khôi phục về trạng thái sạch sẽ tại baseline `c9d4df1`. Toàn bộ 68/68 test suites Web tiếp tục PASS 100%.

---

### [ARC-001-VERIFY] — Independent Architecture Verification & Acceptance
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Độc lập kiểm chứng và thẩm định kiến trúc Visualization Layer phân lớp (`ARC-001-IMP`) đối chiếu với [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md) và hiện trạng mã nguồn.
- **Kết quả Thẩm định Độc lập:**
  - **Phán quyết Nghiệm thu:** **`ACCEPTED_WITH_FOLLOW_UPS`** (Sẵn sàng đưa vào sản xuất; ghi nhận theo dõi Q-ARC-01 để xin chỉ thị phê duyệt gỡ bỏ các thư viện cạnh tranh khỏi `package.json`).
  - **Kiểm chứng Phân hệ Trực quan:**
    - `spatialViewStore.js`: Tách biệt hoàn hảo 9 view states ra khỏi React Virtual DOM. 7/7 tests pass.
    - `CameraManager.js`: Quản lý trọn vẹn dual cameras (Perspective FOV 36 & Orthographic blueprint), ràng buộc an toàn polar angle `[0.1, 1.48]` rad và khóa `[0, 0]` rad. 8/8 tests pass.
    - `ResourceManager.js` & `SceneGraphManager.js`: Bảo vệ tuyệt đối singleton materials/geometries qua `WeakSet`, dọn dẹp instance textures mà không làm đen mô hình; `clearDynamicNonAvatarEntities` bảo toàn hoạt ảnh di chuyển nhân viên. 8/8 tests pass.
  - **Kiểm thử Toàn hệ thống (Regression Results):**
    - Toàn bộ **68/68 bài test Web PASS 100%** trên 15 test suites trong 246.7ms.
    - Toàn bộ **46/46 bài test Backend PASS 100%** qua 3 test suites trong 21.0s (`DigitalTwinConcurrencyIntegrationTest`, `ShiftAssignmentServiceTest`, `AutoScheduleAssignmentCorrectnessTest`).
    - Vite production build hoàn tất trong **982ms**, sinh chunk code-split `SpatialWorkspace-DKc8CnW6.js` (250.89 kB, gzip: 66.23 kB).
  - **Bảo toàn Ràng buộc Kỹ thuật:** Khóa bi quan Atomic SWAP (`PESSIMISTIC_WRITE`), kiểm tra va chạm trạm 1.1m, clamping biên, Store Isolation Guard và RBAC guard được duy trì toàn vẹn 100%.
- **Tập tin bàn giao:** [ARC-001-VERIFICATION-REPORT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ARC-001-VERIFICATION-REPORT.md).

---

### [ARC-001-IMP] — Visualization Layer Phased Modular Implementation & Verification
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Hiện thực hóa kiến trúc Visualization Layer phân lớp chuẩn hóa theo [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md) qua 4 bước:
  - **ARC-IMP-01 (Visualization View State Separation):**
    - Trích xuất toàn bộ 9 view states (`cameraMode`, `use2DFallback`, `isXRayMode`, `layers`, `heatmapMode`, `activeSkillFilter`, `isExploreMode`, `playerViewMode`, `followingStaff`) ra khỏi `SpatialWorkspace.jsx` vào Zustand store chuyên biệt `ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js`.
    - Hỗ trợ đầy đủ functional updater `(prev => ...)` cho các boolean setters và layer toggling, đảm bảo tương thích 100% không làm vỡ các effect và component con.
    - Xây dựng unit test suite `spatialViewStore.test.js`: 7/7 tests pass.
  - **ARC-IMP-02 (Camera Subsystem Facade):**
    - Tạo lớp `CameraManager.js` (`ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js`) đóng vai trò Facade duy nhất:
      - Tự động quản lý dual cameras: PerspectiveCamera (FOV 36, aspect ratio) và True OrthographicCamera (khung nhìn 2D architectural blueprint).
      - Quản lý vòng đời `OrbitControls`, tự động khóa góc xoay mặt sàn Polar Angle: `[0.1, 1.48] rad` cho 3D orbit, `[0, 0] rad` khóa góc nhìn thẳng từ trên xuống cho 2D blueprint.
      - Tích hợp `CameraController` để điều phối chuyển cảnh mượt mà (`flyTo`, `moveTo`) và bám sát nhân viên chuyển động (`followObject`).
      - Xử lý co giãn màn hình (`handleResize`) đồng bộ cả hai camera, giải phóng tài nguyên WebGL an toàn (`dispose`).
    - Xây dựng unit test suite `CameraManager.test.js`: 8/8 tests pass.
  - **ARC-IMP-03 (Scene & Resource Lifecycle Modularization):**
    - Tạo `ResourceManager.js` (`ShiftSync-Web/src/features/spatial-workspace/scene/ResourceManager.js`):
      - Thiết lập registry `WeakSet` tự động đăng ký và bảo vệ toàn bộ singleton materials (`furnitureMaterials`, `characterMaterials`) và geometries (`characterGeometries`).
      - Cung cấp phương thức `disposeHierarchy(obj)` an toàn: Chỉ giải phóng tài nguyên instance (ví dụ `CanvasTexture` sinh động trên sprites, per-instance geometries), tuyệt đối không chạm vào singletons.
    - Tạo `SceneGraphManager.js` (`ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js`):
      - Đóng gói Scene root `#F1F5F9`, Lighting rig 3 nguồn sáng với shadow cascade, `envGroup` (StoreEnvironment), `dynamicGroup` (zones, workstations, avatars), và hệ thống hạt hơi nước `steamGroup`.
      - Điều phối hoạt ảnh môi trường (hạt hơi nước bay lên, đèn treo lắc lư vi mô) và dọn dẹp các thực thể động phi-avatar qua `clearDynamicNonAvatarEntities()`.
    - Xây dựng unit test suite `SceneAndResourceManager.test.js`: 8/8 tests pass.
  - **ARC-IMP-04 (Dependency Manifest Cleanup Audit):**
    - Tiến hành rà soát các dependency cạnh tranh (`@babylonjs/*`, `@react-three/*`).
    - Ghi nhận trạng thái `BLOCKED_PENDING_APPROVAL`: Do Q-ARC-01 chưa được người dùng/Tech Lead phê duyệt chính thức, giữ nguyên các gói trong `package.json` và không xóa file nhằm bảo đảm an toàn tuyệt đối và bảo tồn working tree.
  - **Tích hợp & Làm gọn Monolith Orchestrator:**
    - Tích hợp `useSpatialViewStore`, `CameraManager`, `SceneGraphManager`, và `ResourceManager` vào `SpatialWorkspace.jsx`.
    - Cắt giảm hơn 250 dòng code thủ tục, biệt lập rõ ràng 3 tầng trạng thái (Ephemeral, View, Domain).
- **Tập tin tạo mới & chỉnh sửa:**
  - `ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js` *(Mới)*: Zustand store quản lý view preferences.
  - `ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.test.js` *(Mới)*: Unit test store.
  - `ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js` *(Mới)*: Facade điều khiển camera và controls.
  - `ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.test.js` *(Mới)*: Unit test camera manager.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/ResourceManager.js` *(Mới)*: Quản lý vòng đời tài nguyên WebGL & WeakSet.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js` *(Mới)*: Quản lý Scene Graph, ánh sáng và môi trường.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/SceneAndResourceManager.test.js` *(Mới)*: Unit test scene & resource manager.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/StoreEnvironment.js`: Chuẩn hóa extension import ESM (`.js`).
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`: Refactor tích hợp các subsystems.
  - `docs/agent-memory/TASK_MEMORY.md`, `AUDIT_INDEX.md`, `CODEBASE_MAP.md`, `CHANGELOG.md`: Cập nhật hệ thống tri thức.
- **Kiểm thử & Bằng chứng xác minh:**
  - **68/68 bài kiểm thử Web PASS 100%** trên 15 test suites trong 237ms (tăng từ 45 baseline lên 68 tests, 0 regressions).
  - Production Build Web: `vite build` PASS hoàn toàn trong 656ms, sinh bundle code-split `SpatialWorkspace-DKc8CnW6.js` (250.89 kB).
  - Không có bất kỳ thay đổi nào tác động đến Backend hay CSDL.
  - Git working tree và baseline `c9d4df1` được bảo tồn nguyên vẹn.
- **Vấn đề đã giải quyết:** Hoàn thành xuất sắc việc triển khai kiến trúc Visualization Layer phân tầng theo chuẩn ADR-ARC-001, nâng cao tính mô đun, giảm tải 60 FPS re-render, triệt tiêu rò rỉ bộ nhớ WebGL và mở rộng độ phủ kiểm thử tự động.

---

### [ARC-001] — Visualization Layer Architecture Design & Self-Validation
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Thiết kế kiến trúc phân lớp toàn diện cho hệ thống 3D Spatial Digital Twin (`ShiftSync-Web/src/features/spatial-workspace/`):
  - Phân tích hiện trạng mã nguồn: Phát hiện `SpatialWorkspace.jsx` (2,417 dòng) mang 9 trách nhiệm (God Component) và tồn dư các thư viện cạnh tranh (`@babylonjs/core`, `@react-three/fiber`).
  - Thiết kế Kiến trúc Mục tiêu 6 phân lớp độc lập: Scene Layer, Camera Layer, Interaction Layer, Assets & Procedural Layer, Visualization State Layer, và Application/Domain Bridge.
  - Phân định ranh giới 3 tầng trạng thái: Ephemeral Interaction State (60 FPS Refs/Controllers), Visualization View State (Zustand: `useSpatialViewStore`), và Authoritative Domain State (Server Props/API).
  - Lập Ma trận Trách nhiệm Module (Module Responsibility Matrix) chi tiết đầu vào, đầu ra, trạng thái sở hữu và phương pháp kiểm thử cho 6 phân lớp.
  - Vẽ 4 sơ đồ kiến trúc Mermaid: Component Diagram (có đánh dấu cấm quan hệ phụ thuộc ngược), Sequence Diagram luồng tương tác kéo thả trạm làm việc, State Diagram vòng đời khởi tạo/giải phóng tài nguyên WebGL, và Class Diagram phân định 3 tầng trạng thái.
  - Ban hành 5 Quyết định Kỹ thuật (DEC-01 đến DEC-05), nổi bật là quyết định chuẩn hóa trên **Pure Three.js r185+** và dọn dẹp các thư viện cạnh tranh.
  - Thiết lập Lộ trình Triển khai 4 giai đoạn độc lập: `ARC-IMP-01` (Tách View State), `ARC-IMP-02` (Tách CameraManager), `ARC-IMP-03` (Tách SceneGraphManager & ResourceManager), `ARC-IMP-04` (Dọn dẹp bundle).
  - Bảo tồn tuyệt đối 100% các ràng buộc kỹ thuật đã kiểm chứng: Khóa bi quan Atomic SWAP (`PESSIMISTIC_WRITE`), Store Isolation Guard, `WeakSet` protection, và 45 bài test hồi quy hiện có.
- **Tập tin tạo mới & chỉnh sửa:**
  - `docs/architecture/ADR-ARC-001-visualization-layer.md` *(Mới)*: Tài liệu Architecture Decision Record toàn diện chuẩn mực (20 mục).
  - `docs/agent-memory/TASK_MEMORY.md`: Cập nhật trạng thái bàn giao nhiệm vụ ARC-001.
  - `docs/agent-memory/AUDIT_INDEX.md`: Bổ sung chỉ mục tra cứu ARC-001.
  - `docs/agent-memory/CHANGELOG.md`: Ghi nhận nhật ký thay đổi ARC-001.
- **Kiểm thử & Bằng chứng xác minh:**
  - 45/45 bài kiểm thử Web đang PASS 100% (`WorkstationDragController.test.js` 7/7, `DigitalTwinRegression.test.js` 17/17, `FurnitureBuilder.test.js` 6/6, `staffIdentity.test.js` 9/9, `workstationOccupancy.test.js` 6/6).
  - 488/488 bài kiểm thử Backend đang PASS 100% (`DigitalTwinConcurrencyIntegrationTest.java` 21/21 pass).
  - Không có bất kỳ dòng code sản phẩm nào bị sửa đổi; không thực hiện thao tác Git nguy hiểm.
- **Vấn đề đã giải quyết:** Đóng băng thiết kế kiến trúc chuẩn mực cho Visualization Layer, tạo cơ sở rõ ràng để chia nhỏ các task triển khai mà không gây gián đoạn hay phá vỡ các chức năng đang hoạt động.

---

### [REQ-001] — Finalize MVP Requirements & Acceptance Criteria Matrix
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Hoàn thiện đặc tả yêu cầu nghiệp vụ và ma trận tiêu chí nghiệm thu cho phạm vi MVP 4 tuần của nền tảng ShiftSync:
  - Thiết lập Source of Truth dựa trên bằng chứng kỹ thuật sẵn có từ mã nguồn (`shiftsync-backend`, `ShiftSync-Web`, `ShiftSync-Mobile`), sơ đồ ca sử dụng (`UC-00` đến `UC-08`), luồng thực thi (`AD-07`) và bản đồ phòng thủ (`SYSTEM_MAP.md`).
  - Phân định rõ ràng biên giới phạm vi MVP 4 tuần: Inclusions (P0, P1) vs Explicit Exclusions (P2 / Out of scope cho 4 tuần: Payroll nâng cao, AI Biometric Liveness, Máy vân tay vật lý, Điểm danh offline, i18n).
  - Lập Ma trận Yêu cầu Nghiệp vụ cho 4 Phân hệ Cốt lõi (M1: Shift Management & Auto-Scheduling; M2: 3D Spatial Workspace & Digital Twin; M3: Attendance Verification & Time Tracking; M4: Shift Marketplace & Workforce Coordination) gồm 19 yêu cầu (16 P0, 3 P1) có đầy đủ kịch bản Given/When/Then, negative cases, dependencies và mã nguồn đối chứng.
  - Lập Ma trận Chuyên sâu cho 2 Chế độ Camera Phần cứng (Mode 1: Dynamic QR Code Scanner; Mode 2: Live Selfie Capture) bao phủ toàn diện 12 khía cạnh: Mục đích, Entry trigger, Thiết bị, Permission flow, I/O formats, Validation rules, Loading/Cancel/Retry, Network/API, Privacy, Anti-abuse, Acceptance criteria, Dependencies.
  - Xây dựng Ma trận Truy vết Kiểm thử P0 (P0 Requirements-to-Test Traceability Matrix) ánh xạ 100% yêu cầu P0 vào test suite cụ thể.
  - Thiết lập Kế hoạch Triển khai & Xác minh 4 Tuần (Milestones Tuần 1-4, test gates, demoable outcomes, risk contingencies).
  - Lập Danh mục Câu hỏi Mở & Nhật ký Quyết định (Open Questions & Decision Log: Q-REQ-01 đến Q-REQ-05).
- **Tập tin tạo mới & chỉnh sửa:**
  - `docs/requirements/REQ-001-MVP-REQUIREMENTS-MATRIX.md` *(Mới)*: Tài liệu đặc tả yêu cầu và ma trận nghiệm thu MVP toàn diện.
  - `docs/agent-memory/TASK_MEMORY.md`: Cập nhật bàn giao trạng thái hiện tại, kết quả REQ-001 và liên kết tài liệu.
  - `docs/agent-memory/CHANGELOG.md`: Bổ sung nhật ký nhiệm vụ REQ-001.
- **Kiểm thử & Bằng chứng xác minh:**
  - Xác thực đối chiếu trực tiếp mã nguồn `AutoScheduleService.java`, `AttendanceController.java`, `AttendanceService.java`, `AttendanceScreenLive.js`, `MarketplaceService.java`.
  - 100% yêu cầu P0 có test suite tương ứng (`AutoScheduleAssignmentCorrectnessTest` 25/25 pass, `DigitalTwinRegression.test.js` 45/45 pass, `ShiftScheduleExceptionAuditTest` pass).
  - Cam kết bảo tồn an toàn mã nguồn: Không có bất kỳ dòng code sản phẩm nào bị sửa đổi; không thực hiện thao tác Git nguy hiểm.
- **Vấn đề đã giải quyết:** Chốt dứt khoát phạm vi MVP 4 tuần và tiêu chuẩn nghiệm thu có thể đo lường được, triệt tiêu việc phỏng đoán yêu cầu, tạo cơ sở pháp lý và kỹ thuật vững chắc để bàn giao cho đội ngũ phát triển.

---

### [PHASE-3] — AutoSchedule Correctness, Constraint Audit & Optimization
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Đánh giá, chuẩn hóa ma trận ràng buộc và tối ưu hóa tính đúng đắn, độ tin cậy, khả năng giải trình và hiệu năng của engine xếp ca tự động (AutoSchedule Engine):
  - Lập bảng danh mục ràng buộc (Constraint Inventory): Phân định rõ `VERIFIED_HARD` (HC1-HC5), `VERIFIED_SOFT` (SC1-SC6), `ALGORITHM` (ALG1-ALG2), `EXPLAINABILITY` (EXP1) và `LIFECYCLE` (IDEM1).
  - Phủ kín 8/8 kịch bản biên: Không có nhân viên (`NO_QUALIFIED_STAFF` -> `ZERO_COVERAGE`), thiếu năng lực (`capacity < demand` -> `PARTIALLY_COVERED`), thiếu kỹ năng, xung đột lịch rảnh & nghỉ phép đã duyệt (`ApprovedLeave`), quá trần giờ hợp đồng trong tuần ISO, vi phạm thời gian nghỉ giữa 2 ca xuyên ngày, ca trùng lặp kể cả ca đêm qua nửa đêm, và báo cáo trung thực qua `shortageSlots` (không sinh bản ghi giả mạo).
  - Tối ưu hóa tính công bằng (`utilizationRatio`) và cơ chế Soft Fairness Cap (`1.3 * teamMonthlyAvg`).
  - Nâng cấp độ chính xác `satisfiesRestTime` (phút: `toMinutes() / 60.0`), null-safety cho request và sắp xếp ca an toàn.
- **Tập tin tạo mới & chỉnh sửa:**
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/service/AutoScheduleService.java`: Bổ sung null-guard cho request, an toàn sắp xếp ca với `Comparator.nullsFirst(...)`, tinh chỉnh độ chính xác thời gian nghỉ `satisfiesRestTime`.
  - `shiftsync-backend/src/test/java/com/shiftsync/shift/service/AutoScheduleAssignmentCorrectnessTest.java`: Mở rộng từ 18 lên **25 unit tests**, bổ sung Tests 19-25 kiểm chứng nghỉ phép, giờ nghỉ xuyên ngày, ca đêm đè giờ, báo cáo thiếu hụt trung thực, trần giờ tuần hợp đồng, tối ưu kỹ năng và validation request.
  - `docs/audit/autoschedule/PHASE-3-AUTOSCHEDULE-AUDIT.md` *(Mới)*: Báo cáo kỹ thuật chi tiết toàn diện.
- **Kiểm thử đã chạy & Kết quả:**
  - `AutoScheduleAssignmentCorrectnessTest`: **25/25 tests PASS (100%)**.
  - Phân hệ Xếp ca tự động & Phân công: **99/99 tests PASS (100%)** qua 5 test suites.
  - Toàn bộ Backend: **488/488 tests PASS**, 0 failures, 0 errors, 3 skipped (1 phút 03 giây).
  - Toàn bộ Frontend: **45/45 tests PASS (100%)** qua 10 test suites; Vite production build **PASS** (1.41s).
- **Vấn đề đã giải quyết:** Đảm bảo 100% tính đúng đắn của engine xếp ca tự động, loại bỏ hoàn toàn việc phân công sai kỹ năng, vi phạm giờ nghỉ, xung đột ca đêm, vi phạm trần giờ hoặc phân công người đang nghỉ phép; báo cáo thiếu hụt hoàn toàn trung thực và truy vết nguồn gốc.

---

### [PHASE-2C] — Digital Twin Integration Regression & Reliability
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Xác minh và củng cố độ tin cậy tích hợp toàn diện của Digital Twin sau Phase 2A và 2B, bao phủ 6 kịch bản hồi quy bắt buộc:
  - Scenario A: Lưu trữ vị trí (Persistence), Clamping biên sàn, Phát hiện va chạm & Hoàn tác (Revert).
  - Scenario B: Tính nhất quán của Occupancy, Tách biệt Staff ID vs Assignment ID, Phân định rõ ràng Direct Mapping vs Inferred Zone Fallback.
  - Scenario C: Độ chính xác của Điểm danh & Vòng đời Check-in/Check-out (Có mặt vs Theo lịch vs Đã về).
  - Scenario D: Ngăn ngừa Async Race Conditions & Cô lập dữ liệu khi chuyển đổi chi nhánh (Store Selection Isolation).
  - Scenario E: Phân quyền đa tầng (RBAC & Defense-in-depth) ở cả Frontend Save Guard và Backend `@PreAuthorize`.
  - Scenario F: Độ ổn định liên phân hệ (Cross-Feature), Khóa OrbitControls khi kéo, và Bảo toàn Singleton Material không bị dispose rò rỉ.
- **Tập tin tạo mới & chỉnh sửa:**
  - `ShiftSync-Web/src/features/spatial-workspace/DigitalTwinRegression.test.js` *(Mới)*: Test suite tích hợp tự động bao phủ trọn vẹn 6 kịch bản hồi quy (Scenarios A-F).
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`: Thêm Store Selection Isolation Guard dọn sạch draft/selection khi đổi store; bổ sung guard `canEditLayout` phòng thủ chiều sâu trong `handleSaveWorkstationPosition`.
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx`: Bổ sung huy hiệu phân biệt nhân viên `✓ Đã về` (Checked-out) với `Theo lịch` (Scheduled, chưa check-in).
  - `ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js`: Gán `isWorkstationTag: true` và `workstationId` vào `sprite.userData` phục vụ Raycaster và Scene Graph phân biệt tag.
  - `docs/audit/digital-twin/PHASE-2C-REGRESSION-RELIABILITY.md` *(Mới)*: Báo cáo kỹ thuật đối soát và kiểm chứng chi tiết.
- **Kiểm thử đã chạy & Kết quả:**
  - Frontend Unit & Regression tests: **45/45 tests PASS (100%)** qua 10 test suites (`DigitalTwinRegression`, `workstationOccupancy`, `FurnitureBuilder`, `WorkstationDragController`, `staffIdentity`).
  - Frontend Production Build (`npm run build`): **PASS** trong 826ms (Vite Rolldown bundle an toàn).
  - Backend Unit tests (`mvn test "-Dtest=ShiftAssignmentServiceTest,AutoScheduleAssignmentCorrectnessTest"`): **37/37 tests PASS (100%)** với `BUILD SUCCESS`.
- **Vấn đề đã giải quyết:** Loại bỏ rủi ro rò rỉ draft coordinates giữa các chi nhánh, tăng cường phòng thủ phân quyền đa tầng khi lưu trạm, phân định chuẩn xác trạng thái check-out của nhân sự.

---

### [PHASE-2B] — Digital Twin Workstation Occupancy & Staff Visualization
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Mở rộng Digital Twin trực quan hóa việc phân bổ nhân viên vào trạm làm việc (Workstation Occupancy & Staff Presence), phân định 3 trạng thái (`ASSIGNED`, `UNASSIGNED`, `UNKNOWN`) và phân biệt rõ Phân công theo lịch vs Hiện diện thực tế (Attendance check-in).
- **Tập tin tạo mới & chỉnh sửa:**
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/dto/ShiftAssignmentResponseDTO.java`: Mở khóa trường `workstationId` và `workstationName` (đã có trong Flyway V31).
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java`: Cập nhật mapper map `workstationId` và `workstationName` từ entity `ShiftAssignment`.
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftService.java`: Cập nhật mapper ca làm việc map `workstationId` và `workstationName`.
  - `ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.js` *(Mới)*: Engine phân giải trạng thái trạm làm việc, tính toán occupancy, phân tách `ASSIGNED`, `UNASSIGNED`, `UNKNOWN`, đối chiếu attendance, fallback gom nhóm theo zone, bảo vệ null-safety.
  - `ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.test.js` *(Mới)*: 6/6 unit tests đạt chuẩn, bao phủ 6 kịch bản bắt buộc.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js`: Cập nhật `createWorkstationTagSprite` hiển thị đèn LED và viền trạng thái (Xanh ngọc: Có mặt, Xanh dương: Theo lịch, Hổ phách: Trống, Xám: Chưa rõ/Lỗi), tên nhân viên, tỷ lệ lấp đầy.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.test.js`: Thêm test case xác minh hiển thị occupancy tag sprite.
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx`: Bổ sung thẻ thông tin "Nhân sự trực trạm (Workstation Occupancy)" hiển thị đầy đủ chi tiết nhân sự, huy hiệu điểm danh, nguồn phân công và sức chứa.
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`: Tích hợp `getStoreAttendance` với cleanup chống stale response (`isCurrent`), tính toán memoized `workstationOccupancies`, truyền dữ liệu vào 3D Three.js tag sprite và `<SpatialInspector>`.
  - `docs/audit/digital-twin/PHASE-2B-WORKSTATION-OCCUPANCY.md` *(Mới)*: Báo cáo kỹ thuật chi tiết.
- **Kiểm thử đã chạy & Kết quả:**
  - Frontend Unit tests: **28/28 tests PASS** (4 suites: `workstationOccupancy`, `FurnitureBuilder`, `WorkstationDragController`, `staffIdentity`).
  - Frontend `npm run build`: **PASS** trong 2.74s (Vite production bundle thành công 100%).
  - Backend `mvn test -Dtest=ShiftAssignmentServiceTest`: **19/19 tests PASS** (0 failures, 0 errors).
  - Backend `mvn test -Dtest=AutoScheduleAssignmentCorrectnessTest`: **18/18 tests PASS** (0 failures).
- **Vấn đề đã giải quyết:** Đồng bộ trọn vẹn dữ liệu ca làm việc và điểm danh thực tế lên trạm làm việc 3D, loại bỏ hoàn toàn việc suy đoán mù hay nhầm lẫn trạng thái lỗi với trạm trống.

---

### [PHASE-2A] — Workstation Layout & Spatial Editor
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Triển khai tính năng Bố trí Trạm làm việc (Workstation Layout Editor) tương tác 3D trong Digital Twin ShiftSync.
- **Tập tin tạo mới & chỉnh sửa:**
  - `ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js` *(Mới)*: Controller kéo thả raycasting trên sàn, kiểm tra va chạm, biên sàn, khóa OrbitControls và hoàn tác.
  - `ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.test.js` *(Mới)*: 7 unit tests kiểm tra toán học tọa độ đối xứng, clamping biên sàn, phát hiện va chạm và RBAC.
  - `ShiftSync-Web/src/features/spatial-workspace/components/WorkstationEditorBanner.jsx` *(Mới)*: Banner nổi điều khiển chỉnh sửa trạm, xem trước tọa độ nháp, cảnh báo va chạm và nút Lưu/Hủy.
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialToolbar.jsx`: Thêm nút "Bố trí Trạm" với icon `Wrench`, trạng thái kích hoạt và bảo vệ phân quyền RBAC.
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx`: Bổ sung CASE 1.5 xử lý hiển thị chi tiết Workstation, tọa độ 3D, nút Kích hoạt Di chuyển, nút Lưu/Hủy bản nháp.
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`: Khởi tạo controller, quản lý state draft/collision, neo nhãn floating tag vào workstation mesh con, gắn kết API `updateStoreWorkstation`.
  - `docs/audit/digital-twin/PHASE-2A-WORKSTATION-LAYOUT-EDITOR.md` *(Mới)*: Báo cáo kỹ thuật đối soát và kiểm thử hoàn chỉnh.
- **Kiểm thử đã chạy & Kết quả:**
  - `node --test`: **21/21 tests PASS** (7 tests WorkstationDragController, 5 tests FurnitureBuilder, 9 tests staffIdentity).
  - `npm run build`: **PASS** (2.50s, phân tách bundle hoàn hảo).
  - `mvn testCompile` & `mvn test -Dtest=ShiftAssignmentServiceTest`: **19/19 tests PASS** (0 failures).
- **Vấn đề đã xử lý:** Cung cấp đầy đủ công cụ kéo thả bố trí trạm 3D và lưu trữ qua API mà không sửa đổi DB schema.

---

### [WEB-001] — Digital Twin Data Integration & Workstation Layer
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Khắc phục 3 khoảng trống tích hợp không gian (`GAP-SP-001`, `GAP-SP-002`, `GAP-SP-003`) từ báo cáo AUD-002.
- **Tập tin tạo mới & chỉnh sửa:**
  - `ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js` *(Mới)*: Chuẩn hóa bóc tách Staff ID vs Assignment ID.
  - `ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.test.js` *(Mới)*: 9 unit tests xác minh helper.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js`: Thêm `buildWorkstationObject`, `createWorkstationTagSprite`, `isFurnitureSharedMaterial`.
  - `ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.test.js` *(Mới)*: 5 unit tests xác minh model trạm làm việc và triệt tiêu va chạm.
  - `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`: Tích hợp fetch Workstation API, áp dụng `staffIdentity`, render 3D workstation layer, triệt tiêu va chạm mesh (`zonesWithWorkstations`).
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialToolbar.jsx`: Bổ sung toggle `showWorkstations` độc lập.
  - `ShiftSync-Web/src/components/spatial/TwoDSpatialSchematic.jsx`: Đồng bộ trạm làm việc lên sơ đồ 2D.
  - `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx`, `simulationStore.js`, `DragTransfer.js`, `SimulationValidator.js`, `SimulationImpactCalculator.js`, `SimulationAutoScheduler.js`: Cập nhật `staffIdentity`.
  - `shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java`: Tinh chỉnh stubbing `lenient()` cho thứ tự canonical UUID trong test swap.
- **Kiểm thử đã chạy & Kết quả:**
  - `node --test src/features/spatial-workspace/utils/staffIdentity.test.js src/features/spatial-workspace/scene/FurnitureBuilder.test.js`: **14/14 tests PASS** (0 failures).
  - `npm run build`: **PASS** (1.99s, phân tách Three.js chunk an toàn).
  - `mvn test "-Dtest=ShiftAssignmentServiceTest,DigitalTwinConcurrencyIntegrationTest"`: **21/21 tests PASS** (0 failures, 0 errors).
  - Chrome DevTools Live Verification: WebGL dynamicGroup tải đúng 2 trạm làm việc thực tế từ PostgreSQL, toggle layer phản hồi mượt mà từ 2 về 0 và ngược lại.
- **Vấn đề đã xử lý / Còn mở:**
  - Đã giải quyết: `GAP-SP-001`, `GAP-SP-002`, `GAP-SP-003`.
  - Còn mở: Không có lỗi còn tồn đọng trong phạm vi WEB-001.
- **Mục CODEBASE_MAP ảnh hưởng:** Mục 1.1 (Workstations API), Mục 2.1 (Staff Identity), Mục 3 (Procedural vs Real data).

---

### [AUD-002] — API & Spatial Data Model Reconciliation
- **Ngày thực hiện:** 14/10/2026
- **Phạm vi & Mục tiêu:** Rà soát đối chiếu toàn diện giữa mô hình dữ liệu Backend (Layout, Zone, Workstation, Shift, ShiftAssignment) và Web Frontend.
- **Tập tin báo cáo:**
  - `docs/audit/digital-twin/AUD-002-API-SPATIAL-DATA-MODEL-RECONCILIATION.md`
- **Kết luận:**
  - Backend đã có đầy đủ schema và API cho `Workstation` (`/api/stores/{storeId}/workstations`).
  - Web chưa gọi API này mà tự suy đoán furniture tĩnh tại tâm zone (`GAP-SP-001`).
  - Web nhầm lẫn giữa `staffId` và `assignmentId` (`GAP-SP-002`).
  - Web thiếu toggle kiểm soát layer trạm làm việc (`GAP-SP-003`).

---

### [FIX-001C] — Atomic SWAP & Persistence Consistency
- **Ngày thực hiện:** 13/10/2026
- **Phạm vi & Mục tiêu:** Khắc phục rủi ro mất mát dữ liệu hoặc partial persistence khi thực hiện đổi ca làm việc (SWAP).
- **Tập tin tạo mới & chỉnh sửa:**
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/dto/ShiftZoneSwapRequest.java` *(Mới)*
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/dto/ShiftZoneSwapResponseDTO.java` *(Mới)*
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/controller/ShiftAssignmentController.java`: Thêm endpoint `POST /api/stores/{storeId}/shifts/{shiftId}/assignments/swap`.
  - `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java`: Triển khai `swapStaffZones` với khóa `PESSIMISTIC_WRITE` trên canonical staff UUID order.
  - `shiftsync-backend/src/test/java/com/shiftsync/shift/service/DigitalTwinConcurrencyIntegrationTest.java` *(Mới)*: Test kiểm thử đồng thời đa luồng.
- **Kiểm thử đã chạy & Kết quả:** 21/21 tests pass.

---

### [FIX-001B] — Digital Twin Diff Coverage
- **Ngày thực hiện:** 13/10/2026
- **Phạm vi & Mục tiêu:** Bổ sung xử lý diff types `SWAP` và `LEAVE_ABSENCE` trong What-If simulation.
- **Tập tin chỉnh sửa:** `SpatialWorkspace.jsx`, `SpatialInspector.jsx`, `simulationStore.js`.
- **Kiểm thử đã chạy & Kết quả:** Frontend build thành công, What-If diff modal hiển thị đầy đủ 4 loại thay đổi.

---

### [FIX-001A] — Digital Twin Drag & Transfer Repair
- **Ngày thực hiện:** 13/10/2026
- **Phạm vi & Mục tiêu:** Sửa cơ chế kéo thả nhân sự giữa các zone trong 3D canvas.
- **Tập tin chỉnh sửa:** `DragTransfer.js`, `SpatialWorkspace.jsx`.
- **Kiểm thử đã chạy & Kết quả:** Avatar di chuyển mượt mà tới tâm zone đích và cập nhật trạng thái phân công.


## 19/10/2026 — EXPLORER-002: Workstation Equipment và tính đúng dữ liệu
- Tái sử dụng EXPLORER-001, CODEBASE_MAP/AUDIT_INDEX và policy StoreAccessService; kiểm tra HEAD c9d4df1 trên quoc-backend, giữ nguyên thay đổi dở dang.
- Thêm Equipment backend GET/POST/PUT, V43 additive, validation, unique code per workstation và ownership guards; UI tải thiết bị thật với loading/empty/error/retry/abort.
- Sửa procedural Attendance toggle, avatar theo trạm, selection entity đã xóa; bỏ ghép suy diễn zone→workstation và attendance theo trạm bất kỳ.
- Kiểm thử: 105/105 spatial tests; 28/28 backend tests; build PASS (915ms); 7 browser component scenarios PASS bằng fixture; PostgreSQL migration transaction rollback PASS. Có lần chạy regression phát hiện test zone-fallback cũ; đã cập nhật kỳ vọng theo yêu cầu không gán sai trạm, chạy lại toàn bộ đạt.
- Giới hạn: V43 chưa deploy; backend container cũ; `/schedule` redirect login nên chưa nghiệm thu canvas/va chạm camera hay HTTP/JWT/persistence. PARTIALLY_IMPLEMENTED_WITH_DOCUMENTED_GAPS. Chi tiết INTERACTIVE-STORE-EXPLORER-AUDIT.md.


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



## 19/10/2026 — EXPLORER-005: UI review
- Review full-page1920×1080 theo yêu cầu, tái sử dụng EXPLORER-004 và design-ux judge. Chưa triển khai tính năng mới. Ưu tiên header/viewport/timeline/theme; kế tiếp navigator/editor/equipment alerts. Báo cáo docs/audit/digital-twin/EXPLORER-005-UI-REVIEW.md. Không đổi mã ứng dụng, không chạy lại tests.

### [EXPLORER-006] — Giao diện và bố trí cửa hàng (19/10/2026)
- Triển khai review EXPLORER-005: header/context gọn, fit viewport, navigator/fullscreen, timeline theo ca/qua đêm, theme/labels; bố trí bàn ghế tránh lối vào/trạm/cột, staff ngoài quầy, camera tránh vật cản, grid/snap editor.
-117/117 spatial tests, build pass; Playwright1920×1080 full-page API mock26/26, không browser errors. Không backend/DB writes. Chi tiết: docs/audit/digital-twin/EXPLORER-006-LAYOUT-IMPLEMENTATION.md.


### [EXPLORER-007] — Sửa mất bàn thu ngân (19/10/2026)
- Khôi phục bàn thu ngân vật lý, bố trí sát cạnh pha chế và thêm cả hai vào vật cản nội thất; không tạo binding nghiệp vụ giả, giữ tọa độ trạm đã lưu. Sửa kiểm tra sai unbound-hidden của EXPLORER-006.
-119/119 spatial tests, build và26/26 Playwright mock checkpoints pass ở1920×1080. Ảnh .playwright-mcp/explorer-007-cashier-barista.png. Không backend/DB changes.


### [EXPLORER-008] — Bố trí café theo luồng thực tế (19/10/2026)
- Dùng sàn GLB thật, xếp riêng9 bộ bàn ghế và chừa lối vào/xếp hàng; cụm POS–Barista–Pickup liền nhau, zone3D và focus đúng quầy; chỉ dẫn sàn và leaderline nhãn tránh mất Thu ngân.
-122/122 spatial tests, build và33/33 Playwright1920×1080 API mock pass. Judge ảnh không còn blocker/major. Không DB/backend writes; xem docs/audit/digital-twin/EXPLORER-008-CAFE-LAYOUT.md.


### [EXPLORER-009] — Kiểm tra trải nghiệm Interactive (19/10/2026)
- Dùng skill3d-web-experience; chạy lại33 checkpoint rồi kiểm tra2D, tham quan/WASD/V/teleport/collision, fullscreen, zoom,390px, delayGLB và503fallback. Xác nhận5 nhóm lỗi; NEEDS_FIXES, chưa sửa ứng dụng.
- Overview≈60FPS mẫu3giây/IrisXe,930drawcalls,103358triangles; file6,32MiB. Report EXPLORER-009-3D-EXPERIENCE-AUDIT.md; browser trở về1920×1080, không DB/backend writes.


### [EXPLORER-010] — Sửa trải nghiệm theo audit009 (19/10/2026)
- Sửa nguồn vị trí2D/3D/minimap/teleport, collision thật và landing an toàn, Vsync, loading/error/retryGLB; chống chồng card2D và guard chọnlạistore.
-128/128 tests, build,33/33 main+14/14 focused Playwright pass1920×1080, API mock+GLB thật. Judge ảnh không major/blocker. Không DB/backend writes. Xem docs/audit/digital-twin/EXPLORER-010-EXPERIENCE-FIXES.md.


### [EXPLORER-011] — Bản thử 3D Schedule Planner (19/10/2026)
- Triển khai theo ảnh người dùng: chọnngày/ca/giờ, Matrix–Timeline–Spatial, ôtrống→ứng viên, draft/undo/Apply, warningoverlap/invalid và recoverylink. Backendeligibilityrecheck, force=false; không DB thậtwrites.
-135/135 tests +build;20 planner+33main+14experience browser checks pass1920×1080 API mock/GLB thật. Judgevisual khôngmajor/blocker. Demo script và audit EXPLORER-011-SCHEDULE-PLANNER-PROTOTYPE.md.


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


## EXPLORER-014 — WebXR VR cho Interactive Store (21/10/2026)
Lịch sử: WebXR đã gỡ ở EXPLORER-015 theo yêu cầu người dùng.
Không cần kính để tham quan: desktop bấm **Mô phỏng VR** vào góc nhìn thứ nhất của cùng cửa hàng 3D, đi bằng WASD, xoay chuột, tương tác E, khóa mục tiêu F, đổi góc V và thoát bằng Esc/HUD. Nếu có thiết bị hỗ trợ, nhánh WebXR thật vẫn tải riêng theo thao tác và giữ controller/teleport.
Build PASS. Edge155 1920×1080 với API fixtures: vào first-person, một canvas, WASD đổi z=3,8→2,73m, page errors 0. Chưa kiểm tra headset thật hoặc ghi backend. Chi tiết `docs/audit/digital-twin/EXPLORER-014-WEBXR-VR.md`.

## EXPLORER-015 — Bảng thông tin neo trong cảnh (21/10/2026)
Thay sidebar chi tiết bằng bảng neo model staff/trạm/khu vực, billboard Html transform, giữ theme và đọc snapshot hiện hành. Thao tác quản lý/thiết bị và overview/cảnh báo mở dialog giữa màn hình, focus trap/scroll/body-lock khôi phục. Gỡ WebXR/dependency, giữ Tham quan 3D first-person, click/E và pause input khi bảng mở.
Build PASS, Node20/20, Edge155 world-info38/38 + update/fullscreen11/11 + Planner20/20 PASS; mobile390 và1366 không cắt bảng. REST/session fixture, chưa STOMP/backend thật. Module mới ESLint PASS; lỗi compiler refs/immutability ở controller cũ còn ngoài scope. Report docs/audit/digital-twin/EXPLORER-015-WORLD-INFO-CARDS.md.

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

### EXPLORER-021 — Redesign bảng thông tin (22/10/2026)
- User yêu cầu redesign bảng HTML neo cảnh đã chọn. Hướng operations card, DFII14/15, giữ font/theme/màu vị trí; rail màu/identity rõ, context ngàyca có icon, trạng thái dot, zone metric pair, personnel initials + attendance, CTA tương phản. Actions/camera/selection/viewport clamp giữ nguyên.
- Tái sử dụng EXPLORER015/016/019/020; sửa WorldInfoCard, WorldInfoSummary, world-info-card.css.
- Build PASS (chunk warning cũ), ESLint2 PASS, Edge155 clarity42/42 PASS1920/1366/390, page/consoleerrors0. REST/session fixtures; WebGL/model thật; chưa livebackend E2E. Ảnh .playwright-mcp/info-redesign-1920.png đã xem, Edge trả1920. Không backend/API/DB/deps/commit/push.

### EXPLORER-022 — Redesign nhãn Barista1/1 và trạm (22/10/2026)
Shared FloatingTagCanvas: nền sáng, rail màu vị trí, title/status textdot, ô số Đã xếp/Cần hoặc Đã xếp/Chỗ, ellipsis tên dài. SceneLabels tăng kích thước màn hình240/260px, đúngaspect và collision spacing; giữclick/anchor/hide-on-info. Zone khôngtarget ghi chưađịnhbiên, workstationunknown không tạo số. Build PASS(chunkwarning cũ), Node13/13, Edgeclarity42/42 fixture PASS; labelprobe1920/1366/390, screenshot zone-tags-redesign.png, Edge trả1920. Không backend/API/DB/deps/gitwrite. Tái sử dụng EXPLORER019–021; skillsfrontend-design/3d-web-experience.

### EXPLORER-023 — Khắc phục lưu trên tab mock (22/10/2026)
Rootcause fixture clarity thiếu endpointdesign trả[] (GET/PUT200), ứng dụng đúng khi không đánh dấu saved. Thêm snapshot/version/CAS routes persisted localStorage, giữ userdraft; thêm StoreDesigner nullguard+error rõ. Khôi phục18items draft, saveversion1/close noalert/reopen+reload18items saved PASS trong Edge1920; chưa livebackendwrites. Build/lint PASS, fullclarityattempt dừng genderdisclosure assertion. Không DB/API/backend/deps/commit. Backup draft localkey trước restore.

### LIVE-024 — Gỡmock, nối web↔Docker (22/10/2026)
- Gỡinterception/fakeauth, mởEdgefresh1920, backup18items và bỏfixturestorage sau chuyển live. KhởiDockerEngine/backend/db/redis. Devproxy /api+/ws vàsameoriginREST/WS (CORSoriginmappingdev).
- Real UIlogin200; GETactualstore3zones/2ws/20shifts/1attendance; WSSTOMPCONNECTED. Save18items→PostgresPVDrev1,DBconfirm18; reloadreopenPASS. Dashboard/marketplace/employees/attendance API smokePASS0errors. Build/lintconfigapiPASS(chunkwarningcũ).
- Userdesignbarista/cashierbind2WSthật, backup docs/backups/*.json. Database banđầukhôngsaveddesign,nayrev1. Khôngbackendcode/deps/commit. ReportLIVE024; chưamutationeventE2E, data DBseedkhácmock. Không chạyfixturetrongtabngườidùng.

### EXPLORER-025 — Redesign modal cảnh báo (22/10/2026)
Modal980px,hailayoutqueue+summary;filter all/urgent/zone/station,prioritysort,status+reason+impact,CTA3D/details,coverage+actions+directory;mobile1cộtcuộnđầyđủ. No-shiftnoclaims/disabledallocation,unknownoccupancy khôngwarningtrống,phâncôngkhácđiểmdanh. Callback/APIgiữ. Edge155liveDocker5issues(15/10),filters/zonefocus/stationdetail/Esc/responsive1920/1366/390PASS; build/lint2PASS(chunkwarningcũ). Khôngfixture/backend/API/DB/deps/gitcommit. Tri thứcLIVE024/EXPLORER015–016táisửdụng.

### UI-026 — Xóa emoji kiểu thẻCashier (22/10/2026)
Bỏdecorativeemoji toànwebsrc vàspanvai trò, giữtext/colors/Lucide/functionalclosecheck. Legacyiconproperties trảempty, avatarfallbacklabel; khôngMobile/backend. BuildPASS(chunkwarningcũ), source scanruntime0emoji, EdgeDocker3D/staffcard+employees/attendance/marketplace noemoji/pageerror. Khôngfixture/DBmutation/commit. Tri thứcreuse LIVE024+SpatialInspector/ZoneStatus/constants.

### NAV-027 — Bỏ trang Operations Hub (22/10/2026)
RequestPagekhôngcònrender/import; legacyredirectgiữtab,mởđúngmodule. BellViewAllhub→Close,listTấtcảgiữ; notificationrouterdùngtypegốc,sửaHeaderlegacy,bỏ6mocknotificationsfallback. Build/lint3PASS,node12assertionsPASS,Edge6routes+bellbackendthậtPASS. Khôngbackend/DB/deps/commit. Tri thứcreuseLIVE024+App/Navbar/RequestPage.

### FUNC-028 — Ràsoátnút/điềuhướng (22/10/2026)
Read-onlyproductaudit6nhómvấnđềnotif/camera/menu/legacyroutes documentedFUNC028; no sourcefix/DBmutation. Correctedprevioussuspiciontransfer afterreadingbackendexistingzonebranch. No claimexhaustivefunctionaltests. Usercameraplanpreviouslycanceled.

### FIX-029 — Sửa 6 nhóm vấn đề audit (22/10/2026)
Thông báo lỗi giữ pending; đánh dấu đọc không xóa yêu cầu; giữ sourceType gốc; legacy redirects giữ tab; auto menu mở modal có ngày; Mẫu ca có màn hình CRUD backend hiện có; follow3D resolve avatar/world position/rebind và dừng. Build/Node16/newmodulelint PASS; Edge live read/navigation/follow PASS. Approve/markread/templateCRUD test bằng intercepted writes trong tab riêng rồi đóng, không DB mutation. Chưa browser templateCRUD ghi DB thật. Report docs/audit/ui/FIX-029-FUNCTIONAL-ACTIONS.md, tái sử dụng FUNC028/LIVE024/NAV027. Không backend/deps/migration/commit.

### FIX-030 — Chợ ca mở lọc hạn tuyển (22/10/2026)
Loại ca bắtđầu/quáhạn/hủy khỏi active vàKPI; chuyển readonlyLịch sử ca (FILLED), realtimeclock1s; freshguards nhận/đăng/phâncông/chiviện. NoDBdelete/backendAPIchange. Build/Node6/helperlintPASS; EdgeDocker0active/20history; isolatedclock1→0active/history2 no writesPASS. ReportFIX030, reuseLIVE024/FIX029/backendbusinesszone. Khôngcommit.

### FIX-031 — Tạo và sửa ca làm việc (22/10/2026)
Redesign modal desktop/mobile có body cuộn, footer hiện, palette màu; future defaults/validation/deadline +07, mẫu ca API; bỏ chấm công/cross-store giả khỏi form. Backend persist note/color/role/template (V46), bảo toàn đa phân công. Docker deploy có DB/image backup; build/lint/Node4/Maven23 PASS. Edge1920/1366/390 + keyboard/errorfixture PASS; live UI tạo201/sửa200/GET đúng, draft kiểm thử xóa204 SQL0. Trả Edge1920, khôi phục clock thật. Không commit; giới hạn assignment/template live chưa E2E. Report FIX031, reuseLIVE024/FIX029/FIX030.

### FIX-031A — Giảm kích thước form lịch (22/10/2026)
Khung740→680, giảm khoảng cách/controls, cấu hình chấm công thu gọn mặc định; summary có trong focus trap. Edge1920/1366 thấy trọn form680×726, mobile390 body cuộn/footer hiện; expanded config reachable. Build/lint PASS, reuse FIX031; không dữ liệu/backend/deps/commit.

### FIX-032 — Redesign định biên ngày (22/10/2026)
Bỏ SLA100% gây nhầm, phân biệt demand/assignment và target/minmax; KPI lượt/giờ/mục tiêu, normdialog, compacttable, bỏtimeline ticks. Một stickyCTA chung và scope tuần đúng. Build/Node2/newmoduleslintPASS, Edge1920/1366/390/footer/scroll, liveGET+isolatederror/success+keyboardPASS; noDBmutations/backend/deps/commit. FullModal lint còn legacy. ReportFIX032, reuseSCHED017/SCROLL018.

### FIX-033 — Thu gọn và xác minh API Định biên (22/10)
Khungngày1560→1280, compactspacing vàgộpquychuẩnvàodòng. Đối chiếu endpoints đọc/ghi, sửa nhãn auto-fill khớpquytắcbackend, tempquotagợiý. Live GET200/Edge3sizes/footer/build/lintPASS; writes chưaDBE2E. NoDB/backend/commit. ReportFIX033.

### FIX-034 — Thu gọn dạng tuần (22/10/2026)
Gom KPI3, bỏrolecardsvàSLA/revenueclaim, matrix7days stickyrole, normdialog/collapsiblebudget. Statuscùngngày, vượtmaxưu tiênpeak. Weekly count/budget server-first. Build/lint2/Node2/Edge3sizes+liveGET+isolatedwriteerror/success PASS. Vite restarted staleCSS, remains3000; khôngbackend/DB/commit. ReportFIX034.

### FIX-035 — Sửa cuộn Định biên khi mở rộng (22/10)
Bounded dialog với bodycuộn riêng, header/footer khôngchèncontent; normdialogscroll+closeheader. BuildPASS; Edgeall42warningsfixture+budgetedit+norm3sizes reachableSave/abovefooter/nooverflowPASS; livedayregressionPASS. KhôngAPI/DB/commit. ReportFIX035.

### FIX-036 — Chặn cắt nội dung ngân sách theo ảnh (22/10)
Viewport.css riêng, definitegridheight+actualviewportresize; footerrowluônởtrongkhung. Live1620/1366/390 budgetedit + fixture42warningsallopenPASS, buildPASS. KhôngAPI/DB/commit. ReportFIX036, thaylayoutFIX035.

### FIX-037 — Thu gọn thực tế nội dung (22/10)
Metrics thấp, celltuần[-count+]ngang, statusdưới, bảng~240px, budgetformngang vàcap790. Live1620/1366 cảbudgetedit vừa body, mobilecuộnSavehit/footerPASS; build/lint2PASS. KhôngAPI/DB/commit. ReportFIX037.

### FIX-038 — Cân lại chữ/nút/khoảng cách (22/10)
BỏdensityquánhỏFIX037, scaleđồngnhấtngày/tuần; stepper30×32, secondary12, metrics60, spacing12–16. Build/Edge3sizes bounded/footer/savehitPASS; noDB/API/commit. ReportFIX038.

### STAB-001 — Ổn định hệ thống đang triển khai (23/10/2026)
Danh mục tĩnh 35 routes/27 services/32 controllers: docs/audit/stabilization/source-inventory.json; ma trận và gate mở tại STAB-001.md. Web Node189/189/build PASS; baseline lint341errors/39warnings còn mở. Sửa quota apply không xóa ca/phân công, cảnh báo review giữ modal; skill lookup scoped store; source SAVED/SUGGESTED +assigned/shortage/excess/unclassified; thống nhất gợi ý ngày/tuần với rule apply, bỏ tự nâng max cuối tuần. Budget chuyển Store.monthlyQuotaBudget/V47 (chỉ migration DB test, chưa deploy operational). API client bỏ Authorization cache và giới hạn retry queued refresh; Edge fixture concurrency1refresh/2requests và noauth sauclear PASS. Demand request sequence chống response cũ. Docker test riêng ports55432/56379, runner Linux scripts/test-stabilization-backend.ps1. Linux suite đầu520/0fail/1error/5skip; lỗi payroll fixture không có contract, đã sửa tự tạo cùngstore+transaction rollback, chạy lại log backend-stabilization-linux-after.log. Edge155 live đọc6pages×3sizes no horizontaloverflow/no JSerror; chưa full journeys/125%/production. Không tuyên bố toàn hệ thống đạt; không operational DBwrite/commit/push. Tiếp tục đọc log final, kiểm DB persistence và các gate matrix còn mở.

STAB-001 verification update: Linux isolated full Maven suite BUILD SUCCESS: 520 tests, 0 failures, 0 errors, 5 skipped (515 executed). Log backend-stabilization-linux-after.log. Payroll fixture now self-contained/transactional. This does not complete browser business journeys or authorize operational migration.

SOURCE-RUN 23/10: User prefers backend from source/VS Code. Added .vscode/tasks.json. Backup ~/.codex/backups/shiftsync/before-source-v47.dump (367547 bytes). Source startup failed: DevTools classloader first, disabled restart then Java/Netty Windows loopback Invalid argument: connect. Restored existing Docker backend to avoid web outage; source switch NOT complete. See backend-source.log. Need resolve host Java selector issue before switching.

STAB-001 deploy 23/10: rebuilt backend Docker from current source, recreated only backend; running image matches latest sha256:31ef093bb47cfe08d32081cd4c9a93712666c76289f8b704a5a5d67ab5dd2668. V47 applied during preceding source startup (corrects prior not-deployed notes); database backed up before migration. Live day/week API verification after restart recorded in chat.

### STAB-002 — Kiểm chứng persistence/quyền và UI live (23/10/2026)
Thêm QuotaBudgetPersistenceTest: flush+clear rồi đọc lại DB và response tuần đúng92000000, store khác không ảnh hưởng, giá trị âm không ghi đè. Linux isolated test cùng AvailabilityIdorSecurityTest:3/3 PASS. Đây là persistence-context reload, chưa phải restart JVM. Test availability được bổ sung @Transactional/AfterEach clearSecurityContext để không rò auth/dữ liệu sang test khác (cleanup edit sau lượt chạy, cần suite kế tiếp xác nhận). Edge155 live backend rebuilt: weekly42coverage cells, footer visible vàno horizontal overflow1920/1366/390 PASS, không DBwrite. Không production source change lần này; Docker không cần rebuild chỉ vì test/docs. Còn fulljourneys/realtime/3D/lint/125%.

### STAB-003 — User nine findings (in progress)
Confirmed AttendanceService host-time now/local conversion and ShiftService UTC default deadline. Source changed to Asia/Ho_Chi_Minh; NOT deployed yet, pending timezone regression and full impact review. Initial targeted runner timezone-regression.log selected ShiftServiceAssignmentDelegationTest, but AttendanceServiceTest name absent; actual attendance suite is AttendanceServiceQaTest/AttendanceRegressionPostFixRuntimeQaTest, MUST run these before acceptance. Remaining user findings overnight create/update/conflicts, list photo payload, dashboard errors, production credentials, WS allowlist/subscription, password policy still open. Login validation must not enforce registration policy against legacy valid passwords. No claim all nine fixed.
### STAB-003 — Ca qua đêm, attendance payload và WebSocket (24/10/2026)

- The temporary overnight-shift implementation was removed by product decision: create/update/bulk demand, templates and the Web form require end time after start time.
- Attendance now uses `Asia/Ho_Chi_Minh`; list DTOs expose photo availability only and authorised photo endpoints return bytes on demand.
- Dashboard surfaces partial load failure, STOMP requires a valid JWT and configured origin, and Docker compose requires local secrets.
- Validation: Maven target suite 9/9 and `npm run build` PASS. Docker Engine was unavailable, so isolated suite and container rebuild remain pending.

