# FIX-039 — Publish lịch có kết quả nhìn thấy được

**Ngày:** 24/10/2026  
**Phạm vi:** Schedule publish (`POST /api/stores/{storeId}/shifts/publish`)

## Vấn đề

Nút **Lịch xuất bản** đã gọi API thật nhưng luôn hiển thị toast thành công chung chung. UI không cho biết có bao nhiêu ca thực sự đổi trạng thái, nên lần bấm lại trên lịch đã công bố trông như không có thay đổi. Backend cũng gửi thông báo lặp lại cho nhân viên vì phát thông báo ở hai vòng lặp khác nhau.

## Thay đổi

- API publish trả `200 OK` với `ShiftPublishResultDTO`: khoảng ngày, tổng số ca, số ca vừa công bố, số ca đã công bố trước đó và số nhân viên nhận thông báo.
- Backend chỉ gửi một thông báo cho mỗi nhân viên có ca **vừa** được công bố; lần bấm lại không gửi thêm thông báo.
- Nút lịch hiển thị `Công bố N ca`, `Đang xuất bản…`, hoặc `Đã xuất bản P/T`; bị vô hiệu khi không còn ca nháp để tránh thao tác không có tác dụng.
- Toast hiển thị kết quả thực tế; nếu không có ca mới, thông báo rõ lịch đã công bố hoặc khoảng ngày chưa có ca.
- Chặn request lặp trong khi API đang xử lý.

## Kiểm chứng

- `npm run build` trong `ShiftSync-Web`: PASS. Vẫn có cảnh báo Vite về chunk lớn.
- `mvn test -Dtest=ShiftServiceAssignmentDelegationTest`: 4/4 PASS. Test mới xác nhận một ca DRAFT chuyển PUBLISHED, một ca đã PUBLISHED không bị tính lại, và không gửi thông báo khi không có phân công.
- Chưa thực hiện publish ghi dữ liệu qua Docker/Edge vì Docker STAB-003 vẫn cần rebuild; kiểm chứng API/browser thật được đưa vào đợt backend Docker tiếp theo.
