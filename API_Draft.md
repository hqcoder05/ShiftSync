# ShiftSync — API Contract và thiết kế bảo mật

## 1. Phạm vi tài liệu

Tài liệu này mô tả contract API hiện tại của ShiftSync Backend, quy ước request/response, phân quyền và các nhóm nghiệp vụ chính. Danh sách endpoint chi tiết được duy trì trong [API_LIST.md](API_LIST.md). Swagger UI có tại `/swagger-ui/index.html` khi Backend chạy.

Base path hiện tại là `/api`. Các endpoint yêu cầu xác thực sử dụng:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

## 2. Kiến trúc API

Backend sử dụng modular monolith. Mỗi module có Controller nhận HTTP request, DTO cho contract, Service xử lý business rule và Repository truy cập PostgreSQL qua JPA.

```text
HTTP request
  → Spring Security/JWT
  → Controller
  → request DTO validation
  → Domain Service
  → Repository/Entity
  → response DTO
```

Các module API hiện có:

```text
auth, store, employment, skill, availability, leave,
shift, layout, marketplace, workforce, attendance,
payroll, notification, request, audit, quota
```

## 3. Authentication và session

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập và cấp token |
| POST | `/api/auth/refresh` | Làm mới token |
| POST | `/api/auth/logout` | Đăng xuất và thu hồi phiên |
| GET | `/api/users/me` | Lấy profile người dùng hiện tại |
| PUT | `/api/users/me` | Cập nhật field profile được phép |

JWT được kiểm tra ở Security filter. Password phải được hash bằng BCrypt và không được trả về trong DTO.

## 4. User, store và employment

| Nhóm endpoint | Chức năng |
|---|---|
| `/api/users` | Tạo, đọc, cập nhật, xóa và tìm kiếm user theo quyền |
| `/api/stores` | CRUD store, danh sách branch và dashboard |
| `/api/stores/{storeId}/staff` | Gán, xem, cập nhật và remove staff khỏi store |
| `/api/users/{staffId}/stores` | Lấy các store mà staff thuộc về |
| `/api/stores/{storeId}/contract-types` | Quản lý loại hợp đồng |
| `/api/stores/{storeId}/configuration` | Đọc/cập nhật store configuration |

Các endpoint có `storeId` phải kiểm tra quyền truy cập store; không chấp nhận store ID chỉ dựa trên dữ liệu gửi từ client.

## 5. Skill và availability

| Nhóm endpoint | Chức năng |
|---|---|
| `/api/stores/{storeId}/skills` | CRUD skill của store |
| `/api/availability` | Staff tạo, xem, sửa và xóa availability của chính mình |
| `/api/availability/users/{userId}` | Manager/Admin xem availability của staff trong phạm vi quyền |
| `/api/holidays` | Quản lý ngày lễ |

Availability được kiểm tra overlap và hỗ trợ các khoảng thời gian hợp lệ theo ngày làm việc. Business rule scheduler phải dùng cùng dữ liệu availability này.

## 6. Leave và request

| Nhóm endpoint | Chức năng |
|---|---|
| `/api/stores/{storeId}/leave-requests` | Tạo, xem, approve, reject và xóa leave request |
| `/api/requests` | Staff request, đổi ca và các workflow yêu cầu |
| `/api/users/me/swaps` | Tạo và xem yêu cầu đổi ca của user hiện tại |
| `/api/swaps/{requestId}/approve` | Manager approve swap |
| `/api/swaps/{requestId}/reject` | Manager reject swap |
| `/api/swaps/{requestId}/cancel` | Người tạo hủy swap khi trạng thái cho phép |

Leave đã được approve phải được scheduler và manual assignment validation tôn trọng.

## 7. Shift và AutoSchedule

| Endpoint | Chức năng |
|---|---|
| `/api/stores/{storeId}/shifts` | CRUD shift và lọc theo trạng thái |
| `/api/stores/{storeId}/shifts/{shiftId}/requirements` | Thiết lập skill/headcount requirement |
| `/api/stores/{storeId}/shifts/demand-planning` | Cập nhật demand cho shift/date range |
| `/api/stores/{storeId}/shifts/auto-schedule` | Chạy AutoSchedule |
| `/api/stores/{storeId}/shifts/{shiftId}/eligible-staff` | Lấy candidate đủ điều kiện |
| `/api/stores/{storeId}/shifts/publish` | Publish các shift |
| `/api/stores/{storeId}/shifts/{shiftId}/assignments` | Xem, tạo và xóa assignment |
| `/api/stores/{storeId}/scheduler-config` | Cập nhật trọng số scheduler |

AutoSchedule phải kiểm tra active employment, skill và expiry, availability, leave, blackout, overlap, contract hours, minimum rest và các requirement trước khi persist `AUTO` assignment.

## 8. Marketplace và workforce sharing

| Nhóm endpoint | Chức năng |
|---|---|
| `/api/stores/{storeId}/marketplace/shifts` | Publish, unpublish và xem open shifts |
| `/api/stores/{storeId}/marketplace/shifts/{shiftId}/claim` | Staff claim open shift |
| `/api/stores/{storeId}/workforce-requests` | Tạo, xem, cancel, reject request chia sẻ nhân lực |
| `/api/stores/{storeId}/workforce-requests/{id}/proposals` | Tạo proposal cho request |
| `/api/users/me/workforce-proposals` | Staff xem proposal nhận được |
| `/api/users/me/workforce-proposals/{id}/respond` | Staff accept/reject proposal |

Claim và proposal response phải xử lý trạng thái cạnh tranh, eligibility và store scope ở Backend.

## 9. Layout và spatial allocation

Các endpoint layout hỗ trợ prefix `/api/stores/{storeId}` và alias `/api/locations/{storeId}`:

| Endpoint | Chức năng |
|---|---|
| `/layout` | Tạo và lấy store layout |
| `/zones` | CRUD store zones |
| `/workstations` | CRUD workstations |
| `/shifts/{shiftId}/allocate-zones` | Phân bổ zone cho assignment của shift |

Spatial allocation chỉ bổ sung vị trí làm việc sau khi assignment đáp ứng business rule staffing.

## 10. Attendance và payroll

| Nhóm endpoint | Chức năng |
|---|---|
| `/api/attendance/selfie` | Check-in/out bằng selfie và tọa độ |
| `/api/attendance/scan` | Check-in/out bằng mã scan/QR |
| `/api/attendance/me` | Lịch sử attendance của staff hiện tại |
| `/api/stores/{storeId}/attendance` | Manager xem attendance theo khoảng ngày |
| `/api/stores/{storeId}/attendance-adjustments` | Tạo và duyệt adjustment request |
| `/api/stores/{storeId}/payroll` | Payroll periods của store |
| `/api/stores/{storeId}/payroll/generate` | Tạo payroll từ attendance/assignment |
| `/api/users/me/payslips` | Staff xem payslip của chính mình |
| `/api/stores/{storeId}/payroll/{periodId}/export/excel` | Export payroll Excel |

Payroll Mobile/Web chỉ hiển thị payslip Backend trả về; không dùng schedule để tự tính estimated payroll.

## 11. Demand planning và quota

| Endpoint | Chức năng |
|---|---|
| `/api/branches` | Danh sách branch |
| `/api/positions` | Danh sách position |
| `/api/headcount-quotas` | Quota theo ngày/position/branch |
| `/api/headcount-quotas/weekly` | Ma trận quota theo tuần |
| `/api/headcount-quotas/summary` | Coverage và shortage summary |
| `/api/headcount-quotas/auto-fill` | Tự động điền quota |
| `/api/headcount-quotas/apply-to-scheduler` | Đưa quota vào scheduler |

## 12. Error contract và security rules

Các mã phản hồi chính:

- `400`: request hoặc validation không hợp lệ.
- `401`: thiếu hoặc sai authentication.
- `403`: không có role/ownership/store permission.
- `404`: resource không tồn tại hoặc không thuộc phạm vi user.
- `409`: xung đột trạng thái, overlap hoặc claim cạnh tranh.
- `500`: lỗi server; không trả raw exception hoặc secret.

Controller không được tin tưởng identity, staff ID hoặc store ID do client tự khai báo. Service phải lấy actor từ authenticated context và áp dụng ownership trước khi đọc/ghi dữ liệu.

## 13. Tài liệu liên quan

- Danh sách endpoint: [API_LIST.md](API_LIST.md)
- Kiến trúc hệ thống: [Structure.md](Structure.md)
- Tech stack và trạng thái dự án: [README.md](README.md)
- Hướng dẫn khởi chạy: [SETUP.md](SETUP.md)
