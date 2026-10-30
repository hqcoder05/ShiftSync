# OPS-029 — Cảnh báo vận hành nói rõ cách xử lý

Ngày: 25/10/2026  
Phạm vi: `AttentionCenter` trong Cửa hàng 3D; không thay đổi API hoặc dữ liệu.

## Vấn đề

Các thẻ cảnh báo trước đây nêu chênh lệch và tác động, nhưng hành động phụ là
`Tìm ứng viên` dù nút thực tế chỉ chọn khu vực. Điều này làm người quản lý hiểu
sai rằng hệ thống đã mở được một luồng tuyển người.

## Thay đổi

- Mỗi loại cảnh báo (trạm chưa phân công, trống nhân sự, thiếu người, dư người,
  ngoài kế hoạch) có `Hướng xử lý` mô tả bước tiếp theo theo số liệu hiện hữu.
- Phân biệt `Tác động` với `Hướng xử lý`, để trả lời trực tiếp: có vấn đề gì,
  ở đâu và cần làm gì.
- Đổi nhãn hành động thành `Focus trong 3D`, `Mở khu vực` hoặc `Mở chi tiết trạm`.
  Các nhãn này đúng với callback hiện có; không tạo giả lập marketplace/ứng viên.
- CTA Focus tiếp tục gọi camera focus sẵn có, còn mở chi tiết giữ lựa chọn đối
  tượng trong inspector.

## Kiểm chứng

- `npm run build`: PASS ngày 25/10/2026; Vite chỉ cảnh báo bundle lớn có sẵn.
- Playwright dev fixture tại `/schedule?view=3d`, 1920×1080: thanh trạng thái,
  mở cảnh báo, dialog không có lỗi console. Ảnh: `.playwright-mcp/operations-029-empty-1920.png`.
- Playwright 390×844: document `scrollWidth=390`, dialog nằm trong viewport
  (`x=12`, `width=366`, `bottom=744.5`).
- Fixture không có ca được chọn nên chỉ xác nhận trạng thái trống và hình học
  dialog; nội dung từng thẻ cảnh báo cần hồi quy với store/ngày có ca thật.
