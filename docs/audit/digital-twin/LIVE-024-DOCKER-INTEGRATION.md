# LIVE-024 — Web nối Docker backend (22/10/2026)

## Kết quả
- Gỡ page/context HTTP routes, đóng các tab có page WebSocket mock, mở page mới không interception. Xóa fake auth session có sentinel và sau khi backup+chuyển thiết kế xóa fixture-design/manager-fixture drafts. Không gọi lại fixture suite trong tab người dùng.
- Docker Engine ban đầu offline; khởi động Docker Desktop, containers tự restart theo policy. Backend8080, PostgreSQL5432/Redis6379 healthy; không rebuild/migration mới.
- Vite proxy /api và /ws về127.0.0.1:8080; REST default /api, WS derive cùng origin. Devproxy gửi Originlocalhost:3000 khớp Spring CORS hiện có (lần login đầu403 trước sửa, sau sửa200). Production cần reverseproxy /api,/ws hoặc VITE_API_URL chỉ endpoint thật.

## Kiểm chứng thật
- Edge155 1920×1080, login qua UI bằng tài khoản manager.pvd quickfill đã có sẵn trên trang login, authHTTP200/JWT thật. Không ghi token vào báo cáo.
- GET stores/usersme/zones/workstations/shifts/attendance/design/versions200; cửa hàng ShiftSync Pham Van Dong Store20000000-0000-0000-0000-000000000001;3zones/2workstations/20shifts/1attendance. Đây là dữ liệu hiện có trong PostgreSQL, có thể là seed phát triển, không còn Playwright response fixtures.
- Browser WS ws://127.0.0.1:3000/ws/websocket nhận STOMP CONNECTED. Không kiểm trigger attendance event nghiệp vụ mới.
- Snapshot backend ban đầu revision0/documentnull, table store_design_versions0rows. Backup bản người dùng18items ra docs/backups/store-design-18-items-2026-10-22.json. Bản import docs/backups/store-design-pvd-live-import-2026-10-22.json giữ bố trí, bind barista→WS041/cashier→WS042 thật; đổi tên MOCKespresso thành tên WS thật. Không ghi đè thiết kế backend đã có vì chưa có bản nào.
- UI import18items/savePUT200revision1; close khôngunsavedwarning; reload/reopen header Phiên bản1,18items, savebuttondisabled. PostgreSQL query store_id/revision/jsonb_array_length(document::jsonb->'items') → PVD|1|18. Đây là ghi thật vào DB, khác EXPLORER023.
- Smoke GET4pages: dashboard36requests/marketplace34/employees18/attendance28, khôngHTTP>=400/pageerror/MOCKtext. Không thực hiện mutation chấm công/nhân sự/chợca.
- Build PASS(chunkwarning cũ), lintviteconfig/api PASS. Ảnh .playwright-mcp/live-backend-applied-1920.png đã xem; cuối phiên Edgeởschedule3D1920, kết nối live.
- Không backend source changes/deps/commit/push; bảo tồn dirtytree.
