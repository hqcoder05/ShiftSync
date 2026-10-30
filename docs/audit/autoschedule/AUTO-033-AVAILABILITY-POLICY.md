# AUTO-033 — Lịch rảnh qua đêm và chính sách dùng chung

## Hành vi

- Mặc định xếp ca khớp chính xác lịch rảnh. store_configuration có
  availability_tolerance_minutes từ 0 đến 60; dung sai được áp dụng ở hai đầu của
  một khoảng rảnh liên tục, không dùng để lấp khoảng nghỉ nằm giữa hai khung rời.
- AutoScheduleService, ShiftAssignmentValidator và bước duyệt đổi ca dùng chung
  AvailabilityCoverage. Nhân viên tự nhận ca mở vẫn giữ ngoại lệ tự nguyện hiện có:
  bỏ qua lịch rảnh; đây không phải tác dụng của dung sai.
- dayOfWeek là ngày bắt đầu (0=Chủ nhật). endTime < startTime là ngày hôm sau;
  hai đầu bằng nhau không hợp lệ. Kiểm tra trùng đăng ký xét cả ranh giới tuần.
- Khung từ tối hôm trước có thể bao phủ ca sáng hôm sau. Các khung tiếp giáp được
  hợp nhất để kiểm tra coverage; không yêu cầu một bản ghi riêng chứa toàn bộ ca.
- Migration V51 thay constraint lịch rảnh và thêm cấu hình dung sai với mặc định 0.
  Dữ liệu cũ hợp lệ vẫn được giữ. Lịch rảnh và cấu hình ghi bằng SERIALIZABLE.
- GET cấu hình trả chính sách đang lưu; PUT bỏ qua trường mới thì giữ giá trị cũ.
  DTO kiểm tra 0–60, database có CHECK tương ứng. Không tự suy ra dung sai 30 phút.
- Kết quả thử/lưu xếp ca trả availabilityToleranceMinutes thực sự dùng trong lần chạy.

## Giao diện

Cài đặt / Quy tắc lên lịch có ô dung sai và giải thích mặc định/ngoại lệ ca mở.
Trang khả dụng hiển thị chính sách lấy từ máy chủ, giờ qua đêm có nhãn +1 ngày;
form giải thích thời điểm kết thúc ngày hôm sau. Sửa tổng thời lượng qua đêm, bỏ
fallback 8 giờ khi hiệu thời gian âm. Kết quả xếp ca hiển thị chính sách đã dùng.

Cache cài đặt không ghi đè chính sách máy chủ. Khi API không trả trường mới, giao
diện hiển thị chưa tải được thay vì giả định đúng 0; không thay đổi chính sách khi lưu.
Lỗi lưu cấu hình không còn bị nuốt rồi báo thành công. Sửa phạm vi storeOpen/storeClose
để cập nhật thông tin cửa hàng sau lưu không gây ReferenceError.

Kiểm tra Edge 156 headless với session hiện có, chỉ đọc: ô dung sai tải giá trị 0,
trang khả dụng hiển thị đúng chính sách. Ảnh ở target/availability-settings-edge.png
và target/availability-page-edge.png. Chưa thao tác lưu thay đổi trên dữ liệu demo.

## Kiểm chứng

- AvailabilityCoverageTest: biên chính xác tới giây, dung sai, ca đêm, ca sáng hôm sau,
  hợp nhất khung tiếp giáp, không lấp gap, trùng xuyên tuần và cập nhật loại chính nó.
- AvailabilityPolicyConsistencyTest: 11 bộ dữ liệu đối chiếu auto, eligibility,
  phân công tay và kiểm tra lịch rảnh khi đổi ca.
- AvailabilityPolicyConfigurationTest: mặc định, lưu/đọc, bỏ qua trường từ client cũ,
  đặt lại 0, validation giá trị ngoài miền.
- PostgreSQL: CRUD lịch rảnh đêm, trùng xuyên ngày/tuần, lưu ca đêm tự động và bằng tay,
  đổi chính sách từ chính xác sang 30 phút, duyệt đổi ca với đối chứng trước/sau và
  kiểm tra assignment không đổi nếu từ chối.
- AvailabilityIdorSecurityTest nay dùng method-security proxy thật với repository/service
  mock, không khởi động ứng dụng/database/Redis; kiểm tra cả cho phép và từ chối truy cập.
  Lần chọn test trước vô tình khởi tạo test cũ vào datasource mặc định; log ghi schema
  đã ở V51 và không migration thêm, test lỗi ở Redis trước phần tạo fixture. Các lần
  kiểm tra PostgreSQL chủ động vẫn dùng riêng shiftsync_scheduler_test.
- Frontend production build đạt; còn cảnh báo chunk lớn có từ trước.

Kết quả cuối: 375 tests hồi quy đạt, 19 integration tests opt-in skip trong lần unit;
lần PostgreSQL riêng 19/19 đạt. Báo cáo giữ ở target/scheduler-postgres-evidence.
git diff --check các file đã sửa không có lỗi whitespace. Chưa chạy toàn bộ clean install.

## Phần còn lại

Chưa đo tải hoặc chứng minh tối ưu. Giờ công bằng tháng, hợp đồng/giờ nghỉ xuyên cửa
hàng, preview cụ thể và benchmark vẫn theo AUTO-030. Luồng tự nhận ca mở đang truyền
overrideAvailability=true; cần tách rõ quyền bỏ qua lịch rảnh với kỹ năng/capacity trong
giai đoạn hardening tiếp theo. Cần thêm kịch bản sửa lịch rảnh/cấu hình đồng thời xếp ca.
