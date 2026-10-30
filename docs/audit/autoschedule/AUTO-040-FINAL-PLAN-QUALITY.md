# AUTO-040 — Đánh giá kết quả cuối sau repair

Kiểm chứng 29/10/2026. Một phần của AUTO-030, chưa hoàn tất tối ưu/benchmark.

## Thay đổi

ScheduleQualityEvaluator là hàm thuần, không gọi repository, không cộng điểm theo thứ tự
chọn ứng viên. AutoScheduleService gọi sau local repair và tạo coverage khớp từng role.
API trả quality với evaluationVersion FINAL_METRICS_V1 trong cả phương án thử và lưu.
Apply phương án lưu server giữ nguyên bộ chỉ số này, không chạy lại heuristic.

- Độ phủ slot và giờ: tính trên từng requirement đã khớp kỹ năng/vị trí, chặn count dư
  vượt nhu cầu. Thiếu một ca 8 giờ khác thiếu một ca 2 giờ. Qua đêm dùng thời lượng thật.
- Phân bổ tháng: toàn bộ nhân viên STAFF ACTIVE của cửa hàng, gồm người chưa được xếp.
  Giờ tính cả phân công ở store khác trong tháng, MANUAL/OPEN_SHIFT và AUTO mới sau repair;
  loại AUTO cũ bị thay thế. Ca qua tháng chia đúng số giờ từng tháng.
- Tỷ lệ tải = giờ tháng / (trần giờ hợp đồng tuần dùng chung × số ngày tháng / 7).
  Trả giờ, sức chứa, tỷ lệ từng người và độ lệch chuẩn tổng thể theo từng tháng.
  Không kẹp tỷ lệ về 1: giờ vượt denominator vẫn hiển thị. Đây không phải trần tháng pháp lý.
- Mức thay đổi AUTO: so multiset (shift, staff, skill, zone, workstation). ID hàng DB mới
  không tự tạo thay đổi; đổi role/người/vị trí tính một bỏ và một thêm. Không tính MANUAL
  hay hàng soft-delete. Baseline lấy trước xóa AUTO, kết quả lấy sau repair.
- Frontend có mục mở rộng “Đánh giá phương án cuối”: giờ còn thiếu, AUTO giữ/thêm/bỏ,
  giờ tháng và độ lệch theo hợp đồng (hiển thị điểm phần trăm).

## Bằng chứng

- 422 tests hồi quy liên quan trên 32 lớp đạt, 0 failures/errors/skips. Danh sách chính
  xác được lưu tại shiftsync-backend/target/final-quality-regression-classes.txt.
- ScheduleQualityEvaluatorTest: 7 tests mới kiểm tra khác thời lượng, cap count dư,
  hợp đồng 40/20 giờ, người 0 giờ, tỷ lệ vượt 1, carryover tháng, thay role/vị trí,
  độc lập thứ tự, ID assignment, loại manual/deleted và capacity không hợp lệ.
- Test repair thành công hiện có bổ sung đánh giá sau swap: 8 giờ phủ, 0 thiếu,
  2 AUTO thêm/1 bỏ và tải hai người bằng nhau; không dùng điểm lúc gán cũ.
- PostgreSQL riêng: 45/45 đạt, 0 failures/errors/skips, lần cuối 12:52 ngày 29/10.
  Kiểm tra AUTO cũ không cộng đôi giờ, cùng placement dù ID mới vẫn được giữ;
  người chưa được xếp vẫn trong cohort, thiếu đúng số giờ; carryover 6 giờ vào tháng mới;
  chất lượng preview không đổi khi apply, DTO serialize/deserialize đúng.
- 8 frontend model tests và production build đạt (cảnh báo chunk lớn từ trước).
- Edge headless, API route mock bằng response từ PostgreSQL test: mục mở rộng hiển thị
  2 nhân viên, 16 giờ, 0 điểm phần trăm; 1 dry-run POST, 0 POST lưu.
  Ảnh: shiftsync-backend/target/final-quality-edge.png. Không phải full-stack demo test.
- Không reset dữ liệu vận hành; chưa chạy toàn bộ mvn clean install.

## Giới hạn và phần tiếp theo

Đây là các chỉ số mô tả trên kết quả cuối, chưa phải hàm mục tiêu chung cho greedy/CP-SAT,
chưa chứng minh hard constraints đúng hay optimality. Độ lệch thấp chưa chứng minh công
bằng về cơ hội: người khác kỹ năng/lịch rảnh có năng lực khả dụng khác nhau. Không tổng
hợp thành điểm 0–100 tùy ý. Các tháng lịch sử dùng dữ liệu hiện tại và trần hợp đồng ACTIVE
hiện tại; chưa mô hình hóa phiên bản hợp đồng theo ngày hiệu lực.

Benchmark hiện có chưa nối evaluator này hoặc chuyển CP-SAT sang cùng objective; so sánh
điểm cũ vẫn không hợp lệ. Còn mục tiêu chi phí/cuối tuần/xáo trộn, giải thích assignment,
đánh giá ràng buộc độc lập và đo tải API + PostgreSQL trên dữ liệu lớn trong AUTO-030.
