# SCROLL-014 — Khôi phục cuộn sau menu và tìm kiếm

Ngày 20/10/2026. Branch `quoc-backend`, baseline `c9d4df1`. Người dùng báo nhiều trang cuộn được nhưng nội dung cuối bị che hoặc không thể cuộn đến.

## Chẩn đoán và sửa

- Kiểm tra layout dùng chung: `html`, `body`, `#root`, `.ss-app-shell`, `<main>` không có giới hạn chiều cao/`overflow:hidden` cố định. Trong phiên mock sạch, wheel đến đúng đáy Dashboard, Settings và Requests.
- `Navbar.jsx` là nơi duy nhất đặt `document.body.style.overflow = "hidden"` khi mở menu di động hoặc tìm kiếm. Trước sửa, nếu một trạng thái khóa cuộn còn sót, Navbar mới sau chuyển route không xóa khóa khi mọi lớp phủ đã đóng. Đã tái hiện bằng cách đặt trạng thái khóa rồi điều hướng: trang Settings giữ `overflow:hidden` và wheel dừng trước đáy.
- Effect Navbar hiện khai báo trạng thái cuộn theo trạng thái menu/tìm kiếm ở mỗi lần mount/update: khóa khi lớp phủ mở, xóa khóa khi đóng và khi unmount. Nhờ vậy chuyển trang tự phục hồi trạng thái cuộn. Không đổi CSS/layout của từng trang.

## Đối chứng

- `scripts/test-global-scroll.browser.cjs`: **9/9** kiểm tra trên app routed, session/API mock: Dashboard, Settings, Requests và mobile Dashboard cuộn tới `scrollY == scrollHeight - clientHeight`; trạng thái khóa mở/đóng menu và tìm kiếm; không có page error.
- Thử ở 1920×600 và 390×844; màn hình trả về 1920×1080. `npm run build` PASS, ESLint `Navbar.jsx` PASS, `node --check` test script PASS.
- Ảnh đáy: `.playwright-mcp/scroll-fix-dashboard-bottom.png` và `scroll-fix-settings-bottom.png`. `/schedule?view=3d` giữ `body overflow` rỗng, canvas kết thúc tại y=1072/1080 và không tạo cuộn trang.

## Giới hạn

- Trường hợp khóa cuộn còn sót là một khả năng tái hiện được của lớp layout chung; chưa có dấu vết trực tiếp từ trình duyệt của người dùng để khẳng định đó là nguyên nhân duy nhất. Browser test dùng API/session mock, chưa đối chứng dữ liệu thật hoặc trang cụ thể mà người dùng đang xem.
- Các vùng cuộn nội bộ của bảng, lịch và danh sách vẫn dùng cơ chế riêng; test xác nhận cuộn tài liệu chính, không chứng nhận mọi vùng cuộn trong mọi trạng thái dữ liệu.

## Bổ sung theo phản hồi: khoảng cuộn ở cuối trang

- `MainLayout.jsx` hiển thị footer chung sau nội dung chính; `MainLayout.css` giữ `<main>` ít nhất bằng chiều cao vùng nhìn dưới Navbar và thêm footer cao 128px. Nhờ vậy sau khi cuộn tới cuối, thẻ cuối nằm trên footer thay vì sát đáy màn hình.
- Footer tự ẩn khi `SchedulePage` hiển thị `.sch-page--explorer` (3D hoặc Planner), kể cả khi bật bằng nút trong trang. Điều này giữ canvas toàn màn hình không bị đẩy xuống.
- Playwright với session/API mock: Dashboard, Settings và Requests ở 1920×600 đều cuộn tới footer (`scrollY == scrollMax`, footer cao 128px); Dashboard 390×844 tới đáy trong sai số 1px; `/schedule?view=3d` ẩn footer và `scrollMax=0`. Chuyển trạng thái Schedule tuần → 3D → tuần cũng đổi footer `flex → none → flex`. Để lại trình duyệt 1920×1080. `npm run build` và 9/9 kiểm tra cuộn cũ PASS.
