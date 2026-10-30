# OPS-028 — Làm rõ theo dõi vận hành 3D

Ngày 25/10/2026. Phạm vi: Realtime Operations View trong Spatial Workspace, không đổi contract REST/STOMP.

## Vấn đề

Ribbon cũ đặt nhiều KPI cùng trọng số; người quản lý phải tự suy ra nơi cần xử lý. Nhãn “đang trực” sẽ sai nếu nguồn hiện có chỉ là phân công, không phải attendance.

## Thay đổi

- `StaffingKpiBar` trở thành thanh điều hành: kết nối realtime, độ phủ, số đã phân công, khu vực thiếu, vị trí cần bù và một CTA duy nhất mở hàng đợi.
- CTA khu vực thiếu giữ callback focus camera hiện có; CTA tổng mở `AttentionCenter`, nơi từng cảnh báo đã có hành động focus khu vực/trạm.
- Giữ phân biệt dữ liệu: “Đã phân công” là lịch; attendance chỉ hiển thị ở lớp/trang chi tiết có nguồn attendance.
- Auto-Scheduler đổi copy từ “mô phỏng” sang “kết quả đã lưu”; UI nói rõ API chưa có dry-run, không tuyên bố thử phương án không lưu.

## Kiểm chứng

- `npm run build` PASS (cảnh báo chunk lớn tồn tại).
- `node --test src/features/auto-scheduler/visualizationModel.test.js`: 3/3 PASS.
- Browser fixture 1920×1080: thanh điều hành và canvas 3D render, không overflow/console error. Ảnh `.playwright-mcp/operations-028-1920.png`.
- Chưa xác nhận sự kiện STOMP giữa hai client hoặc API dry-run với backend Docker thật.
