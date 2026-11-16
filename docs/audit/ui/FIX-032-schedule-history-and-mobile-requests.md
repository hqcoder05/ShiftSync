# FIX-032: Lịch sử ca và yêu cầu Mobile

## Vấn đề

- API lịch sử ca trả metadata nội bộ của `JsonNode`, khiến Mobile không đọc được ngày, giờ, trạng thái và khu vực.
- Hai thông báo Backend chưa được Việt hóa có dấu.
- Màn đổi ca/xin vắng cho phép chạm nút gửi trước khi chọn đủ dữ liệu và hiển thị thông tin ca giả.

## Thay đổi

- API lịch sử trả `Map<String, Object>` được giải mã từ JSON, nên phản hồi là đối tượng JSON chuẩn.
- Việt hóa thông báo duyệt nghỉ và hủy ca.
- Vô hiệu hóa nút gửi đổi ca/xin vắng cho đến khi dữ liệu hợp lệ; thay nội dung giữ chỗ bằng hướng dẫn chọn ca.

## Xác nhận

- `MessagingDatabaseIntegrationTest` chạy với PostgreSQL: 1/1 đạt, bao gồm lịch sử ca có snapshot, khu vực, giờ và trạng thái.
- Mobile web export, Web lint, Web build và 195 Web tests đều đạt.
- Playwright xác nhận Mobile hiển thị đúng lịch sử ca 16/11/2026, nút đổi ca/xin vắng bị vô hiệu hóa khi thiếu dữ liệu, và luồng Mobile gửi nghỉ không lương → Web duyệt → Mobile nhận thông báo tiếng Việt hoạt động.
- Migration V85 cập nhật thông báo lịch sử đã lưu trước khi bản sửa được triển khai.
