# AUTO-029 — Đánh giá thuật toán xếp ca và mức sẵn sàng vận hành

> Đối chiếu mới ngày 30/10/2026: xem [AUTO-041-PRODUCTION-BENCHMARK.md](AUTO-041-PRODUCTION-BENCHMARK.md).
> Đã đo trực tiếp autoSchedule với repository mock và CP-SAT coverage oracle: 30 phương án;
> có fixture bỏ lỡ 1–4 slot, 200 NV/500 slot mất trung vị 6,61 giây ở production service.
> Bảng phát hiện bên dưới là lịch sử; tình trạng sửa lỗi và giới hạn số đo nằm trong AUTO-041.

Ngày: 29/10/2026. Phạm vi: mã nguồn hiện tại của AutoScheduleService, repository/entity,
controller, kiểm thử liên quan và benchmark CP-SAT trong thư mục test.

> Cập nhật khắc phục 29/10/2026: lỗi ngày nghỉ ở cuối ca qua đêm bên dưới đã được sửa
> trong AutoScheduleService và ShiftAssignmentValidator. Nội dung audit giữ lại làm
> bằng chứng trước sửa. Tiến độ và các phần còn lại ở AUTO-030-SCHEDULER-REMEDIATION.md.
> Bổ sung: AUTO-031 có kiểm thử giao dịch PostgreSQL thật; AUTO-032 sửa khoảng ca và
> tách giờ qua tuần. Các phát hiện bên dưới mô tả thời điểm audit ban đầu.

## Kết luận

Thuật toán có nền tảng tốt cho lập lịch theo định biên cố định, từng cửa hàng, tối đa 7 ngày.
Chưa đủ bằng chứng để khẳng định tương đương sản phẩm quy mô lớn hoặc sẵn sàng vận hành
chuỗi cửa hàng có nhiều người chỉnh lịch đồng thời. Có lỗi ràng buộc ngày kết thúc ca qua đêm
đã tái hiện được. Không thay đổi thuật toán production trong lượt đánh giá này.

Không suy ra chất lượng thuật toán từ animation. Animation hiện phát lại kết quả đã lưu.

## Bằng chứng kiểm thử

- Chạy lại 8 lớp hiện có: 237 tests, 0 failures, 0 errors, 0 skipped.
- Bổ sung SchedulingReadinessCharacterizationTest: 4 tests, 0 failures, 0 errors.
- Bốn kiểm tra mới ghi nhận các hành vi hiện tại, gồm cả hạn chế đã biết; PASS ở đây
  có nghĩa đã tái hiện hành vi, không có nghĩa hành vi đó đúng yêu cầu nghiệp vụ.
- Các lần chạy này không gọi API xếp lịch, không reset hay chỉnh dữ liệu vận hành.
- Không chạy benchmark tải PostgreSQL thật hoặc kiểm thử pháp lý lao động trong lượt này.

Lệnh chạy kiểm thử hiện có:

```text
mvn -q -Dtest=AutoScheduleServiceTest,AutoScheduleAssignmentCorrectnessTest,AutoScheduleFeasibilityAndShortageTest,SchedulingQualityAndFairnessTest,SchedulingProductionHardeningTest,SchedulingPhase51ForensicVerificationTest,SchedulingPhase52WeightedOptimizationTest,SchedulingPhase53BackendClosureTest test
mvn -q -Dtest=SchedulingReadinessCharacterizationTest test
```

## Phát hiện

### P1 — Ca qua đêm bỏ qua ngày nghỉ ở phần cuối ca: đã tái hiện

AutoScheduleService.isUnavailable (khoảng dòng 1107) chỉ kiểm tra blackout và nghỉ phép
theo shiftDate. Với ca Chủ nhật 01/11/2026 22:00 đến Thứ hai 02/11/2026 06:00,
nhân viên vẫn được coi là ứng viên dù có nghỉ phép cả ngày 02/11 hoặc blackout ngày đó.
Đối chứng: nếu nghỉ ngay ngày bắt đầu ca, ứng viên bị loại.

Cần kiểm tra giao nhau giữa toàn bộ khoảng thời gian ca và khoảng nghỉ/chặn,
bao gồm phần qua nửa đêm. Luồng nạp nghỉ phép còn lọc theo storeId; cần kiểm thử thêm
trường hợp nhân viên làm nhiều cửa hàng và phạm vi hiệu lực của đơn nghỉ.

### P1 — Chưa có bằng chứng chống tranh chấp dữ liệu trên database thật

Service có @Transactional. Query tải lịch không có @Lock; không thấy khóa theo cửa hàng/
tuần trong đường chạy đã đọc. Entity Shift có @Version, nhưng ghi các ShiftAssignment mới
không tự chứng minh rằng phiên bản Shift được cập nhật/kiểm tra cho mỗi lần xếp.
Unique (shift_id, staff_id) chỉ ngăn một nhân viên lặp lại trong cùng ca; nó không tự ngăn
hai nhân viên khác nhau cùng chiếm một chỗ, hoặc một người làm hai ca chồng nhau.

Ví dụ test27/test28 trong SchedulingPhase51ForensicVerificationTest chạy luồng đồng thời
trên mock repository và kiểm tra kết quả từng request, không kiểm tra trạng thái commit
trong PostgreSQL. test25/test26 kiểm tra exception truyền ra từ mock saveAll, chưa chứng minh
rollback của Spring transaction thực tế.

Đây là thiếu bằng chứng/thiếu cơ chế được thấy trong phạm vi audit; chưa tái hiện lỗi race
trên database trong lượt này. Cần kiểm thử integration thật trước khi kết luận an toàn.

### P2 — Chính sách lịch rảnh ±30 phút: đã tái hiện

availabilityCoversShift (khoảng dòng 1130) nới thời gian rảnh 30 phút ở hai đầu.
Đăng ký 09:00–17:00 vẫn đủ điều kiện cho ca 08:30–17:30; 08:29 thì bị loại.
Nếu lịch rảnh là ràng buộc bắt buộc chính xác, hành vi này cần sửa. Nếu là chính sách
linh hoạt có chủ đích, cần cấu hình và giải thích rõ cho nhân viên/quản lý.

### P2 — Giờ qua ranh giới tuần/tháng cần chính sách rõ ràng

getWeeklyHours (khoảng dòng 1187) cộng toàn bộ thời lượng theo ngày bắt đầu ca.
Ca Chủ nhật 22:00–Thứ hai 06:00 được tính 8 giờ vào tuần trước và 0 giờ vào tuần sau.
Kiểm tra mới đã tái hiện. Cần quyết định hạn mức hợp đồng áp dụng theo ngày bắt đầu ca
hay giờ thực sự nằm trong từng tuần; không mặc định coi một cách tính là đáp ứng pháp luật.
Giờ công bằng tháng cũng cộng theo cửa sổ tháng dựa trên shiftDate; lịch vắt qua hai tháng
cần bộ kiểm tra riêng, chưa được tái hiện chi tiết trong lượt này.

### P2 — Heuristic chưa bảo đảm tối ưu độ phủ/công bằng toàn cục

Thuật toán chọn slot có ít ứng viên nhất (MRV), chọn nhân viên có tổng điểm cao nhất,
sau đó sửa bằng hoán đổi một bước, tối đa 20 assignment thử mỗi slot thiếu.
Không có chứng minh tối ưu hoặc cận optimality gap. Kết quả còn thiếu người không chứng minh
rằng mọi phương án hợp lệ đều thiếu người. Fairness cap còn lọc bớt ứng viên trước khi
chấm điểm; cần đối chiếu các tình huống nhân viên đa kỹ năng và năng lực khan hiếm.

Availability score luôn bằng 1.0 sau lọc; thay đổi trọng số availability không tạo thứ hạng
mới giữa các ứng viên hợp lệ. Chưa có mục tiêu tiền lương/ngân sách trong calculateScore,
chưa thấy cân bằng cuối tuần/ca không mong muốn hay tối thiểu hóa thay đổi lịch AUTO cũ.

### P2 — Chưa có benchmark đủ để kết luận quy mô lớn

Vòng MRV duyệt lại toàn bộ slot còn lại và toàn bộ nhân viên sau mỗi lần gán:
xấp xỉ O(S² × E × chi phí kiểm tra lịch). Ngoài ra có query findByShiftId theo từng ca
và log INFO điểm từng ứng viên. Đây là rủi ro hiệu năng từ mã nguồn, chưa phải số đo tải.

Repository có benchmark 10/50/200 nhân viên, 25/100/500 slot và CP-SAT trong profile riêng.
Nhưng runGreedy sao chép vòng lặp thay vì gọi nguyên autoSchedule; totalScore cộng lúc gán
và không tính lại sau repair. CP-SAT tính score từng cặp trước tối ưu, còn greedy cập nhật
điểm giờ/công bằng theo từng bước. Vì khác cách đo mục tiêu, không dùng điểm in ra để
kết luận thuật toán tốt hơn/kém hơn solver hoặc sản phẩm thương mại.

## Những nền tảng đã có

- Lọc kỹ năng và hạn dùng, lịch rảnh, blackout, nghỉ phép ngày bắt đầu ca.
- Kiểm tra trùng thời gian, nghỉ tối thiểu, giới hạn giờ hợp đồng theo tuần.
- Chấm điểm kỹ năng/giờ/công bằng/nghỉ, MRV, local repair.
- Giữ phân công MANUAL/OPEN_SHIFT, thay phân công AUTO trên ca DRAFT.
- Có dry-run rollback, thống kê độ phủ/thiếu và chẩn đoán; spatial allocation tách trạng thái.
- Chưa coi các unit test của dry-run là bằng chứng đầy đủ cho mọi nhánh rollback trên DB.

## Điều kiện đánh giá tiếp theo

1. Sửa ràng buộc qua đêm và chốt chính sách lịch rảnh/giờ tuần, thêm regression tests yêu cầu đúng.
2. Integration test PostgreSQL riêng: hai quản lý cùng store/tuần, cùng nhân viên ở hai store,
   chạy xếp tự động song song phân công tay, exception sau khi xóa AUTO phải phục hồi dữ liệu cũ.
3. Benchmark chung một bộ dữ liệu và một hàm chấm điểm kết quả cuối: greedy và CP-SAT;
   ưu tiên số ca thiếu trước, rồi công bằng/chi phí/xáo trộn. Báo solver status và gap khi có.
4. Đo API có DB trên 20/100/500/1.000 nhân viên, nhiều mức slot và xung đột: P50/P95/P99,
   RAM, thời gian query, tỷ lệ lỗi. Đây là ma trận kiểm tra đề xuất, không phải năng lực đã đạt.
5. Thêm giải thích từng quyết định, mô phỏng phương án và xác nhận áp dụng theo phiên bản lịch;
   việc dùng solver khác chỉ có ý nghĩa sau khi yêu cầu và số đo đã thống nhất.

## Nguồn đối chiếu chính thức

- Google OR-Tools Employee Scheduling: https://developers.google.com/optimization/scheduling/employee_scheduling
- Timefold hard/soft constraints: https://docs.timefold.ai/employee-shift-scheduling/latest/user-guide/constraints
- Timefold demand-based scheduling: https://docs.timefold.ai/employee-shift-scheduling/latest/shift-service-constraints/demand-based-scheduling
- Timefold employee scheduling model (fairness, replanning): https://app.timefold.ai/models/employee-scheduling/v1

Các nguồn này là chuẩn tham chiếu chức năng/phương pháp, không chứng minh nội bộ của mọi
ứng dụng lớn đều dùng chung thuật toán, cũng không cung cấp benchmark trực tiếp với ShiftSync.
