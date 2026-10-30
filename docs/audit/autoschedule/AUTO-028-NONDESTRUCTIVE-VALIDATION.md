# AUTO-028 — Validation không phá hủy của Auto‑Scheduler

Ngày 25/10/2026.

## Vấn đề

`AutoScheduleService` từng xóa ca DRAFT ngoài giờ mở cửa, đồng thời xóa các phân công của ca đó. Đây là ghi dữ liệu ngầm trong thao tác xếp lịch và trái với yêu cầu người dùng phải tự xử lý ca không phù hợp.

## Thay đổi

- Giữ nguyên ca DRAFT và mọi phân công của nó.
- Loại ca ngoài giờ khỏi *lần xếp hiện tại*, trả `validationWarnings` trong `AutoScheduleResult`, và không auto-fill quota nếu toàn bộ DRAFT hiện có đều cần chỉnh giờ.
- Web hiển thị cảnh báo “Ca chưa được xếp tự động” bên cạnh số liệu kết quả đã lưu.
- Đây chưa phải dry-run: `POST /auto-schedule` vẫn là thao tác lưu. `validationWarnings` chỉ làm rõ những ca không được xử lý trong lần lưu đó.

## Bổ sung — phương án thử không lưu

- `AutoScheduleRequest.dryRun=true` chạy cùng thuật toán, trả số nhu cầu/phân công/thiếu/độ phủ/giờ nhu cầu, rồi đánh dấu transaction rollback. Spatial allocation không chạy trong dry-run.
- Auto-Scheduler Visualization có hai thao tác tách biệt: `Thử phương án` và `Xếp & lưu`. Kết quả thử chỉ so sánh tác động tổng hợp; không giả vờ hiển thị danh sách nhân viên cụ thể khi backend chưa trả assignment preview.
- Chạy lưu lại sẽ thực hiện thuật toán trên dữ liệu mới nhất, do đó giao diện không hứa phương án lưu sẽ trùng tuyệt đối bản thử nếu dữ liệu đã đổi.

## Kiểm chứng

- Maven: `AutoScheduleAssignmentCorrectnessTest` + `AutoScheduleFeasibilityAndShortageTest` đạt 40/40 ngày 25/10/2026.
- Web: visualization model 3/3 và `npm run build` PASS.
- Docker/PostgreSQL thật 25/10: đăng nhập manager PVD, gọi `POST /api/stores/20000000-0000-0000-0000-000000000001/shifts/auto-schedule` với `dryRun:true` cho ngày 25/10/2026. Response `dryRun=true`, `PARTIALLY_COVERED`, demand 13, assigned 5, shortage 8, `NOT_RUN_DRY_RUN`; số `shift_assignment` cùng store/ngày trước/sau đều 0. Không ghi phân công.
- Chưa có test giao dịch riêng cho nhánh auto-fill quota hay Edge thật; cần bổ sung trong lượt regression tiếp theo.
