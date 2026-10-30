# AUTO-030 — Sửa lần lượt và bổ sung thuật toán xếp ca

Mục tiêu đang thực hiện: xử lý toàn bộ các phát hiện AUTO-029 và bổ sung các năng lực
còn thiếu. Hoàn thành một giai đoạn không có nghĩa đã đạt toàn bộ mức sẵn sàng vận hành.

Xác nhận mới nhất 29/10/2026: 422 tests hồi quy liên quan trên 32 lớp đạt
(danh sách chọn tại target/final-quality-regression-classes.txt). Lần PostgreSQL riêng mới nhất: 45/45 đạt,
không failure/error/skip; XML được giữ tại target/scheduler-postgres-evidence để lần
chạy unit sau không ghi đè bằng báo cáo skipped. Chưa chạy toàn bộ mvn clean install.

## 1. Ràng buộc ca qua đêm — đã sửa, kiểm thử đơn vị đạt

- ShiftDateRange dùng ngày thực sự có công việc trong khoảng [start, end).
- AutoScheduleService chặn nghỉ phép/blackout cả ngày bắt đầu và ngày kết thúc.
- Tải blackout tới ngày làm việc cuối cùng của các ca, kể cả ngoài ngày cuối request.
- Tải APPROVED leave theo danh sách nhân viên, giao với khoảng làm việc, không chỉ
  storeId đang xếp. Tránh bỏ sót nhân viên làm nhiều cửa hàng và tránh trải tất cả ngày
  của các đơn nghỉ lịch sử vào bộ nhớ.
- ShiftAssignmentValidator dùng cùng phạm vi ngày cho isEligible và validateEligibility,
  kể cả phân công tay có overrideAvailability: override không vượt qua nghỉ/blackout.
- Ca kết thúc đúng 00:00 không chiếm ngày tiếp theo; đơn PENDING không chặn phân công.
- Không thay đổi hai chính sách ±30 phút và cách tính giờ tuần trong giai đoạn này.

Bằng chứng hiện tại: 11 lớp unit test liên quan, tổng 268 tests, 0 failures/errors/skipped.
Trong đó OvernightSchedulingRegressionTest có 7 tests chạy xuyên autoSchedule và hai
đường validator; SchedulingReadinessCharacterizationTest có 5 tests (3 regression cho
ngày nghỉ và 2 ghi nhận chính sách giờ hiện tại). AutoScheduleAssignmentCorrectnessTest
đã cập nhật mock cho query tải đơn nghỉ mới, giữ yêu cầu chặn nghỉ phép.

Query JPQL mới đã được kiểm chứng trên PostgreSQL trong giai đoạn 2.
Không chạy unit tests trên API hay sửa dữ liệu demo/vận hành.

## 2. Đồng thời và rollback PostgreSQL — đã triển khai và kiểm thử các luồng chính

- Kiểm tra mọi đường ghi assignment: tự động, phân công tay, đổi ca, ca mở và sửa giờ ca.
- Dùng SERIALIZABLE cho các giao dịch ghi lịch, kể cả TransactionTemplate nhận ca mở;
  từ chối transaction ngoài yếu hơn. Xung đột trả HTTP 409 để tải lại/thử lại.
- Tạo kiểm thử PostgreSQL riêng, không reset database shiftsync đang dùng.
- Chứng minh trạng thái commit khi hai quản lý xếp cùng tuần, auto/manual đồng thời,
  nhân viên chung hai store, và phục hồi AUTO cũ khi lỗi giữa giao dịch.
- Kiểm chứng dry-run rollback cùng nhánh quota trên DB thật, query leave mới và boundary.

Bằng chứng: AUTO-031-TRANSACTION-SAFETY.md, 12 PostgreSQL integration tests đạt.
334 tests hồi quy đạt; 12 integration tests được bỏ qua có chủ đích ở lần chạy unit.
Đã sửa thêm lỗi rollback khi thiếu cấu hình 3D mà chỉ test mock không phát hiện.
Chưa đo tải SERIALIZABLE; chưa có retry tự động hay kiểm chứng Redis/notification.

## 3. Chính sách thời gian dùng chung — chưa hoàn thành

Đã triển khai phần khoảng ca và hạn mức tuần trong AUTO-032-TIME-BOUNDARIES.md:
tách giờ qua hai tuần, kiểm tra cả hai hạn mức, đồng bộ auto/local repair/luồng tay,
sửa trùng giờ qua đêm và thời lượng âm. Còn chính sách lịch rảnh, giờ tháng và hợp đồng
xuyên cửa hàng. AUTO-033-AVAILABILITY-POLICY.md đã xử lý schema và chính sách lịch rảnh:
V51 cho lưu qua đêm, mặc định khớp chính xác, dung sai 0–60 phút do quản lý cấu hình,
chung cho auto/phân công tay/duyệt đổi ca. Ca mở giữ ngoại lệ tự nguyện. Giao diện Edge
đã kiểm tra đọc chính sách; build frontend đạt. Chưa hoàn tất toàn bộ giai đoạn 3.

AUTO-034-CLAIM-AND-CONTRACT-LIMITS.md bổ sung trần hợp đồng ACTIVE xuyên store dùng
chung cho auto/tay/đổi ca/nhận ca. Không lấy bản ghi đầu tiên hay cộng trần hai hợp đồng.
Đồng thời sửa overrideAvailability chỉ bỏ qua lịch rảnh, không bỏ qua kỹ năng/capacity;
ca mở chọn đúng role phù hợp còn chỗ. Các trần riêng của store và giờ nghỉ còn cần rà soát.

AUTO-035-MINIMUM-REST.md đã đồng bộ giờ nghỉ auto/tay/đổi ca/nhận ca, áp dụng mức cao
nhất của store đích và các store có employment ACTIVE, nạp lịch theo ngưỡng thực tế.
Sửa cài đặt giờ nghỉ gửi đúng trường API, bỏ ô cùng ngày chỉ lưu cache; kiểm tra Edge
và build đạt. Còn tình huống assignment lịch sử ở store đã hết employment ACTIVE.

AUTO-036-CALENDAR-MONTH-FAIRNESS.md đã tách giờ thực tế từng tháng, bao gồm phần ca
đêm mang từ cuối tháng trước; capacity chuẩn hóa dùng số ngày tháng / 7, không cố định
4 tuần. Lượt xếp qua hai tháng có snapshot riêng và local repair cập nhật hai tháng
đúng phần giờ. Test PostgreSQL xác nhận lựa chọn dựa trên giờ mang sang và tải riêng
của hai tháng. Fairness cap còn cần đánh giá về độ phủ và tỷ lệ hợp đồng (giai đoạn 4).

- Lịch rảnh chính xác/dung sai cấu hình và hiển thị chính sách đã triển khai (AUTO-033).
- Đã áp dụng giờ thực tế từng tuần và tháng cho scoring; còn đánh giá cap, báo cáo
  chất lượng kết quả cuối và các chính sách/đường ghi còn lại.
- Đồng bộ AutoScheduleService với ShiftValidationService; trong audit tiếp theo đã thấy
  ShiftValidationService hiện tính Duration từ LocalTime và chỉ so trùng cùng shiftDate,
  đã được sửa và có kiểm thử riêng; còn đồng bộ chính sách lịch rảnh và giờ nghỉ.

## 4. Chất lượng phương án, điểm và giải thích — chưa hoàn thành

AUTO-037-FEASIBLE-DOMAIN-AND-REPAIR.md đã tái hiện thiếu có thể tránh (21/22 trước sửa),
bỏ fairness cap khỏi domain MRV và giữ fairness trong điểm. Cùng fixture đạt 22/22 sau
sửa, cả mock service và PostgreSQL thật, không cần repair. Repair không tiêu tốn ngân
sách cho người thiếu kỹ năng/không rảnh đối với role cần cứu. Vẫn chưa chứng minh tối ưu.

AUTO-038-CONCRETE-DRY-RUN-PREVIEW.md đã bổ sung snapshot phân công cụ thể, frontend hiển
thị và replay phương án chưa lưu; giữ manual, bỏ AUTO được thay, gồm ca mới từ định biên.
PostgreSQL xác nhận response đọc được sau rollback và không lưu hàng thử. 8 tests model,
build frontend và kiểm tra Edge với API mock đạt. AUTO-039-STORED-PLAN-APPLY.md đã bổ sung
apply đúng phương án lưu ở server, có phiên bản đầu vào, hạn 15 phút, ràng buộc người tạo,
idempotency và rollback. Lý do lựa chọn/đánh giá kết quả cuối vẫn chưa hoàn thành.

AUTO-040-FINAL-PLAN-QUALITY.md bổ sung evaluator độc lập thứ tự trên kết quả cuối sau
repair: thiếu slot/giờ, tải tháng chuẩn hóa theo hợp đồng (kể cả người 0 giờ và lịch
xuyên store), AUTO giữ/thêm/bỏ theo placement. Frontend hiển thị chỉ số, PG kiểm chứng
không cộng đôi AUTO cũ và snapshot apply giữ nguyên đánh giá. Chưa phải hàm mục tiêu
chung cho greedy/CP-SAT hay chứng nhận tối ưu; phần benchmark này vẫn chưa hoàn thành.

- Hàm đánh giá chung trên kết quả cuối; phân biệt độ phủ, công bằng theo hợp đồng,
  chi phí/ngân sách, cuối tuần/ca không mong muốn, mức thay đổi lịch cũ.
- Đã sửa ảnh hưởng cap và ngân sách repair cho tình huống trên; còn đánh giá đa dạng
  tình huống, tìm kiếm nhiều bước, điểm phương án cuối và đối chiếu solver cùng mục tiêu.
- Đồng nhất benchmark greedy/CP-SAT, solver status và gap; tính lại score sau repair.
- Giải thích lựa chọn từng assignment; preview có assignment cụ thể và bảo vệ phiên bản
  khi áp dụng. Không hứa phương án thử chính là phương án lưu nếu dữ liệu đã đổi.

## 5. Hiệu năng và xác nhận quy mô — chưa hoàn thành

AUTO-041-PRODUCTION-BENCHMARK.md (30/10) bổ sung đo trực tiếp service với repository
mock trên 5 quy mô, 3 seed và CP-SAT oracle tối đa độ phủ. 30 phương án không vi phạm
các ràng buộc được kiểm tra; heuristic mất thêm 1–4 slot tại 50 NV/225 slot. Mức
200 NV/500 slot phủ đủ nhưng trung vị 6,61 giây. Đã có bằng chứng thuật toán giới hạn;
chưa có benchmark chung mục tiêu mềm hoặc tải API/PostgreSQL. Không dùng benchmark
sao chép greedy/soft score cũ làm bằng chứng tương đương solver.

- Giảm query theo từng ca, đánh giá lặp toàn slot và log điểm ở INFO.
- Đo API + PostgreSQL: nhiều quy mô nhân sự/slot, nhiều mức xung đột và nhiều cửa hàng.
- Báo độ phủ, phân phối giờ, chi phí, thay đổi lịch, thời gian P50/P95/P99, RAM và lỗi.
- Kết luận theo số đo và trường hợp thử, không dùng unit test PASS để khẳng định
  tương đương mọi ứng dụng lớn hoặc tuân thủ mọi quy định lao động.
