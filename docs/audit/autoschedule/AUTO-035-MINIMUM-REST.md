# AUTO-035 — Giờ nghỉ dùng chung giữa các luồng

## Thay đổi

ShiftTimeRange.hasRequiredRest so sánh khoảng ngày giờ đầy đủ với Duration, không
chỉ so LocalTime hay cắt theo ngày bắt đầu. Ngưỡng nghỉ là inclusive: đủ đúng 8 giờ
được phép; 7:59:59 bị chặn. Kiểm tra cả ca trước và ca sau. Ngưỡng 0 cho phép tiếp
giáp nhưng không cho trùng giờ.

StaffRestPolicy chọn mức nghỉ cao nhất giữa cửa hàng đích và mọi cửa hàng có
employment ACTIVE của nhân viên. Thiếu cấu hình cửa hàng dùng mặc định 8 giờ. Đây
là chính sách sản phẩm, không phải xác nhận tuân thủ pháp luật. Dữ liệu cấu hình sai
bị báo lỗi. API giới hạn 0–168 giờ; không truy vấn theo khoảng thời gian không giới hạn.

AutoScheduleService tải cấu hình của các store liên quan theo batch, ghi ngưỡng vào
StaffData, dùng trong lọc ứng viên, local repair, chẩn đoán thiếu người và điểm nghỉ.
Sửa hàm điểm để cấu hình >=24 giờ không gây chia 0 hoặc điểm âm.

ShiftValidationService dùng cùng policy và phép kiểm tra. Phân công tay, nhận ca mở,
duyệt đổi ca và các luồng gọi validator không bỏ qua giờ nghỉ khi force/override.
Đổi ca vẫn loại assignment được đổi ra khỏi lịch trước khi kiểm tra.

Khoảng nạp lịch bao phủ cả các tuần tính hạn mức và toàn bộ khoảng nghỉ cần xét.
Ca từ ngày trước có thể kết thúc qua đêm nên queryStart thêm một ngày phía trước.
QueryEnd mở rộng theo endDateTime + restHours; cấu hình 36 giờ có thể cần nạp tới
Thứ ba sau ca Chủ nhật. Auto dùng khoảng đủ rộng cho mọi nhân viên trong lượt chạy.

## Giao diện

Cài đặt dùng một trường minRestHours cho cả cùng ngày và khác ngày. Bỏ ô 4 giờ cùng
ngày chỉ lưu localStorage và sửa nút chỉnh giờ khác ngày vốn đổi một trường khác với
trường gửi PUT. Giữ 0 khi lưu thay vì dùng || đổi thành 8. Cache không ghi đè minRestHours
từ máy chủ. Nút tăng giới hạn 168. Bỏ công tắc chỉ làm mờ UI nhưng không tắt ràng buộc
backend; hiển thị “Luôn kiểm tra khi phân công”. Không dùng nhãn khẳng định pháp lý.

Edge 156 headless, session hiện có, chỉ đọc: trường chung hiển thị 8 giờ, nút tăng/giảm
hoạt động, ô cùng ngày cũ không còn. Ảnh target/rest-settings-edge.png. Chưa lưu cấu
hình vào dữ liệu demo. Frontend build đạt; còn cảnh báo chunk lớn trước đó.

## Bằng chứng kiểm thử

MinimumRestPolicyTest có 10 cases gồm biên tới giây, trước/sau ca qua đêm, ngưỡng 0,
chính sách store nghiêm ngặt hơn, query qua tuần, lọc auto, điểm khi nghỉ >24h và miền
cấu hình. ShiftTimeValidationTest cấu hình nghỉ 0 tường minh để kiểm thử độc lập việc
tính giờ/overlap; không dùng mặc định sản phẩm để làm kiểm thử tiếp giáp không ổn định.

PostgreSQL bổ sung hai tình huống: auto/manual/open claim cùng chặn nghỉ 16h khi store
liên quan yêu cầu 24h, đúng 24h thì nhận được; ca Chủ nhật cần nghỉ 36h xét ca Thứ ba,
35h bị chặn và 36h được xếp. Bổ sung đối chứng vào test swap: thiếu giờ nghỉ thì request
vẫn PENDING, sửa ca sau để đủ đúng 8h mới được duyệt và thay assignment.

Kết quả cuối 29/10/2026: 399 tests hồi quy đạt, 23 integration tests skip ở lượt unit;
PostgreSQL opt-in riêng 23/23 đạt (0 errors/failures/skipped). Báo cáo PG được giữ tại
target/scheduler-postgres-evidence. Frontend build và git diff --check đạt. Chưa chạy
toàn bộ clean install; các thao tác tạo/xóa fixture có chủ đích chỉ ở database test.

## Phần còn lại

Chưa hoàn thành AUTO-030. Giờ công bằng tháng, giới hạn giờ riêng của store, kiểm tra
skill/capacity khi thay assignment, preview/version và benchmark vẫn cần làm. Chưa có
kịch bản riêng cho store của assignment lịch sử đã hết employment ACTIVE với chính
sách nghỉ khác, hoặc sửa chính sách/ca đang có người đồng thời với một lượt xếp mới.
