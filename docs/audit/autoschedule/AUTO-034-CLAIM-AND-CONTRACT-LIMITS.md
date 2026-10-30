# AUTO-034 — Quyền bỏ qua lịch rảnh và hợp đồng xuyên cửa hàng

## Các lỗi được sửa

ShiftAssignmentValidator.validateEligibility có cờ overrideAvailability, nhưng cờ này
trước đây cũng bỏ qua kỹ năng, hạn dùng kỹ năng, tổng số chỗ và số chỗ theo kỹ năng.
Nhận ca mở truyền true vì nhân viên tự nguyện nhận ngoài lịch rảnh; vô tình nhận cả
quyền vượt các ràng buộc khác. Nay true chỉ bỏ qua recurring availability. Giữ kiểm
tra trùng ca, giờ tuần, nghỉ phép, blackout, kỹ năng còn hạn và capacity.

Phân công tay force cũng chỉ bỏ qua recurring availability, không thêm ứng viên vào
requirement đã đủ chỗ. OpenAPI mô tả rõ ý nghĩa trường force.

Marketplace trước đây điền requiredSkillId bằng vị trí trống đầu tiên; nay dùng
selectClaimSkill để chọn vị trí còn chỗ mà nhân viên có kỹ năng hợp lệ (giữ hỗ trợ
kỹ năng tương đương theo tên). Nếu không có yêu cầu kỹ năng thì không gán nhãn giả;
ca không có requirement có một chỗ mặc định và không được vượt số đó.

## Quy tắc hợp đồng

ShiftValidationService trước đây lấy findFirst từ danh sách employment không có thứ
tự. Auto lại chỉ đọc hợp đồng cửa hàng đang xếp. Nay StaffContractLimit chọn hạn mức
thấp nhất của mọi employment ACTIVE có liên quan đến nhân viên, áp dụng lên tổng
giờ thực tế của người đó ở mọi cửa hàng. Không cộng các hạn mức với nhau. Thiếu hợp
đồng, thiếu trần hoặc trần không dương được báo lỗi dữ liệu, không fallback trần lớn.

Đây là chính sách sản phẩm nhằm tôn trọng mọi hợp đồng ACTIVE, không phải diễn giải
pháp luật. Một quan hệ không còn áp dụng cần được chuyển khỏi ACTIVE. Có thể cần
mô hình hợp đồng cấp tổ chức nếu nghiệp vụ muốn thay đổi ý nghĩa giới hạn này.

Auto tải employment của toàn bộ nhân viên một lần qua findByUserIdInAndStatus và
EntityGraph user/contractType. Dùng trần tổng hợp trong lọc ứng viên, local repair và
chấm điểm. Luồng tay/đổi ca/nhận ca dùng cùng helper. Giữ cách tách giờ theo tuần
thực tế từ AUTO-032. Các trần cấu hình riêng của store vẫn cần đối chiếu thêm.

## Kiểm thử bổ sung

- AvailabilityOverrideSafetyTest: ngoài lịch rảnh vẫn nhận đúng kỹ năng; không thể
  vượt thiếu kỹ năng, kỹ năng hết hạn, vị trí đã đầy hoặc tổng capacity; kỹ năng
  tương đương theo tên vẫn ánh xạ sang role của store đích.
- StaffContractLimitTest: thứ tự repository không ảnh hưởng trần; không cộng hai
  hợp đồng; từ chối thiếu/sai cấu hình hợp đồng.
- ShiftTimeValidationTest: danh sách 48/8 hoặc 8/48 cho cùng kết quả, đúng trần được
  phép nhưng vượt trần bị chặn.
- PostgreSQL: ca có hai kỹ năng, không lịch rảnh, người thiếu kỹ năng bị từ chối,
  cashier chỉ chiếm cashier; cashier thứ hai không chiếm chỗ barista còn trống.
- PostgreSQL: hai store có hợp đồng 48h/8h, đã làm 6h store B; thêm 8h store A bị
  cả auto/manual từ chối; bỏ 6h cũ thì ca 8h được xếp.

Kết quả: 389 test unit liên quan đạt, 21 test PostgreSQL opt-in chạy riêng đạt; frontend
build đạt với cảnh báo chunk lớn hiện có. Báo cáo PG giữ tại target/scheduler-postgres-evidence.
Lần broad unit ban đầu có một test fixture truyền List.of vào setter entity làm clear()
và lỗi trước khi chạy validator; đã sửa dựng ca generic đúng cách, chạy lại lớp đó 7/7 đạt.
Test chẩn đoán thiếu ca cũ dùng hợp đồng 0 giờ được đổi sang hợp đồng 4 giờ hợp lệ cho
ca 8 giờ, vẫn kiểm tra cùng nguyên nhân HC4; hợp đồng 0 giờ được kiểm tra từ chối riêng.
Không chạy toàn bộ clean install, không reset dữ liệu vận hành.

Trang cài đặt giải thích trần thấp nhất và tổng giờ giữa các chi nhánh để chính sách
không chỉ nằm trong mã backend.

## Còn lại

Chưa xác nhận toàn bộ mục tiêu AUTO-030. Cần giờ nghỉ thống nhất, cách tính tháng,
kiểm tra kỹ năng khi swap theo đúng assignment thay thế, capacity khi nhiều requirement
cùng kỹ năng khác zone, preview/version và benchmark hiệu năng/chất lượng.
