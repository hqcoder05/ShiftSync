# AUTO-037 — Giữ domain hợp lệ và sử dụng đúng ngân sách repair

## Tái hiện trước sửa

SchedulingQualityAndFairnessTest.test19 dựng 22 người, ca đầu tuần có 20 vai trò độc
lập, ca sau có một vai trò phổ thông và một kỹ năng khan hiếm. Người FT làm vai trò
phổ thông; người PT làm được cả hai. Mỗi người độc lập có hợp đồng 8h/tuần và 30h
lịch sử tháng (7.5h mỗi tuần trước); PT 24h/tuần, 30h tháng; FT 48h/tuần, 60h tháng.
Các lịch sử ở các tuần trước, không gây vượt trần tuần đang xếp hay xung đột giờ nghỉ.

FT/PT có cùng tỷ lệ tải tháng, nhưng cap raw hours 1.3 * trung bình toàn đội loại FT.
MRV thấy cả hai role đích đều có một ứng viên, chọn role phổ thông trước theo skillId,
dùng mất người duy nhất có kỹ năng hiếm. Repair duyệt 20 phân công độc lập có tỷ lệ
tải tuần cao hơn trước khi đến đúng assignment cần đổi, hết ngân sách và bỏ thiếu ca.

Chạy trên mã trước sửa: expected 22, actual 21, log target/fairness-cap-before.log.
Đây là bằng chứng thiếu ca có thể tránh, không chỉ suy luận từ code. Phương án đủ:
20 người độc lập ở ca đầu, FT làm phổ thông, PT làm vai trò hiếm ở ca sau.

## Sửa

- Domain của MRV chỉ xét các ràng buộc cứng: kỹ năng còn hạn, lịch rảnh/nghỉ, trùng ca,
  giờ tuần và giờ nghỉ. Bỏ hẳn bộ lọc fairness cap, flag và snapshot thừa.
- Fairness vẫn nằm trong calculateScore với trọng số cấu hình và tải calendar tháng
  từ AUTO-036; giờ tháng cao làm giảm điểm, không làm ứng viên biến mất khỏi domain.
- Overload bốn tham số package-private được giữ deprecated cho harness cũ; monthly
  average không còn có tác dụng loại ứng viên. Benchmark hiện có đã gọi overload ba
  tham số và ghi rõ baseline lịch sử không tái hiện cap đã bỏ.
- Repair bỏ qua người không có kỹ năng hoặc không rảnh cho role cần cứu trước khi
  trừ một lượt trong ngân sách 20. Các kiểm tra còn lại và rollback in-memory được giữ.
  Không tăng mù giới hạn hay tuyên bố tìm kiếm toàn bộ không gian phương án.

## Kiểm chứng

Sau sửa, test19 xếp 22/22, shortage 0, rescued count 0: MRV trực tiếp giữ người có kỹ
năng hiếm, không cần repair. test20 gọi repair trực tiếp với 20 role không liên quan
đứng trước assignment đúng: tìm được hoán đổi/backfill và giữ đúng skillId hai người.

Test ứng viên cũ được đổi từ yêu cầu loại người 100h tháng thành kiểm tra cả ba người
đều hard-feasible; người nhiều giờ tháng vẫn có điểm fairness thấp hơn. Test hour-heavy
cũ đặt ca lịch sử vào tuần trước nhưng kỳ vọng ảnh hưởng điểm tuần hiện tại; cap trước
đây che sai lệch fixture đó. Nay đặt 8h khác vào đúng tuần đích, giữ kiểm tra trọng số giờ.

PostgreSQL thêm cùng tình huống 22 người/22 slot với lịch sử thật, unique shift identity,
đăng ký rảnh và hợp đồng có hiệu lực. Kiểm tra số assignment và role của FT/PT, không
chỉ kiểm tra status. Fixture lịch sử dùng chung shift cho các assignment cùng ngày/giờ.

## Còn lại

Kết quả cuối: 411 tests hồi quy liên quan đạt; 26 integration tests skip ở lượt unit,
PostgreSQL riêng 26/26 đạt (0 errors/failures/skipped). XML PG giữ tại
target/scheduler-postgres-evidence. git diff --check đạt. Không thay đổi frontend ở
mốc này, không reset dữ liệu vận hành. Log tái hiện lỗi trước sửa vẫn giữ ở target.

Loại cap không chứng minh tối ưu toàn cục hoặc fairness tốt hơn trong mọi dữ liệu.
Repair vẫn một bước và giới hạn 20 ứng viên có liên quan. Cần hàm đánh giá phương án
cuối, benchmark tương đương CP-SAT, các mục tiêu chi phí/cuối tuần/churn, preview/version
và đo tải PostgreSQL. Chưa chạy benchmark hiệu năng hay toàn bộ clean install ở mốc này.
