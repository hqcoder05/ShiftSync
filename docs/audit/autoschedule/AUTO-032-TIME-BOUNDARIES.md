# AUTO-032 — Khoảng thời gian ca và hạn mức tuần

## Thay đổi

AutoScheduleService và ShiftValidationService dùng ShiftTimeRange cho thời điểm bắt
đầu/kết thúc và phân bổ giờ thực sự vào từng tuần ISO (Thứ hai đến Chủ nhật).
Khoảng ca là [start, end); end < start đi qua nửa đêm. Ca kết thúc đúng 00:00 không
chiếm ngày tiếp theo. Start = end vẫn là 0 giờ, không tự diễn giải thành ca 24 giờ.

Ca Chủ nhật 22:00–Thứ hai 06:00 tính 2 giờ vào tuần trước, 6 giờ vào tuần sau. Kiểm
tra hạn mức áp dụng trên cả hai tuần, kể cả nhánh local repair và chẩn đoán thiếu ca.
So sánh hạn mức dùng tổng phút nguyên để tránh sai số cộng số thực tại đúng trần.
Đây là chính sách sản phẩm được áp dụng; không phải kết luận tuân thủ pháp luật.

Nạp lịch tự động bao phủ toàn bộ các tuần mà ca thực sự làm việc, kèm Chủ nhật trước
tuần đầu và ngày đệm cho nghỉ giữa ca. Luồng phân công/đổi ca cũng truy vấn Chủ nhật
trước tuần đầu và hết tuần cuối. Khoảng truy vấn không giới hạn store của ca mới.

ShiftValidationService trước đây so trùng LocalTime chỉ khi cùng ngày và cộng
Duration.between(LocalTime, LocalTime), gây bỏ sót trùng ca qua đêm và số giờ âm.
Nay so sánh đầy đủ ngày giờ, vẫn loại ca được đổi ra theo excludedShiftId.

## Kiểm thử

ShiftTimeValidationTest bổ sung 11 tests: trùng đêm trước/đêm sau, tiếp giáp không
trùng, thời lượng qua đêm không âm, giờ mang từ Chủ nhật, hạn mức tuần sau, tách giờ
để không chặn nhầm, loại ca đổi ra, kết thúc 00:00 và lọc ứng viên tự động cả hai tuần.
Thêm đối chứng 60 ca một phút đúng trần một giờ không bị chặn do sai số cộng số thực.
Characterization cũ 8 giờ/0 giờ được thay bằng regression 2 giờ/6 giờ.

Ba kiểm thử PostgreSQL bổ sung kiểm tra query thực tế: trùng ca đêm trước xuyên store
và bỏ qua assignment soft-delete; ca đêm mới kiểm tra hạn mức tuần sau; xếp tự động
vào Chủ nhật nạp cả ca Thứ ba tuần sau, kèm đối chứng vừa đủ trần vẫn được phân công.

Kết quả cuối: 345 tests hồi quy đạt, 15 integration tests skip có chủ đích trong lần
chạy unit; chạy opt-in PostgreSQL riêng 15/15 đạt. Không reset database vận hành.

## Phần còn lại

- Lịch rảnh tự động còn dung sai 30 phút, phân công tay dùng query thời gian khác.
- Database có chk_availability_time: end_time > start_time. Mặc dù helper tự động
  nhận lịch rảnh qua đêm, database chưa lưu được loại dữ liệu này. Phát hiện qua
  kiểm thử thật; không gỡ constraint chỉ trong database test để che khác biệt.
- Kiểm thử tự động qua tuần dùng lịch rảnh hợp lệ 23:00–23:59, ca 23:45–00:15 nằm
  trong dung sai hiện hành. Không coi đó là bằng chứng hỗ trợ ca đêm trọn vẹn end-to-end.
- Cần thống nhất chính sách lịch rảnh, cách biểu diễn qua đêm, validation và giao diện.
- Giờ công bằng tháng, hợp đồng khác nhau giữa các store, mục tiêu tối ưu và benchmark
  vẫn cần hoàn thiện. Luồng tay chưa được bổ sung chính sách giờ nghỉ tối thiểu ở đây.
