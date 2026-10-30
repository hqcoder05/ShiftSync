# SCHED-030 — Header Lịch làm việc gọn cho thao tác

Ngày: 25/10/2026  
Phạm vi: header Schedule, không thay đổi dữ liệu hoặc luồng lịch.

- Bỏ eyebrow `VẬN HÀNH / NHÂN SỰ` và câu mô tả lặp lại.
- Giữ tên trang, KPI số nhân viên/ca trong khoảng và các tab thao tác;
  giảm khoảng dọc header để bảng lịch xuất hiện sớm hơn trên màn hình nhỏ.
- Playwright fixture 390px xác nhận header giảm từ vùng 215px xuống 147px;
  tab và bảng giữ được luồng. Cần hồi quy dữ liệu lịch thật cùng đợt Schedule.
