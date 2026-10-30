# AUTO-036 — Giờ và tải theo từng tháng thực tế

> Cập nhật AUTO-037: fairness cap bên dưới đã được bỏ khỏi production domain sau khi
> tái hiện thiếu ca có thể tránh. Nội dung cap ghi lại trạng thái tại mốc AUTO-036.

## Các thay đổi

ShiftTimeRange.hoursInMonth cắt khoảng ca [start,end) tại biên tháng. Ví dụ 31/10
22:00–01/11 06:00 đóng góp 2h tháng 10 và 6h tháng 11; ca kết thúc đúng 00:00 không
đóng góp vào tháng sau. Tương tự tại ranh giới năm và tháng 2 năm nhuận.

Auto tải từ một ngày trước đầu tháng đầu tiên tới hết tháng cuối cùng cần xét, gồm
cả tháng của ngày thực sự kết thúc ca qua đêm. StaffData có map YearMonth -> hours.
Lượt xếp đi qua hai tháng không cộng hai tháng thành một số duy nhất để chấm điểm.
Các assignment từ mọi store vẫn được tính, bỏ soft-delete như trước.

Điểm fairness dùng tải tháng = giờ trong tháng / (maxWeeklyHours * daysInMonth / 7).
Đây là dung lượng chuẩn hóa cho mục tiêu công bằng, không phải hạn mức pháp lý hay
trần giờ tháng mới. Ràng buộc cứng giờ tuần và giờ nghỉ vẫn được kiểm tra độc lập.
Ca vắt tháng dùng trung bình tải của hai tháng, trọng số theo phần giờ của chính ca
nằm trong từng tháng. Hai hợp đồng 24h/48h ở cùng tỷ lệ tải cho cùng điểm fairness.

Khi gán ca, cập nhật map bằng giờ thực tế của từng tháng. Local repair trừ ca cũ,
cộng ca mới cho người đổi và cộng đúng tháng cho người backfill; chọn backfill theo
tải tháng của ca được nhận, không chỉ theo số giờ tuyệt đối. Các field scalar cũ
được giữ cho test harness/benchmark hiện có; production scoring đọc map calendar.
Benchmark cũ chưa được coi là so sánh solver hợp lệ chỉ vì vẫn chạy được.

Snapshot fairness cap cũng được tách theo tháng của slot, không dùng tổng giờ cả
hai tháng cho mọi slot. Tuy nhiên cap vẫn lọc theo raw hours và tháng bắt đầu; tác
động của cap lên độ phủ/kỹ năng khan hiếm là hạng mục chưa giải quyết của AUTO-030.
Không coi thay đổi này là chứng minh tối ưu công bằng toàn cục.

## Kiểm thử

MonthlyFairnessTest có 10 cases: chia ca qua tháng, 00:00, tháng 28/29/30/31 ngày,
không lẫn giờ tháng khác, tỷ lệ tải hợp đồng tương đương, cập nhật khi thay ca và điểm
của ca nằm trong hai tháng. Kiểm thử mock query lịch tháng được cập nhật phạm vi
thêm một ngày đầu, giữ nguyên các tình huống kiểm tra chẩn đoán/coverage.

PostgreSQL bổ sung: (1) người A có 6h mang từ đêm cuối tháng trước, người B có 4h
trong tháng mới; ca mới chọn B, không coi A là 0h; (2) lượt xếp từ 30/10 đến 03/11,
A có 40h tháng 10 và B có 40h tháng 11; chọn B cho ca tháng 10 và A cho ca tháng 11.
Lịch sử dùng các tuần khác để tách ảnh hưởng fairness khỏi hạn mức tuần và giờ nghỉ.

Kết quả cuối: 409 tests hồi quy liên quan đạt, 25 integration tests skip ở lượt unit;
lần PostgreSQL riêng 25/25 đạt, 0 errors/failures/skipped. Báo cáo PG giữ tại
target/scheduler-postgres-evidence. git diff --check đạt. Không có thay đổi frontend
ở mốc này; chưa chạy toàn bộ clean install hay benchmark tải.

## Còn lại

Cần đánh giá cap, các tie-break, mục tiêu chi phí/cuối tuần/thay đổi lịch, chất lượng
kết quả cuối sau repair, preview/version và tải thực tế. Cần tối ưu việc tổng hợp
giờ theo nhân viên/tháng và đo hiệu năng thay vì suy luận từ độ phức tạp. Toàn bộ
mục tiêu AUTO-030 vẫn đang thực hiện.
