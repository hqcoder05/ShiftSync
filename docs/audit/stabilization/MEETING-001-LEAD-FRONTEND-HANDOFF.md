# MEETING-001 — Báo cáo ổn định ShiftSync và bàn giao frontend

**Ngày:** 24/10/2026  
**Thời lượng:** 15 phút  
**Người trình bày:** Lead  
**Người phối hợp:** Frontend teammate  
**Commit tham chiếu:** `61e686b` — `quoc-backend`

## Mục tiêu cuộc họp

Đồng bộ phần việc lead đã hoàn thành, phân biệt bằng chứng kiểm thử với phần chưa nghiệm thu, sau đó giao nhóm việc frontend có tiêu chí hoàn thành rõ ràng.

## Kịch bản trình bày

### 0–2 phút — Trạng thái chung

- Đợt ổn định tập trung vào web, hợp đồng API/backend, định biên, lịch ca, marketplace, chấm công và cửa hàng 3D.
- Commit `61e686b` đã được đẩy lên nhánh `quoc-backend`.
- Quyết định sản phẩm đã chốt: **không hỗ trợ ca qua đêm**. Tạo/sửa ca, bulk demand, mẫu ca và form web đều yêu cầu giờ kết thúc lớn hơn giờ bắt đầu.

### 2–7 phút — Hạng mục đã hoàn thành

| Phân hệ | Kết quả đã làm | Bằng chứng |
|---|---|---|
| Định biên | Không tự xóa ca nháp/phân công khi áp dụng; trả cảnh báo để xử lý riêng. Phân biệt `SAVED`/`SUGGESTED`, nhu cầu, phân công, thiếu/dư và chưa phân loại. | STAB-001, STAB-002; kiểm thử quota persistence và phân quyền có mục tiêu. |
| Lịch ca & Publish | Form tạo/sửa ca gọn, cuộn nội dung độc lập, footer thao tác luôn thấy; Publish trả số ca vừa công bố/đã công bố và không gửi thông báo trùng. | FIX-031, FIX-031A, FIX-039; kiểm thử API tạo/sửa/đọc lại và unit publish. |
| Marketplace | Loại ca hết hạn khỏi danh sách đang mở/KPI; giữ ở lịch sử chỉ đọc; chặn thao tác trên ca cũ. | FIX-030; kiểm thử Edge backend thật và Node helper. |
| Điều hướng & nút | Sửa điều hướng cũ, thông báo, Mẫu ca CRUD, Auto Scheduler và theo dõi nhân viên 3D. | FUNC-028, FIX-029. |
| Chấm công | Đồng nhất timezone nghiệp vụ `Asia/Ho_Chi_Minh`; danh sách không còn trả ảnh Base64, ảnh tải theo yêu cầu qua endpoint có RBAC. | STAB-003; Maven mục tiêu 9/9. |
| Bảo mật & trạng thái lỗi | Dashboard hiển thị lỗi tải một phần; STOMP yêu cầu JWT hợp lệ/origin cấu hình; compose yêu cầu secret cục bộ. | STAB-003; source review và targeted tests. |
| Cửa hàng 3D | Cập nhật model/nhãn, bảng thông tin, cảnh báo, theo dõi nhân viên và lưu thiết kế cửa hàng. | LIVE-024, EXPLORER-021 đến EXPLORER-025. |
| Khả dụng giao diện | Thu gọn định biên ngày/tuần; modal/bảng có vùng cuộn và footer có thể chạm được. | FIX-032 đến FIX-038; Edge 1920/1366/390 ở các luồng đã nêu. |

### 7–10 phút — Bằng chứng kiểm thử

- `ShiftSync-Web`: `npm run build` thành công trên mã gần nhất; vẫn có cảnh báo bundle lớn của Vite.
- `ShiftSync-Web`: bộ Node toàn phần **189/189** là bằng chứng hồi quy của STAB-001; build lại sau FIX-039 thành công.
- `shiftsync-backend`: suite mục tiêu STAB-003 **9/9** thành công; `ShiftServiceAssignmentDelegationTest` sau FIX-039 **4/4** thành công.
- Backend isolated Linux trước STAB-003: **520 test, 0 fail, 0 error, 5 skipped**. Đây là bằng chứng lịch sử, không thay cho việc chạy lại sau STAB-003.
- Edge đã được dùng cho các modal/bảng quan trọng ở 1920×1080, 1366×768 và 390px; chưa có hồi quy toàn hệ thống ở zoom 125%.
- ESLint toàn web còn **341 lỗi và 39 warning** lịch sử; chưa tắt kiểm tra hoặc áp dụng sửa tự động hàng loạt.

### 10–12 phút — Rủi ro và phần chưa nghiệm thu

- Docker Engine từng không sẵn sàng; thay đổi STAB-003 chưa được rebuild image và chạy full isolated suite sau cùng.
- Chưa có E2E đầy đủ cho các hành trình nghiệp vụ, event mutation realtime và Publish ghi dữ liệu qua Docker/Edge.
- Backend chạy trực tiếp trên Windows còn lỗi Netty loopback; Docker vẫn là môi trường chạy ưu tiên.
- Một số lượt kiểm tra 3D sử dụng fixture; không dùng chúng để kết luận backend thật.

### 12–15 phút — Giao việc và chốt đầu ra

| Người phụ trách | Hạng mục | Tiêu chí hoàn thành |
|---|---|---|
| Lead | Rebuild Docker từ mã hiện tại; chạy full Maven isolated suite; xác minh attendance/timezone/WebSocket, API production-like và Publish có ghi/đọc lại đúng. | Có log build/test, phiên bản image, kết quả API thực, kết quả Publish và các lỗi còn lại được ghi rõ. |
| Frontend teammate | Hồi quy UI bằng Edge: Schedule, Định biên, Marketplace, Chấm công & Phép, Hồ sơ nhân sự, Dashboard. Riêng Schedule kiểm tra Publish ở trạng thái có ca nháp, đã công bố và không có ca. Kiểm tra 1920×1080, 1366×768, 390px; zoom 100% và 125%. | Mỗi lỗi có route, tài khoản/quyền, bước tái hiện, ảnh, viewport/zoom và mức độ P0–P3. |
| Frontend teammate | Sửa các lỗi presentation không cần đổi API/quy tắc nghiệp vụ: cuộn/cắt nội dung, modal/bảng, loading/error/empty state, nút không có phản hồi. | PR nhỏ theo từng nhóm lỗi; có build và kiểm tra trình duyệt tương ứng. |
| Cả hai | Rà lại danh sách lỗi và xác nhận trạng thái sau hồi quy. | Mỗi hạng mục là `PASS`, `FAIL`, hoặc `BLOCKED`; không để trạng thái trống. |

## Quy ước phối hợp

- Không thay đổi API, migration hoặc quy tắc nghiệp vụ từ nhánh frontend nếu chưa thống nhất với lead.
- Không kết luận dữ liệu backend thật từ fixture/interception.
- Thao tác ghi phải được xác minh bằng API thành công, đọc lại dữ liệu và tải lại trang.
- Lỗi chức năng ưu tiên hơn lỗi thị giác; P0/P1 được tách thành PR riêng và không gom vào chỉnh CSS.

## Tài liệu dùng trong cuộc họp

- [STAB-001 stabilization ledger](STAB-001.md)
- [FIX-029 functional actions](../ui/FIX-029-FUNCTIONAL-ACTIONS.md)
- [FIX-030 marketplace expiry](../ui/FIX-030-MARKETPLACE-EXPIRY.md)
- [FIX-031 shift form](../ui/FIX-031-SHIFT-FORM.md)
- [FIX-039 publish feedback](../ui/FIX-039-PUBLISH-FEEDBACK.md)
- [FIX-032 đến FIX-038](../ui/)
- [LIVE-024 Docker integration](../digital-twin/LIVE-024-DOCKER-INTEGRATION.md)
- [TASK_MEMORY](../../agent-memory/TASK_MEMORY.md), [CHANGELOG](../../agent-memory/CHANGELOG.md), [CODEBASE_MAP](../../agent-memory/CODEBASE_MAP.md)
