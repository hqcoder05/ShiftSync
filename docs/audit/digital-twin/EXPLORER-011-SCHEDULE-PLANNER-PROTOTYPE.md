# EXPLORER-011 — Bản thử 3D Schedule Planner

Ngày19/10/2026; branch quoc-backend, baseline c9d4df1. Yêu cầu: làm thử chức năng trong ảnh người dùng, gồm ngày/khung giờ, Matrix–Timeline–Spatial, click vị trí trống tìm ứng viên, cảnh báo trùng/không hợp lệ. Tái sử dụng PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP, EXPLORER-010 và ShiftService/ShiftAssignmentValidator đã có. Không commit/push, không ghi dữ liệu backend thật.

## Bản thử được triển khai
- Entry **Lập lịch ca → 3D Schedule Planner**. SchedulePage viewMode Planner có shell riêng; giữ luồng lịch ngày/tuần và Interactive Store cũ.
- SchedulePlanner giữ ngày, ca, mốc giờ, khu vực và draft chung cho3 góc nhìn. Matrix là khu vực×ca với thiếu/đủ người và ô trống. Timeline là thanh ca theo giờ, có thang mở rộng qua ngày hôm sau. Spatial tái sử dụng canvas/GLB/avatar thật; click zone hoặc workstation đã bind mở ứng viên của khu vực tương ứng.
- Danh sách ứng viên dùng GET /stores/{storeId}/shifts/{shiftId}/eligible-staff. EmploymentDTO có staffId/staffFullName; ghép hồ sơ nhân viên theo staffId, không dùng employmentId làm staffId. Endpoint backend hiện có kiểm tra lịch rảnh/nghỉ phép/trùng lịch/giờ làm/kỹ năng ca. Client kiểm tra thêm draft overlap, capacity khu vực và kỹ năng khu vực khi metadata yêu cầu được cung cấp. Người không đủ điều kiện bị khóa kèm lý do.
- Thêm người chỉ tạo draft phía client. Các view cùng hiển thị draft; Hoàn tác hoặc bỏ từng dòng. Rời Planner qua nút quay lại có cảnh báo draft chưa lưu. Chỉ ADMIN/MANAGER được thêm/áp dụng; các vai trò khác chỉ xem, quyền thực tế vẫn do API xác nhận.
- Áp dụng kiểm tra lại eligibility ngay trước từng POST assignment, luôn force=false (payload không gửi force=true). Backend từ chối thì giữ draft chưa lưu và hiện lỗi; thành công mới loại draft tương ứng, refresh lịch. Luồng có khóa chống double-submit và xử lý kết quả lưu từng phần, không phải transaction nhiều phân công.
- Cảnh báo dữ liệu đã tải: một nhân viên trùng ca (kể cả qua đêm/ngày khác), thiếu staffId, zone không hợp lệ, vượt capacity. Hiển thị khoảng giờ giao nhau và Xem phân công→Matrix đúng ngày/ca/khu vực.

## Các chỉnh sửa dùng chung cần thiết
- planningMode của SpatialWorkspace ẩn header/inspector/timeline trùng với shell Planner, nhận thời điểm và callback chọn khu vực. Không thay chế độ mặc định của Interactive Store.
- Nhãn3D dùng camera view depth để tính đúng pixel khi focus; camera/first-person update trước labels trong frame. Khắc phục nhãn phóng quá lớn/chồng nhau lúc tiến sát quầy.
- Zone-only avatar dùng physicalFrame của quầy để đứng sau quầy nhưng không tạo workstationId giả. Đợi mô hình GLB sẵn sàng trước khi tạo avatar để tránh xuất hiện ở tọa độ zone API cũ; có fallback khi mô hình lỗi. Snapshot physical zone dùng chung từ EXPLORER-010 được tái sử dụng.

## Kiểm chứng
- **135/135 unit/integration tests pass**,20 suites: gồm128 tests trước đây,6 planner model tests và1 zone-only staff anchor test. Bao phủ overlap qua ngày/ca liền kề, cancel, capacity, missing ID, skill/eligibility gate, draft không mutation server.
- **npm run build pass**; còn cảnh báo chunk>500kB. git diff --check SchedulePage/SpatialWorkspace đạt.
- **20/20** scripts/test-schedule-planner.browser.cjs tại1920×1080: real raycast→cashier zone→candidates; đo nhãn<=177px khi focus; draft không POST, giữ qua3views, protected exit, undo, avatar draft sauPOS, duplicate block, eligibility thay đổi trước apply ngăn POST và giữ draft, một POST khi hợp lệ với force=false; cảnh báo overlap + giờ + điều hướng; ngày không ca; không console/uncaught errors.
- Hồi quy hiện có: **33/33** full-page mock journey và **14/14** experience fixes journey đạt sau thay đổi camera/avatar. GLB/WebGL thật, tất cả API/session mock.503 trong suite experience là lỗi tạo có chủ ý để kiểm tra retry.
- Judge độc lập theo design-ux: Matrix/Timeline đọc rõ; warning có giờ và đường tới phân công; nhãn Spatial đã sửa kích thước và không chồng. Không còn blocker/major trực quan trong ảnh đã xem. Ảnh .playwright-mcp/planner-011-spatial.png, planner-011-matrix.png, planner-011-timeline.png, planner-011-conflict.png.
- scripts/demo-schedule-planner.browser.cjs mở demo Matrix với Thu ngân trống và MOCK Linh đủ điều kiện; không POST. Ảnh .playwright-mcp/planner-011-demo.png. Trình duyệt cuối ở /schedule,1920×1080.

## Phạm vi và giới hạn bản thử
- Trạng thái: PROTOTYPE_IMPLEMENTED_WITH_VERIFIED_MOCK_JOURNEYS. Không chứng minh lưu qua JWT/backend thật trong đợt này; không sửa entity/API/migration. Khi dùng phiên thật, Apply gọi API hiện có và có thể ghi phân công thật theo quyền người dùng.
- Draft nằm trong phiên component, không đồng bộ nhiều người, không lưu bền khi refresh/đổi store từ bên ngoài. Cảnh báo và ranking client chỉ dựa dữ liệu lịch/kỹ năng đã tải; API là nguồn quyết định cho điều kiện chưa có ở client hoặc lịch chi nhánh khác.
- Phân công là cấp zone do endpoint assignment hiện có nhận zoneId; không tự gán workstationId hay thiết bị. Eligibility theo ca không thay thế kiểm tra chứng chỉ/kỹ năng vùng nếu metadata client thiếu.
- Chưa thêm kéo thả giữa ca, đổi giờ bằng kéo thanh, chỉnh/xóa phân công đã lưu, tối ưu toàn bộ staffing hoặc xử lý conflict tự động. Các cảnh báo hiện là phát hiện và đường tới dữ liệu, không âm thầm sửa lịch thật. Không coi các mục này là đã triển khai từ ảnh yêu cầu.
