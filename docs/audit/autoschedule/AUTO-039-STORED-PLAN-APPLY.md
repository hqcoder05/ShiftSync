# AUTO-039 — Áp dụng đúng phương án đã xem

Ngày kiểm chứng: 29/10/2026. Đây là một mốc trong AUTO-030, không xác nhận toàn bộ
thuật toán đạt mức tương đương sản phẩm lớn.

## Hành vi

- Dry-run rollback dữ liệu lịch, sau đó lưu snapshot server vào bảng auto_schedule_plan
  (migration V52), gắn cửa hàng, người tạo, phiên bản đầu vào và hạn 15 phút.
- POST /api/stores/{storeId}/shifts/auto-schedule/plans/{planId}/apply đọc snapshot này;
  không nhận phân công từ client và không gọi lại solver.
- Giữ phân công ngoài AUTO, thay AUTO đúng phương án, tạo ca định biên đã xuất hiện
  trong preview. Chuyển ID tạm sang ID thật trong kết quả. Không tạo ca ngoài preview.
- Áp dụng trong SERIALIZABLE, khóa hàng phương án; cùng transaction lưu kết quả trả lại.
  Thử lại phương án đã áp dụng trả kết quả cũ, không ghi phân công lần hai.
- Hết hạn hoặc đầu vào thay đổi trả 409. Sai cửa hàng/người tạo trả 404; controller
  vẫn kiểm tra ADMIN hoặc MANAGER có quyền tại store. Sự kiện phát sau commit.
- Không chạy thêm phân bổ 3D khi apply để giữ nguyên phương án đã xác nhận.

## Phiên bản và giới hạn

SchedulingInputVersion băm dữ liệu liên quan: nhân viên, employment, hợp đồng, kỹ năng,
lịch rảnh, nghỉ/blackout, ca và phân công xuyên cửa hàng của người liên quan, cấu hình,
định biên và layout. Băm thêm bytecode các lớp chính để vô hiệu phương án qua thay đổi
triển khai. Lượt capture đầu chạy trước mọi ghi tạm của solver; đối chiếu lại khi lưu
preview và trong transaction apply.

Phạm vi băm bảo thủ, gồm lịch sử của nhóm liên quan: thay đổi không tác động thực tế
đến tuần xếp vẫn có thể yêu cầu tạo lại preview. Chưa benchmark chi phí aggregate JSON,
thời gian giữ transaction hoặc tỷ lệ xung đột dưới tải lớn. Dọn phương án cũ của người
tạo khi tạo preview mới; chưa có job dọn nền. Không suy ra đây là kiểm chứng quy mô lớn.

## Bằng chứng

- PostgreSQL riêng: 43/43 tests đạt, 0 failures/errors/skips; lần cuối 12:45 ngày 29/10.
  XML tại shiftsync-backend/target/scheduler-postgres-evidence.
- 16 ca mới trong tổng trên: apply chính xác và retry không lặp; ca sinh từ định biên;
  10 dạng thay đổi đầu vào; sai chủ/store/hết hạn; store không liên quan; hai phương án
  tranh chấp; lỗi giữa apply khôi phục AUTO cũ và cho thử lại.
- 413 unit hồi quy liên quan và 6 tests quyền controller đạt ở lượt kiểm tra trước.
- 8 frontend model tests và production build đạt; cảnh báo chunk lớn còn tồn tại.
- Edge headless với response JSON từ PostgreSQL test và API route mock: thành công có
  đúng 1 solver POST dry-run và 1 apply POST; không gọi lại solver khi áp dụng.
- Edge nhánh 409: khóa nút apply, tạo preview mới rồi cho apply lại (2 dry-run POST,
  1 apply POST). Đây là kiểm tra UI giả lập API, không phải full-stack demo test.
- Không reset hay ghi lịch lên database vận hành. Chưa chạy toàn bộ mvn clean install.

## Chưa hoàn thành

Điểm phương án cuối, giải thích từng lựa chọn, tối ưu chi phí/cuối tuần/xáo trộn lịch,
đối chiếu CP-SAT cùng mục tiêu, kiểm thử tải API và toàn bộ build cô lập còn ở AUTO-030.
