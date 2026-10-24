# NAV-011 — Thiết kế lại Navbar ShiftSync

Ngày: 20/10/2026. Branch: `quoc-backend`; baseline tham chiếu: `c9d4df1`.

## Phạm vi và tri thức tái sử dụng

Người dùng gọi skill senior-frontend và yêu cầu thiết kế lại Navbar. Đã đọc PROJECT_CONTEXT/TASK_MEMORY, tra CODEBASE_MAP/AUDIT_INDEX/CHANGELOG và kiểm tra working tree. Tái sử dụng NAV-010 (Cài đặt luôn dễ tìm), THEME-001/002 (bốn palette và contrast/surface), NotificationBell/MainLayout APIs hiện hành và EXPLORER-013 (đường dẫn 3D, chiều cao workspace).

Đọc skill senior-frontend cùng frontend_best_practices; áp dụng semantics, focus/keyboard, kiểm tra theo browser. Tái sử dụng design-ux để có judge độc lập trên ảnh render thật. Không sửa backend/dependency, không commit/push hoặc đụng dữ liệu thật. Mọi thay đổi dở dang khác được giữ nguyên.

## Thiết kế và hành vi đã áp dụng

- Navbar 112px: hàng đầu64px cho thương hiệu, cửa hàng, tìm trang, sáng/tối, thông báo và tài khoản; hàng điều hướng48px cho các nhóm chức năng và shortcut Cửa hàng3D. Trạng thái trang hiện tại có nền/đường nhấn; Cài đặt giữ vị trí trực tiếp. Laptop1440 vẫn hiện đầy đủ các nhóm.
- <=1020px chuyển thành context row giữ tên cửa hàng/trang hiện tại và drawer có accordion. Tìm trang/thông báo/tài khoản vẫn hiện trên điện thoại. Drawer có nút đóng, backdrop, focus trap, Escape và trả focus về nút mở; không giữ body scroll khi modal mở.
- Dropdown dùng button/links thật, aria-expanded/controls/current, nội dung chỉ mount khi mở; ArrowDown/ArrowUp tới link đầu/cuối, Escape/outside click đóng. MainLayout key Navbar theo pathname+search để navigation đóng mọi popover và cleanup focus/scroll locks. Skip link tới main.
- Chọn trực tiếp từ danh sách stores thay thao tác chuyển vòng. MainLayout xác minh ID, cập nhật selectedStoreId/localStorage, phát storeChanged; listener đồng bộ khi trang con đổi store. Không hiện tên cửa hàng mẫu khi danh sách trống.
- Tìm **trang và chức năng**, không phải tìm nhân viên hay dữ liệu nghiệp vụ: Ctrl/CmdK, lọc tiếng Việt có/không dấu, Enter/ArrowDown, empty state và focus trap. Destinations theo cùng nhóm điều hướng; HR/chi phí quản lý không hiện cho STAFF. Đây là affordance UI, không thay RBAC backend.
- Menu Cài đặt và tài khoản dẫn đúng tab qua query `tab=appearance/schedule/permissions`; SettingsPage đọc URL và giữ lựa chọn tab nội bộ, không setState đồng bộ trong effect mới. Bốn link settings không còn cùng trỏ một URL gây nhiều active items.
- Giữ NotificationBell/callback API thật, badge lấy counts, không dựng sample notifications tại Navbar khi thiếu dữ liệu. Bell Escape trả focus về trigger. Bỏ export hằng nội bộ không dùng ngoài component và memo safeItems để lint module sạch.
- navbar.css giữ các token theme; navbar-layout.css chứa layout mới, thay phần layout legacy dài/không còn dùng. Giữ bốn style, light/dark, contrast/surface và reduced motion. Avatar surface dùng chữ/nền tương phản; notification badge đỏ đậm/chữ trắng.
- SchedulePage dùng `--ss-navbar-height` cho min-height và explorer height để canvas/timeline không vượt màn hình sau khi header cao hơn. Nút 3D trỏ /schedule?view=3d và dùng model Oak & Moss hiện có.
- Nút sidebar cũ không còn trong Navbar vì shell hiện tại không render sidebar tương ứng. Callback legacy trong MainLayout chưa được mở rộng thành tính năng mới; không thay module Header cũ chưa dùng trong MainLayout.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Build Vite cuối | PASS,917ms; chunk >500kB warning có sẵn còn nguyên |
| ESLint Navbar.jsx + NotificationBell.jsx | PASS,0 errors/warnings |
| Spatial + Planner unit/integration | 144/144 PASS,20 suites |
| Navbar browser suite | 29/29 PASS |
| Store Explorer full regression | 33/33 PASS |
| git diff --check các file tracked đã sửa | PASS (chỉ CRLF notice) |

`scripts/test-navbar.browser.cjs` chạy trang /schedule và /settings thật,1920×1080/1440×900/390×844; mock API/session trong browser, không gọi callback thay cho tương tác UI. Kiểm tra: sáu nhóm/active/settings, store picker/context, keyboard/outside/Escape/focus, search không dấu/empty/Enter/CtrlK, Settings đúng tab, theme persistence, badge/API content/PUT read-all,3D model thật+viewport fit, mobile drawer/search/notifications,8 palette+nav-style combinations, STAFF destinations và logout. Không uncaught application errors; mutation duy nhất là PUT read-all trên fixture. Kết thúc1920×1080, mock manager restored.

Store regression dùng fixture ngày19/10/2026, vì script cũ có ngày cố định; Playwright setFixedTime chỉ cho đợt regression rồi trả về thời gian thực. Không đổi đồng hồ hệ thống. API/session vẫn mock, GLB/WebGL thật. Không coi browser fixture là bằng chứng JWT/persistence thật.

Đo bổ sung contrast cho bốn nhóm chữ nhỏ (store eyebrow, role, avatar initials, tab) qua16 tổ hợp light/dark ×4palette ×2nav-style: nhỏ nhất4,7588:1, không dưới4,5:1. Đây là kiểm tra chọn lọc, không chứng nhận WCAG toàn ứng dụng. Header còn fit320px; nội dung calendar bên dưới có document overflow355px tại320, ngoài phạm vi Navbar;390px không tràn ngang trong fixture.

ESLint trên cả MainLayout/SettingsPage còn5 lỗi trước đó: fetchCounts effect, Settings loading unused/loadConfigForStore reference và storeOpen/storeClose chưa định nghĩa. Các lỗi do code mới ở Navbar/query effect đã được xử lý, không tắt rules. Không tuyên bố toàn repository lint sạch. Không chạy thao tác lưu settings trong fixture.

Lần đầu browser test click vùng calendar để đóng menu đã mở modal tạo ca; sửa tọa độ test sang vùng trống. Lần kế tiếp đọc tab ngay sau URL change nhanh hơn React commit; thêm đợi active tab hiển thị rồi assertion. Không đổi ứng dụng để bỏ qua lỗi test; suite cuối29/29 đạt.

## Review độc lập và ảnh

Judge xem wide/menu/search/mobile/drawer, không thấy blocker/major. Hai minor ban đầu (hai dấuX, chữ Phân quyền nhìn nhạt lúc animation) đã được chỉnh/chụp lại sau animation; judge lần hai không còn minor đáng kể trong menu/drawer. Ngăn lỗi khi đổi store có draft chưa lưu và trạng thái backend lỗi không được chứng minh bằng ảnh; không suy rộng.

Ảnh thật: `.playwright-mcp/navbar-011-wide.png` (first load), `navbar-011-menu.png`, `navbar-011-search.png`, `navbar-011-dark.png`, `navbar-011-laptop.png`, `navbar-011-mobile.png`, `navbar-011-drawer.png`, `navbar-011-store.png`, `navbar-011-detail.png` (crop screenshot vùng tương tác), `navbar-011-verified.png`.

## Giới hạn

Chưa có authenticated API/DB journey thật, screen reader hoặc thiết bị cảm ứng thật. Store fetch failure vẫn theo hành vi parent hiện hữu; search chỉ tìm destinations local. Ràng buộc dữ liệu chưa lưu khi đổi store từ Navbar chưa được thêm trong task này. Giữ nguyên thông báo/lịch sử API và các giới hạn hệ thống từ EXPLORER-013.
