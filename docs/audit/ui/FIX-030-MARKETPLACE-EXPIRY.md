# FIX-030 — Loại ca quá hạn khỏi Chợ ca mở

Ngày22/10/2026. Tái sử dụng LIVE-024/FIX-029 và MarketplaceService hiện có.

## Nguyên nhân và thay đổi
Backend getOpenShifts đã lọc start/deadline theo Asia/Ho_Chi_Minh. Danh sách quản lý lại lấy toàn bộ storeShifts và chỉ lọc missingCount>0, nên ca tháng9 vẫn hiển thị kèm Xem ứng viên. Sửa danh sách thiếu người, bộ đếm, bộ lọc và danh sách nhận ca dùng cùng marketplaceTiming. Ca đã bắt đầu, hết hạn nhận, bị hủy hoặc thiếu thông tin thời gian không thuộc danh sách đang tuyển. Không thay đổi bản ghi hay xóa lịch cũ.

Helper utils/marketplaceTime.js dùng offset+07 khớp business zone backend. Phân biệt chưa bắt đầu, đang diễn ra, đã kết thúc, hết hạn nhận, đã hủy và dữ liệu thiếu. Ca qua đêm có end ở ngày kế tiếp. Kiểm tra now ngay tại nút nhận/đăng/phân công/yêu cầu chi viện; bộ chọn ca chi viện loại ca cũ. Modal ứng viên mở sẵn hiển thị hết hạn và khóa nút phân công khi đến hạn.

Đổi tab Đã phân công thành Lịch sử ca (giữ key FILLED và route cũ). Hiển thị cả ca đóng nhận/quá hạn/hủy lẫn ca đủ phân công, không trùng id. Thẻ lịch sử chỉ đọc, giữ số phân công thực tế, không gán nhãn100% cho ca còn thiếu. Nếu requiredStaff0 thì ghi chưa thiết lập chỉ tiêu thay3/0. Không thêm API/migration.

Clock cập nhật mỗi giây và khi focus/visibility thay đổi để ca tự rời danh sách khi chạm giờ bắt đầu/hạn nhận. Backend vẫn quyết định cuối cùng khi ghi.

## Kiểm chứng
- Node6/6 PASS: ca quá khứ, tương lai, đúng giờ bắt đầu/kết thúc, deadlineZ/offset/local, qua đêm, hủy, thiếu dữ liệu, UTC khác ngày Việt Nam. Lint helper/tests PASS; buildPASS(chunkwarning cũ).
- Edge1920 backendDocker thật: OPEN0cards, KPIthiếu0; Lịch sử20cards, không có Xem ứng viên/nhận/đăng ca trên thẻ lịch sử. Các ca tháng9 còn tra cứu được. Không DB mutation.
- Tab riêng clock22/10/2026 10:00, fixture1ca10:01 và1ca cũ: active1→0 sau fastForward61s, history2 và nhãn đang diễnra, writes0. Tab thử đã đóng, tab người dùng không interception/clockfake.
- Screenshot .playwright-mcp/marketplace-history-real.png. Không chạy claim/publish/assign thật, khôngbackend/deps/commit/push.

## Bổ sung 25/10/2026 — ưu tiên đúng hạn nhận

- Sửa tiêu chí `Sắp hết hạn xử lý (<3h)` để dựa vào `availabilityDeadline` từ API; khi deadline không có, dùng giờ bắt đầu ca là mốc đóng nhận cuối cùng. Trước đó, tiêu chí này chỉ đồng nhất với “ca trong ngày”, nên sai ý nghĩa và có thể ưu tiên nhầm.
- Menu sắp xếp nay thực sự sắp danh sách: `Mức độ khẩn cấp` theo hạn nhận rồi mức thiếu; `Thời gian` theo mốc đóng nhận; `Mức thù lao` theo tổng thù lao. Thẻ ca hiển thị hạn nhận và nhãn “Hạn nhận còn dưới 3 giờ” khi phù hợp.
- `node --test src/utils/marketplaceTime.test.js` 6/6 PASS và production build PASS. Chưa chạy lại Edge/Docker thật trong lượt sửa copy/tính thứ tự này.

## Bổ sung 27/10/2026 — yêu cầu đổi ca quá hạn

Ảnh UAT cho thấy hai request đổi ca tháng 9 vẫn là `PENDING`, nên vừa hiện trong bảng vừa bị đếm là “chờ xử lý”. Nguyên nhân nằm ở ranh giới API: `managerApproveSwapRequest` đã từ chối ca quá khứ nhưng `getStoreSwapRequests` không đổi trạng thái cũ.

- Thêm `EXPIRED` vào enum trạng thái bằng Flyway V48. Khi list request cho store hoặc nhân viên, backend đánh dấu/lưu `PENDING → EXPIRED` nếu ca nguồn hoặc ca đích đã bắt đầu, dùng `Asia/Ho_Chi_Minh`.
- Tạo/đồng ý/duyệt/từ chối/hủy request sau mốc đó đều chặn; không thể làm sống lại request cũ qua API trực tiếp.
- `MarketplacePage` chỉ hiển thị PENDING trong hàng đợi. Request `EXPIRED`, đã duyệt, từ chối hoặc hủy ở phần Lịch sử đổi ca thu gọn, chỉ xem chi tiết; badge không đếm chúng. Guard browser dùng offset `+07:00` chỉ là lớp phòng thủ trước lần refresh; backend quyết định cuối.

Kiểm chứng: `ShiftSwapServiceQaTest` 2/2 PASS; production build PASS (cảnh báo bundle cũ còn). Docker demo đã rebuild; chèn một request PENDING disposable tham chiếu hai ca quá hạn, gọi `GET /stores/{storeId}/swaps` nhận `EXPIRED`, query PostgreSQL cũng `EXPIRED`, rồi xóa bản ghi test. Chưa kiểm tra trực tiếp Edge/UI vì browser control local bị chặn.

## Bổ sung 27/10/2026 — yêu cầu chi viện liên chi nhánh quá hạn

UAT tiếp tục cho thấy request chi viện gửi đi cho ca 27/09 vẫn là `PENDING`, nên còn nút hủy và badge dù ca đã qua. Đây là cùng lớp lỗi trạng thái với đổi ca, nhưng thuộc `WorkforceRequest` riêng.

- Thêm `EXPIRED` vào `WorkforceRequestStatus` bằng Flyway V49. `WorkforceRequestService` dùng giờ Việt Nam (`Asia/Ho_Chi_Minh`) để từ chối tạo request cho ca đã bắt đầu và tự lưu `PENDING`/`PROPOSAL_SENT → EXPIRED` khi đọc danh sách incoming/outgoing.
- Các thao tác hủy, từ chối, đề xuất nhân viên, phản hồi đề xuất và xem nhân viên phù hợp đều chặn request đã hết hạn; việc đánh dấu hết hạn vẫn được lưu để lần tải sau không trả về một request chờ giả.
- `MarketplacePage` tách hàng đợi còn hiệu lực khỏi lịch sử. Tab incoming/outgoing và badge chỉ đếm `PENDING`/`PROPOSAL_SENT` chưa đến giờ; request hết hạn ở Lịch sử yêu cầu thu gọn, chỉ xem chi tiết. Guard browser `+07:00` ngăn một response cũ mở nút thao tác trong lúc tải lại.

Kiểm chứng: `WorkforceRequestServiceTest` và `ShiftSwapServiceQaTest` tổng 4/4 PASS; production build PASS (cảnh báo bundle cũ còn). Docker demo đã rebuild và Flyway V49 thành công. Chèn một workforce request PENDING disposable tham chiếu ca demo đã qua, gọi `GET /api/stores/{storeId}/workforce-requests/outgoing` nhận `EXPIRED`, query PostgreSQL cũng `EXPIRED`, rồi xóa bản ghi test. Chưa kiểm trực tiếp Edge/UI.

## Bổ sung 27/10/2026 — số đếm tab đổi ca còn hiệu lực

Tab `Yêu cầu đổi ca` giữ badge số lượng, nhưng chỉ bằng số request `PENDING` còn hiệu lực. Request EXPIRED, đã duyệt, từ chối hoặc hủy không được tính; sau khi các ca liên quan hết hạn, badge phải giảm về `0` thay vì giữ tổng danh sách lịch sử.

## Bổ sung 27/10/2026 — cảnh báo khả dụng khi tạo ca

Khi API từ chối tạo/sửa ca vì nhân viên ngoài khung khả dụng hoặc có ngày bận, giao diện không còn hiển thị nguyên văn thông báo kỹ thuật tiếng Anh. Cảnh báo nêu rõ ca đang chọn, ngày và hai cách xử lý: cập nhật Khả dụng nhân sự hoặc chọn nhân viên/khung giờ khác. Quy tắc chặn ở backend không thay đổi.
