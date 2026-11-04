# ShiftSync Backend

## AutoSchedule

AutoSchedule filters candidates through hard constraints before applying configured soft scoring. The current verified contract is:

- Skill and skill expiry are hard constraints.
- Availability is a hard constraint; eligible candidates receive `availabilityScore = 1.0`.
- Leave, blackout, overlap, minimum rest, weekly and contract limits are enforced before assignment.
- Monthly fairness uses global employee workload, including qualifying cross-store workforce-sharing assignments.
- Local Repair preserves hard constraints and may rescue coverage before applying soft fairness/score preferences.
- Spatial allocation is reported separately from staffing coverage.

## Marketplace and shift swap

Open Shift claims use the backend's concurrency protection and create an `OPEN_SHIFT` assignment when the claim is valid. Shift swap remains a two-step flow: the other employee accepts, then a manager approves.

## Đối soát điều khoản lương lịch sử

Các bản ghi tạo khi nâng cấp phản ánh mức lương tại ngày nâng cấp; chúng không xác nhận mức lương trước đó. Quản trị viên cần kiểm tra chứng từ trước khi bổ sung lịch sử; hệ thống không tự suy đoán mức lương cũ.

- `GET /api/stores/{storeId}/payroll/compensation-history/{type}/{entityId}` xem các mốc và căn cứ đối soát. `type` là `employment`, `contract_type` hoặc `skill`. Chỉ ADMIN được truy cập.
- `POST /api/stores/{storeId}/payroll/compensation-history/{type}/{entityId}/reconciliations` bổ sung một mốc trước mốc sớm nhất đã biết. Gửi các mốc từ gần đến xa trong quá khứ; mỗi yêu cầu cần `effectiveDate`, `hourlyRate` và `evidence` (10–2000 ký tự). Với `employment`, gửi thêm `contractTypeId`; với `contract_type`, gửi thêm `maxWeeklyHours` và `otMultiplier`.
- Mốc bị từ chối nếu ảnh hưởng kỳ lương đã xác nhận/thanh toán, thuộc chi nhánh khác, hoặc có thay đổi cũ chưa được ghi ngày hiệu lực.
- Với `untrackedChanges=true`, kết quả GET liệt kê các `untrackedItems` theo thứ tự ghi nhận, gồm mã, thời điểm ghi nhận và giá trị trước/sau. Thời điểm ghi nhận không phải ngày hiệu lực. Sau khi đối chiếu chứng từ, ADMIN gửi `POST .../{type}/{entityId}/untracked-reconciliations` với `changes`: danh sách đầy đủ theo đúng thứ tự, mỗi phần tử gồm `historyId`, `effectiveDate` và `evidence`. Ngày phải tăng dần, không ở tương lai và có mốc trước đó khớp với giá trị cũ. Toàn bộ yêu cầu được lưu hoặc hủy cùng nhau; kỳ lương đã khóa được bảo vệ.

Ví dụ phần thân cho một mốc lương nhân viên:

```json
{"effectiveDate":"2024-01-01","hourlyRate":27000,"contractTypeId":"00000000-0000-0000-0000-000000000001","evidence":"Hợp đồng và bảng lương gốc đã kiểm tra"}
```

UUID trong ví dụ phải được thay bằng hợp đồng thực tế thuộc chi nhánh. Xem [báo cáo kiểm tra backend](../docs/audit/backend/BACKEND-2026-10-29-FINDINGS.md) để biết các hạn chế và trạng thái xác minh.

# Khóa ký đăng nhập

Đặt `JWT_SECRET` thành một giá trị ngẫu nhiên riêng, tối thiểu 32 byte, trong biến môi trường hoặc tệp `shiftsync-backend/.env` trước khi chạy backend. Khi dùng Docker Compose, đặt biến này trong môi trường hoặc tệp `.env` ở thư mục gốc dự án. Không đưa khóa thật lên Git.
