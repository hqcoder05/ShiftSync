# AUTO-038 — Xem trước phân công cụ thể

## Backend

AutoScheduleResult có plannedShifts: snapshot đầy đủ của từng ca DRAFT hợp lệ trong
lượt xếp, gồm ngày/giờ, trạng thái, định biên, người được phân công, nguồn phân công,
kỹ năng, khu vực và workstation nếu có. Snapshot chứa cả các phân công không phải AUTO
được giữ lại và các AUTO mới sau repair; không chỉ trả danh sách thêm mới.

AutoSchedulePlanMapper materialize DTO khi transaction còn mở. Không trả entity JPA
hoặc giữ tham chiếu entity có thể thay đổi. Danh sách assignment lọc soft-delete và
sắp xếp định danh ổn định. Ca không được xử lý vì published hoặc validation warning
không bị ghi đè; frontend giữ ảnh chụp trước của các ca đó khi ghép phương án.

Dry-run vẫn thực hiện trong transaction rollback, trả ID của ca/assignment có thể chỉ
tồn tại trong lần thử. Các ID đó không dùng để cập nhật dữ liệu lưu. Spatial allocation
vẫn NOT_RUN_DRY_RUN; preview có vị trí từ requirement, chưa hứa vị trí sau bộ phân bổ 3D.
Lần chạy lưu cũng có snapshot, nhưng giao diện tiếp tục đọc lại lịch đã commit để xác
nhận trạng thái thật.

## Frontend

Sau “Thử phương án”, hiển thị tab Phương án thử, tên người cụ thể, phân công giữ/thay,
và cho phát lại trong modal. Ghép theo snapshot đầy đủ, nên AUTO cũ không còn trong
phương án sẽ biến mất; phân công tay vẫn giữ. Ca mới từ định biên xuất hiện dù lịch
trước đó trống. Gắn previewOnly ở mô hình giao diện và không đưa phương án thử ra
bảng tuần có các thao tác sửa ca.

Không có nhãn “Lịch đã lưu” hoặc nút tải kết quả đã lưu cho response dry-run. Nếu backend
cũ thiếu plannedShifts, dữ liệu lỗi, trùng ID, sai cửa hàng/ngày hoặc không xác nhận dryRun,
hiển thị lỗi và không giả lập danh sách người từ số lượng. Bảng định biên trước khi xếp
đọc đúng snapshot trước, kể cả khi đã có kết quả thử.

Tại thời điểm mốc này, nút còn là “Chạy lại & lưu theo dữ liệu mới”. Mốc tiếp theo
AUTO-039-STORED-PLAN-APPLY.md thay bằng áp dụng chính xác preview lưu ở server với
kiểm soát phiên bản. Phương án có dữ liệu đầu vào thay đổi bị từ chối và cần tạo lại.

## Kiểm chứng

- AutoSchedulePlanMapperTest: người/skill/zone/workstation/source đúng, giữ manual,
  bỏ soft-delete, counts đúng, snapshot không đổi khi entity bị thay, ca trống rõ ràng.
- PostgreSQL: DTO serialize và đọc được sau rollback; ca tạo từ định biên có snapshot
  nhưng không còn trong DB; dry-run thay AUTO trong phương án nhưng khôi phục hàng AUTO
  cũ và giữ manual sau rollback. ID của assignment thử không tồn tại trong DB.
- visualizationModel.test.js: 8 tests đạt, gồm thay ảnh chụp, giữ ca published, ca mới,
  bỏ AUTO cũ, dữ liệu lỗi và nhầm cửa hàng/khoảng ngày/saved response.
- 413 tests backend liên quan đạt; 27 PostgreSQL opt-in tests chạy riêng đạt. 0 failure/error.
  XML PG giữ trong target/scheduler-postgres-evidence.
- Frontend production build đạt; vẫn có cảnh báo chunk lớn từ trước.
- Edge 156 headless: dùng response JSON thật từ PostgreSQL test, route mock chỉ đổi
  storeId để ghép đúng ngữ cảnh demo. Một request dry-run, không request lưu; tên người
  hiện trong bảng, tab thử được chọn, nút replay bật, không có tab saved/nút replay ra
  bảng tuần. Ảnh target/concrete-preview-edge.png. Đây là kiểm tra UI với API mock,
  không phải full-stack test trên datasource demo. Không bấm chạy lưu hay reset demo.

## Còn lại

Lý do chọn từng người, điểm phương án cuối, so sánh solver và benchmark
tải chưa hoàn thành. Phạm vi mục tiêu giữ nguyên; preview cụ thể chỉ là một mốc tiếp theo.
