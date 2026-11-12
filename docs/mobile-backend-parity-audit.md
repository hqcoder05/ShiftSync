# Đối chiếu Backend và Mobile

Ngày rà soát: 11/11/2026.

> Bản rà soát dưới đây phản ánh thời điểm 11/11, không phải trạng thái hiện tại. Ngày 12/11 đã bổ sung các API activity, availability theo tuần, support, incident, messaging, schedule-history và attendance capabilities; đã thêm realtime cho nhắn tin. Các chức năng này đã có kiểm thử tích hợp PostgreSQL. `MessagingRealtimeHttpTest` kiểm tra đăng nhập, SSE và gửi tin qua HTTP thật giữa hai tài khoản, cùng quyền truy cập của tài khoản thứ ba. Vẫn cần kiểm thử đầu cuối giao diện Mobile và thiết bị thật, đặc biệt camera và kết nối gián đoạn.

## Cách đối chiếu

- Nguồn Backend: `http://localhost:8080/v3/api-docs` đang chạy, có **189 operation**; đối chiếu thêm với 32 controller Java.
- Nguồn Mobile: các màn hình có thể đi tới từ `AppNavigator.js`, các service được màn hình gọi và `allApisRegistry.js`.
- `ApiTestHub` là công cụ kỹ thuật, không được điều hướng từ luồng người dùng. Nó lưu **109 operation**, cả 109 vẫn khớp OpenAPI, nhưng không được tính là Mobile đã có nghiệp vụ tương ứng.

## Kết luận nhanh

Mobile được xác định là ứng dụng **chỉ dành cho Staff**. Do đó, các nghiệp vụ quản trị của Backend không phải là thiếu sót của Mobile. Mobile đã có các luồng nhân viên cơ bản: đăng nhập, hồ sơ cơ bản/avatar, lịch cá nhân, chấm công QR/selfie, xin nghỉ, chợ ca/đổi ca, phiếu lương cá nhân, thông báo và cập nhật lịch rảnh.

Tuy vậy, có **7 nhóm màn hình Mobile đang gọi endpoint không tồn tại trên Backend**. Các màn hình đó sẽ thất bại (thường là 404) khi không có cache cũ. Theo chiều ngược lại, phần lớn API quản trị/vận hành của Backend chủ đích không có giao diện Mobile; các nghiệp vụ này thuộc Web cho Manager/Admin.

## Mobile có, Backend chưa có

Các đường dẫn dưới đây được Mobile dùng ở màn hình thực tế nhưng không xuất hiện trong OpenAPI đang chạy hoặc controller Backend. Đây là các lỗi tích hợp cần xử lý trước.

| Màn hình Mobile | Endpoint Mobile đang gọi | Trạng thái | Hướng xử lý |
| --- | --- | --- | --- |
| Hoạt động của tôi | `GET /api/users/me/activity` | Không có Backend | Thêm activity feed có phân trang cursor, hoặc ẩn màn hình cho tới khi có API. |
| Thời gian rảnh | `GET`, `PUT /api/availability/weeks/{weekStart}` | Không có Backend | Thêm API theo tuần với `revision` để chống ghi đè; API CRUD `/availability` hiện có không đúng hợp đồng Mobile. |
| Trung tâm trợ giúp | `GET`, `PUT /api/stores/{storeId}/support` | Không có Backend | Bổ sung cấu hình hotline/nhãn hỗ trợ ở cấp chi nhánh, có phân quyền quản lý cho PUT. |
| Báo cáo sự cố | `GET /api/stores/{storeId}/incidents`, `GET .../incidents/my`, `GET .../{id}`, `POST .../incidents`, `PATCH .../{id}/status`, `GET .../{id}/photos/{photoId}` | Không có Backend | Cần module Incident: bản ghi idempotent bằng `clientRequestId`, upload tối đa 3 ảnh và quyền nhân viên/quản lý. |
| Nhắn tin chi nhánh | `GET /api/users/me/messaging/unread-count`; `GET/POST /api/stores/{storeId}/messaging/contacts`; `GET/POST .../threads`; `GET/POST .../threads/{id}/messages`; `POST .../read`; `GET/POST .../announcements` | Không có Backend | Cần module Messaging, bao gồm phân quyền theo chi nhánh và realtime. Hiện toàn bộ UI Nhắn tin không có server để hoạt động. |
| Lịch sử điều chỉnh ca | `GET /api/stores/{storeId}/schedule-history` | Không có Backend | Cần audit log lịch ca trả về `before`, `after`, `changedAt`, người thực hiện và lọc `startDate/endDate`. |
| Chấm công | `GET /api/attendance/capabilities` | Không có Backend | Hoặc bổ sung endpoint capability, hoặc Mobile tự suy luận từ cấu hình store đã có. |

### Hệ quả ở giao diện hiện tại

- Menu **Nhắn tin chi nhánh**, **Báo cáo sự cố**, **Hoạt động của tôi** và **Lịch sử điều chỉnh ca** là luồng có UI nhưng chưa có API thật.
- **Thời gian rảnh** hiển thị màn hình theo tuần nhưng sẽ không tải/lưu được với Backend hiện tại.
- **Trung tâm trợ giúp** vẫn có thể hiển thị cấu hình store chung, nhưng tải/lưu hotline chuyên biệt sẽ thất bại.
- Chỉnh sửa thông tin cá nhân được lưu tạm vào thiết bị rồi thử đồng bộ tới endpoint không tồn tại; do đó không phải dữ liệu nguồn đáng tin cậy.

## Backend có, Mobile không cần có theo phạm vi Staff

Danh sách sau bao phủ các nhóm API quản trị hiện có mà Mobile không cung cấp bằng luồng người dùng. Đây là phân tách phạm vi đúng đắn, không phải backlog bắt buộc cho Mobile. Các alias `/locations/...` được gộp cùng nghiệp vụ `/stores/...` tương ứng.

| Nhóm Backend chưa có Mobile | Operation chưa có luồng Mobile |
| --- | --- |
| Quản trị người dùng và kỹ năng | `GET/POST /users`, `GET/PUT/DELETE /users/{id}`, `GET/PUT /users/{userId}/skills`, `GET /skills`. Mobile chỉ có hồ sơ của chính mình. |
| Quản lý chi nhánh | `GET/POST /stores`, `PATCH/DELETE /stores/{id}`, `GET /stores/directory`, `GET /stores/overview`, `GET /store-templates`, `GET /store-templates/{templateId}`, `POST /stores/{storeId}/apply-template/{templateId}`. |
| Tuyển dụng/phân công nhân sự | `GET/POST/PUT/DELETE /stores/{storeId}/staff...`, tất cả `workforce-requests` (bao gồm incoming/outgoing, đề xuất, từ chối, hủy và eligible staff), cùng danh sách/response workforce proposal của quản lý. |
| Lập lịch quản lý | `POST/PUT/DELETE /stores/{storeId}/shifts...`, cập nhật requirements, publish, demand planning, auto-schedule, apply plan, eligible staff, `POST .../assignments/swap`, `GET/PUT /scheduler-config`, và toàn bộ `shift-templates`. Mobile chỉ xem ca và không có bảng tạo/sửa/xếp lịch cho quản lý. |
| Định biên | `GET /branches`, `GET /positions`, toàn bộ `headcount-quotas` (danh sách, tuần, tóm tắt, sửa quota/budget, auto-fill, apply-to-scheduler). |
| Đổi ca/chợ ca của quản lý | `GET /stores/{storeId}/swaps`, `POST /swaps/{requestId}/approve`, `POST /swaps/{requestId}/reject`, `POST /swaps/{requestId}/cancel`, `POST .../marketplace/shifts/{id}/publish`, `POST .../unpublish`. Mobile chỉ tạo/nhận đổi ca và claim ca. |
| Nghỉ phép quản lý và nâng cao | `GET /stores/{storeId}/leave-requests`, `PUT .../{id}/approve`, `PUT .../{id}/reject`, `PUT .../{id}/reason`, `GET .../{id}/impact`, `GET .../{id}/provenance-candidates`, `PUT .../{id}/provenance`, và xem balance theo store. |
| Chấm công quản lý | `GET /stores/{storeId}/attendance`, `PUT/DELETE .../attendance/{attendanceId}`, và các endpoint lấy ảnh chấm công. Mobile chỉ chấm công/xem lịch sử của chính mình. |
| Điều chỉnh công quản lý | `GET /stores/{storeId}/attendance-adjustments`, `PUT .../{id}/approve`, `PUT .../{id}/reject`. Mobile chỉ tạo/xem yêu cầu của chính mình. |
| Yêu cầu chung và ngày lễ | `GET /requests/{id}`, `PUT /requests/{id}/status`, cùng CRUD `/holidays`. Mobile tạo/xem yêu cầu của mình nhưng không có chi tiết/duyệt yêu cầu chung; cũng chưa có lịch ngày lễ. |
| Payroll quản lý và lịch sử lương | Sinh kỳ lương, danh sách kỳ lương store, payslip theo kỳ, đổi trạng thái, Excel/PDF quản lý và toàn bộ `payroll/compensation-history`. Mobile Staff xem/tải/chia sẻ PDF của phiếu lương của mình. |
| Cấu hình cửa hàng | `PUT /stores/{storeId}/configuration`, CRUD `contract-types`, CRUD skill theo store. Mobile chỉ đọc configuration/skills. |
| Tra cứu lịch rảnh của người khác | `GET /availability/users/{userId}` và `GET /availability/stores/{storeId}`. Mobile chỉ cập nhật lịch rảnh của tài khoản hiện tại. |
| Mặt bằng và thiết bị | Store design + version, layout, zone CRUD, workstation CRUD, equipment CRUD, allocate-zones (cả alias `/locations`). Mobile không có màn hình 2D/3D hay quản lý thiết bị. |
| Dashboard vận hành | `GET /stores/{storeId}/dashboard`, `GET .../dashboard/chart`. Trang chủ Mobile tự tổng hợp từ ca, công và payslip cá nhân thay vì dùng dashboard store. |
| Thông báo nâng cao | `POST /notifications/test/delayed`. Mobile hiện gỡ FCM token nền khi đăng xuất, đồng thời dùng đăng ký token, preferences, list/unread/read/read-all và SSE. |

## Có API nhưng Mobile mới chỉ “có service”, chưa có UI

`shiftService.js` khai báo xem/thêm/xóa assignment (`/assignments`), `availabilityService.js` còn khai báo CRUD `/availability`, và `workforceService.js` có proposal của nhân viên; các hàm này không được gọi bởi màn hình quản lý hiện tại. Vì vậy chúng không được tính là tính năng Mobile hoàn chỉnh.

Tương tự, `ApiTestHub` có thể gọi 109 API từ form JSON, nhưng không được đưa vào navigation. Nó phù hợp cho QA/dev, không thay thế UI nghiệp vụ hoặc kiểm soát phân quyền theo màn hình.

## Ưu tiên triển khai

1. **Sửa hợp đồng bị vỡ:** availability tuần, activity và schedule-history. Các luồng này đang hiện cho nhân viên nhưng không có API. Đồng bộ hồ sơ đã được chuyển sang `PUT /users/me` và Backend đã lưu các trường cá nhân.
2. **Giữ đúng phạm vi Staff:** hoặc bổ sung Messaging, Incident và Support vào Backend, hoặc ẩn chúng khỏi menu để không tạo UI chết.
3. **Không đưa nghiệp vụ quản trị vào Mobile:** lịch ca quản lý, phê duyệt, định biên, payroll vận hành, cấu hình và layout tiếp tục thuộc Web cho Manager/Admin.

## Ghi chú kiểm chứng

- Backend chạy ở thời điểm rà soát trả về **189** operation từ OpenAPI.
- `ShiftSync-Mobile/services/allApisRegistry.js` chứa **109** operation; cả 109 khớp Backend, nhưng thiếu **80 operation** mới/ngoài registry.
- Các endpoint “Mobile có, Backend chưa có” đã được kiểm tra cả với OpenAPI đang chạy lẫn tập controller Java, không chỉ so với `API_LIST.md` (tài liệu này đã cũ hơn backend thực tế).
