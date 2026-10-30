# AUTO-041 — Benchmark thuật toán và cập nhật đánh giá cũ

Đo ngày 30/10/2026 trên mã trong working tree hiện tại. Không sửa thuật toán production.

## Kết luận

ShiftSync xử lý được các fixture 10/25, 50/100 và 200/500 nhân viên/slot với độ phủ
100%. Tuy nhiên có bằng chứng cụ thể rằng heuristic bỏ lỡ độ phủ có thể đạt: ba
fixture 50 nhân viên/225 slot thiếu thêm 4, 3 và 1 slot so với nghiệm tối ưu CP-SAT.
Ở mức 200/500, thời gian thuật toán trung vị là 6,61 giây ngay khi repository đã mock.
Chưa đủ cơ sở khẳng định ngang hệ thống lớn hoặc quyết định thay toàn bộ bằng solver.

## Phương pháp và phạm vi

- Gọi trực tiếp `AutoScheduleService.autoSchedule` với `dryRun=true`, gồm nạp dữ liệu
  qua repository mock, tạo slot, MRV/scoring, repair, diagnostics, evaluator và DTO cuối.
  Không sao chép vòng lặp greedy của benchmark cũ. Transaction rollback marker được
  mock; đây không phải kiểm tra Spring transaction hoặc thời gian rollback thật.
- 5 quy mô × 3 seed (42, 43, 44), mỗi fixture tạo 2 phương án: 30 phương án đo.
  Mỗi quy mô có một lần warm-up production seed 41 không tính vào bảng.
- Dữ liệu cố định ID: 5 ngày từ Thứ hai 04/11/2030; 3 kỹ năng; mỗi người có một kỹ
  năng chính và có thể có kỹ năng thứ hai; hợp đồng 24 hoặc 40 giờ/tuần; khoảng 15%
  ngày không rảnh; mỗi người thứ 7 có một blackout. Lịch rảnh 06:00–22:00 vào ngày
  được đăng ký; dung sai 0; nghỉ tối thiểu 11 giờ. Ca 06:00–14:00 hoặc 14:00–22:00.
  Có tối đa 30 tổ hợp ngày/giờ/kỹ năng; requiredCount cộng thành đúng số slot.
  500 slot ở đây là 500 chỗ nhân sự, không phải 500 ca độc lập.
- CP-SAT được mô hình hóa riêng, không dùng bộ lọc ứng viên/scoring production.
  Biến nhân viên/ca; giới hạn headcount; kỹ năng, ngày rảnh và blackout; xung đột và
  nghỉ giữa ca; tổng giờ tuần. Mục tiêu duy nhất là tối đa số slot được phủ. Ca đều
  8 giờ nên tối đa số slot cũng tối đa số giờ được phủ trong bộ dữ liệu này.
- Bộ kiểm tra kết quả tách khỏi production kiểm tra lặp nhân viên/ca, kỹ năng,
  lịch rảnh, blackout, headcount, giờ hợp đồng và trùng ca/nghỉ. Tất cả 30 phương án
  có 0 vi phạm trong phạm vi này. Kiểm tra thêm số assignment trong snapshot khớp
  totalAssignedSlots và quality.coveredSlots của production.
- CP-SAT 9.11.4210, timeout 5 giây, 4 workers, random_seed=42. Tất cả 15 lần trả
  OPTIMAL và cận trên bằng số slot được phủ: chứng minh độ phủ tối ưu của mô hình
  benchmark này, không phải mọi ràng buộc/phương án production.
- Intel Core i5-1335U; Windows 11; Java 21.0.12; JVM ActiveProcessorCount=4, heap tối
  đa 2 GiB. Production log đặt WARN. Không đo peak RAM/GC. Giới hạn số processor
  của JVM không phải CPU affinity. Không có máy độc quyền cho benchmark.
- Thời gian dùng nanoTime: production chỉ đo lời gọi service; CP-SAT gồm dựng model,
  solve và đọc nghiệm. Không tính tạo fixture, tạo mock, kiểm tra kết quả hoặc nạp
  native library ban đầu. CP-SAT chưa warm-up solve riêng; lần đầu có thể chịu chi
  phí khởi động. Ba seed là ba dữ liệu khác nhau, không phải ba lần đo cùng dữ liệu.
  Báo trung vị và khoảng quan sát, không suy diễn P95/P99 từ ba mẫu.

## Kết quả đo

Số được phủ trong bảng lần lượt ứng với seed 42/43/44. Thời gian là trung vị ba seed.

| Nhân viên / slot cần | ShiftSync phủ | CP-SAT phủ tối ưu | ShiftSync (ms) | CP-SAT (ms) |
| --- | --- | --- | ---: | ---: |
| 10 / 25 | 25 / 25 / 25 | 25 / 25 / 25 | 11,62 | 19,98 |
| 50 / 100 | 100 / 100 / 100 | 100 / 100 / 100 | 84,36 | 54,97 |
| 200 / 500 | 500 / 500 / 500 | 500 / 500 / 500 | 6.610,68 | 196,56 |
| 10 / 45 | 35 / 36 / 36 | 35 / 36 / 36 | 14,20 | 28,88 |
| 50 / 225 | 185 / 195 / 182 | 189 / 198 / 183 | 427,17 | 102,36 |

200/500: ShiftSync 6.488,48–6.654,19 ms, CP-SAT 178,31–249,83 ms. Khoảng cách thời
gian cho thấy cần khảo sát hiệu năng, nhưng hai phương pháp không cùng mục tiêu mềm
và không cùng overhead nên không kết luận CP-SAT nhanh hơn tương ứng cho toàn sản phẩm.

50/225: mức mất độ phủ so với optimum lần lượt 4/189=2,12%, 3/198=1,52%,
1/183=0,55%. Đây là thiếu có thể tránh, ngoài thiếu do năng lực/khả dụng thật sự.
Ví dụ seed 42 vẫn bắt buộc thiếu ít nhất 36/225 slot; heuristic thiếu 40 slot.

Đo độ lệch chuẩn tải tuần `giờ được xếp / trần giờ hợp đồng`, gồm người 0 giờ:
ở 200/500, ShiftSync 0,1515–0,1677; CP-SAT 0,3807–0,3912. CP-SAT chỉ tối ưu độ phủ
nên không dùng số này để xếp hạng năng lực tối ưu công bằng của solver. Chỉ số tuần
này khác normalizedLoadStdDev theo tháng của API. Chưa điều chỉnh cơ hội làm việc
theo lịch rảnh/kỹ năng, chưa chứng minh công bằng về cơ hội.

## Cập nhật bảng đánh giá cũ

| Nhận xét cũ | Tình trạng được đối chiếu ngày 30/10 |
| --- | --- |
| Kỹ năng, trùng ca, hợp đồng, nghỉ giữa ca đã có kiểm thử | Vẫn có; benchmark mới kiểm tra độc lập trên fixture giới hạn. |
| Ca 22:00–06:00 bỏ qua nghỉ ngày sau | Đã sửa trong luồng xếp ca; chạy lại 7 OvernightSchedulingRegressionTest đạt, có nghỉ/blackout ngày cuối và kết thúc đúng 00:00. Không suy rộng thành toàn bộ quy trình duyệt nghỉ đều đúng. |
| Tự nới lịch rảnh ±30 phút | Đã đổi: mặc định 0, cấu hình 0–60 phút; 11 AvailabilityPolicyConsistencyTest đạt. |
| Tranh chấp mới chỉ mock | Đánh giá cũ đã lỗi thời: AUTO-031 và bộ SchedulingPostgresIntegrationTest có test PostgreSQL thật. Lượt này Docker daemon không hoạt động nên không chạy lại và không tạo bằng chứng DB mới. Chưa có benchmark tải API/DB. |
| Greedy + MRV + repair chưa tối ưu | Đã đo: bỏ lỡ 1–4 slot trên ba fixture áp lực 50/225. |
| Chưa có số đo quy mô lớn | Nay có số đo service với I/O mock đến 200 NV/500 slot; chưa có throughput, latency API/DB hoặc tải nhiều cửa hàng. |
| Thiếu chi phí, cuối tuần, giảm xáo trộn | Vẫn chưa tối ưu đầy đủ. Có đo mức giữ/thêm/bỏ AUTO ở evaluator, nhưng đo thay đổi không đồng nghĩa tối thiểu hóa thay đổi. |

Chạy lại 44 kiểm thử hồi quy của AvailabilityPolicyConsistencyTest (11),
MinimumRestPolicyTest (10), MonthlyFairnessTest (10), OvernightSchedulingRegressionTest
(7), StaffContractLimitTest (6): 0 failures/errors/skips. Benchmark bản cuối chạy
riêng: 1 JUnit test chứa 30 phương án, 0 failures/errors/skips. Không phải 30 JUnit tests.

## Đối chiếu hệ thống tham chiếu

- [Deputy Auto Scheduling](https://www.deputy.com/features/auto-scheduling) và
  [Deputy API autofill](https://developer.deputy.com/docs/using-the-api-to-auto-fill-deputy-shifts)
  công bố xếp theo khả dụng, nhu cầu và chi phí; API có lựa chọn xét labor cost.
- [UKG Scheduling](https://www.ukg.com/products/features/scheduling) công bố xếp đa
  địa điểm, chia sẻ nhân viên, kết hợp dự báo nhu cầu và giảm overtime.
- [Timefold Employee Shift Scheduling](https://docs.timefold.ai/employee-shift-scheduling/latest/introduction)
  có mục tiêu độ phủ/chi phí/công bằng, ngân sách, rotation và real-time replanning.
- [Google OR-Tools](https://developers.google.com/optimization/scheduling/employee_scheduling)
  là toolkit bộ giải với ví dụ ràng buộc/phân bổ/nguyện vọng, không phải ứng dụng
  quản lý nhân sự hoàn chỉnh. Benchmark này dùng một model tự viết bằng toolkit đó.

Các nguồn trên là tài liệu chính thức về tính năng, không phải số đo đối đầu.
Không chạy Deputy, UKG hoặc Timefold trên dataset này; không tuyên bố ShiftSync nhanh
hay chậm hơn các dịch vụ đó. CP-SAT coverage oracle không thay thế benchmark chung
các mục tiêu công bằng, chi phí, cuối tuần và xáo trộn.

## Tái lập và bằng chứng

Từ thư mục shiftsync-backend trên PowerShell:

```powershell
mvn test -P cpsat-benchmark '-Dtest=CpSatProductionBenchmark' '-DargLine=-XX:ActiveProcessorCount=4 -Xmx2g'
```

- Mã: `shiftsync-backend/src/test/java/com/shiftsync/shift/service/CpSatProductionBenchmark.java`.
- CSV đo và metadata: [benchmark-2026-10-30/results.csv](benchmark-2026-10-30/results.csv),
  [environment.txt](benchmark-2026-10-30/environment.txt),
  [JUnit XML](benchmark-2026-10-30/benchmark-junit.xml).
- Log cục bộ: `shiftsync-backend/target/production-scheduler-benchmark.log`.

Chưa kiểm tra: lịch sử công việc, ca qua tuần/tháng trong benchmark so solver,
nghỉ phép approved (fixture dùng blackout), chứng chỉ hết hạn/cấp độ khác nhau,
placement, hợp đồng nhiều store, ca cuối tuần, chi phí, ưu tiên ca và replan.
Những ràng buộc này cần đưa vào model oracle trước khi áp dụng kết luận rộng hơn.

Ưu tiên kế tiếp: profile vòng MRV/scoring, benchmark mục tiêu mềm chung trên dữ liệu
đa dạng hơn, sau đó đo API + PostgreSQL riêng với throughput/latency và tỷ lệ conflict.
Giữ các fixture mất độ phủ làm mốc kiểm chứng cho mọi thay đổi thuật toán.
