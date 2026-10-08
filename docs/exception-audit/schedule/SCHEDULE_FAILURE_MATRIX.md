# Ma Trận Phân Tích Kịch Bản Thất Bại Phân Hệ Lịch Làm Việc (Schedule)

## Tổng Quan
Ma trận này phân loại và phân tích toàn diện tất cả các kịch bản lỗi, trường hợp biên (edge cases), xử lý đồng thời (concurrency), và quy tắc kiểm soát logic nghiệp vụ trên toàn bộ phân hệ Lịch làm việc (Schedule) cùng các module phụ thuộc trực tiếp.

---

## 1. Khởi Tạo Ca Làm Việc & Mẫu Ca (Shift Creation & Templates)

| Mã Kịch Bản | Mô Tả Kịch Bản Lỗi | Điều Kiện Tiền Đề Kích Hoạt | Kết Quả Kỳ Vọng | Ngoại Lệ / Mã Lỗi HTTP | Trạng Thái Triển Khai |
|---|---|---|---|---|---|
| **SCN-CRT-01** | Nghịch Đảo Thời Gian Bắt Đầu / Kết Thúc | Ca có `startTime >= endTime` (ví dụ 17:00 đến 09:00 mà không thuộc cấu hình ca qua đêm) | Yêu cầu bị từ chối ngay lập tức | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-CRT-02** | Vi Phạm Khung Giờ Mở/Đóng Cửa Hàng | Ca bắt đầu trước giờ mở cửa (`openTime`) hoặc kết thúc sau giờ đóng cửa (`closeTime`) | Yêu cầu bị từ chối ngay lập tức | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-CRT-03** | Trùng Kỳ Lương Đã Bị Khóa | Ngày tạo ca rơi vào kỳ lương đã chốt hoặc đã chi trả (`CONFIRMED` / `PAID`) | Chặn tạo ca để bảo toàn bảng lương | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-CRT-04** | Trùng Lặp Danh Tính Ca Hoàn Toàn | Cố tình tạo ca trùng lặp cùng `(storeId, shiftDate, startTime, endTime)` | Từ chối sạch với mã xung đột | `BusinessException` (409 CONFLICT) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-CRT-05** | Sai Lệch Mẫu Ca Thuộc Cửa Hàng Khác | `shiftTemplateId` cung cấp không thuộc về `storeId` đang thao tác | Tìm kiếm mẫu ca thất bại | `BusinessException` (404 NOT_FOUND) | **EXPECTED / ĐÃ XÁC MINH** |

---

## 2. Chỉnh Sửa Ca & Kéo Thả Trực Quan (Shift Modification & D&D)

| Mã Kịch Bản | Mô Tả Kịch Bản Lỗi | Điều Kiện Tiền Đề Kích Hoạt | Kết Quả Kỳ Vọng | Ngoại Lệ / Mã Lỗi HTTP | Trạng Thái Triển Khai |
|---|---|---|---|---|---|
| **SCN-MOD-01** | Sửa Đổi Ca Đã Đóng / Hoàn Thành | Cố tình chỉnh sửa ca ở trạng thái `COMPLETED` hoặc `CANCELLED` | Khóa chỉnh sửa dữ liệu lịch sử | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-MOD-02** | Dời Ca Đè Lên Khung Giờ Ca Khác | Đổi ngày hoặc giờ làm trùng khít vào ca đã có sẵn của cửa hàng | Phát hiện xung đột trước khi lưu DB | `BusinessException` (409 CONFLICT) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-MOD-03** | Đổi Ngày/Giờ Ca Đã Có Dữ Liệu Chấm Công | Dời giờ ca khi nhân viên đã chấm công vào ca đó | Khóa đổi giờ làm để bảo vệ tính toàn vẹn dữ liệu chấm công | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-MOD-04** | Tái Xác Thực Nhân Viên Khi Kéo Thả Ca | Kéo ca sang ngày mới mà nhân viên đang gán có đơn nghỉ phép hoặc ngày bận | Kích hoạt tái thẩm định điều kiện hợp lệ | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-MOD-05** | Sửa Ngày Ca Rơi Vào Kỳ Lương Đã Khóa | Chuyển ngày ca làm vào kỳ lương đã đóng | Từ chối sửa ca | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |

---

## 3. Phân Công Nhân Viên & Phân Lập Vai Trò (Staff Assignment & Role Isolation)

| Mã Kịch Bản | Mô Tả Kịch Bản Lỗi | Điều Kiện Tiền Đề Kích Hoạt | Kết Quả Kỳ Vọng | Ngoại Lệ / Mã Lỗi HTTP | Trạng Thái Triển Khai |
|---|---|---|---|---|---|
| **SCN-ASN-01** | Gán Người Dùng Không Phải STAFF | Gán tài khoản có vai trò `MANAGER` hoặc `ADMIN` vào làm ca | Từ chối; chỉ tài khoản vai trò `STAFF` mới được gán ca | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-ASN-02** | Gán Nhân Viên Vào Ca Đã Đóng | Gán nhân viên vào ca đã `COMPLETED` hoặc `CANCELLED` | Chặn phân công | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-ASN-03** | Nhân Viên Không Hoạt Động Tại Store | Gán nhân viên không có hợp đồng hoạt động (`EmploymentStatus != ACTIVE`) | Chặn phân công | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ASN-04** | Phân Công Trùng Nhân Viên Vào Ca | Nhân viên đã có trong ca nhưng gọi gán lại mà không đổi khu vực làm việc | Báo lỗi trùng lặp | `BusinessException` (409 CONFLICT) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ASN-05** | Hết Hạn Chứng Chỉ Kỹ Năng Bắt Buộc | Nhân viên có kỹ năng nhưng chứng chỉ đã hết hạn trước ngày ca làm | Chặn phân công | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ASN-06** | Định Biên Ca Đã Đầy (Slot Full) | Số lượng nhân viên đã gán >= tổng định biên yêu cầu của ca | Chặn gán thêm nhân viên | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ASN-07** | Vượt Quá Giờ Làm Tối Đa Trong Tuần | Việc gán ca khiến nhân viên vượt ngưỡng giờ làm tối đa theo quy định | Thực thi giới hạn làm thêm | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ASN-08** | Trùng Giờ Làm Việc Trong Ngày | Nhân viên đã có ca làm khác trùng lặp khung giờ trong cùng ngày | Chặn xếp ca trùng giờ | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ASN-09** | Xung Đột Lịch Nghỉ Phép Đã Duyệt | Nhân viên có đơn nghỉ phép đã được duyệt vào ngày của ca làm | Tôn trọng lịch nghỉ phép đã duyệt | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ASN-10** | Trùng Ngày Bận (Blackout Date) | Nhân viên đã đăng ký ngày bận cá nhân vào ngày của ca làm | Tôn trọng đăng ký ngày bận | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |

---

## 4. Quy Trình Đổi Ca & Đối Soát Phê Duyệt (Shift Swap & Peer Exchanges)

| Mã Kịch Bản | Mô Tả Kịch Bản Lỗi | Điều Kiện Tiền Đề Kích Hoạt | Kết Quả Kỳ Vọng | Ngoại Lệ / Mã Lỗi HTTP | Trạng Thái Triển Khai |
|---|---|---|---|---|---|
| **SCN-SWP-01** | Đổi Ca Khác Cửa Hàng | Nhân viên cố tình đổi ca giữa 2 cửa hàng khác nhau | Chặn đổi ca; bắt buộc cùng cửa hàng | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-SWP-02** | Tự Đổi Ca Với Chính Mình | `fromStaffId.equals(toStaffId)` | Chặn tự đổi ca | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-SWP-03** | Đổi Ca Chưa Được Xuất Bản | Ca nguồn hoặc ca đích ở trạng thái `DRAFT` hoặc `CANCELLED` | Chỉ cho phép đổi ca đã `PUBLISHED` | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-SWP-04** | Đổi Ca Đã Có Dữ Liệu Chấm Công | Một trong hai ca đã phát sinh bản ghi chấm công | Chặn đổi ca đã/đang diễn ra | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-SWP-05** | Đã Có Yêu Cầu Đổi Ca Đang Chờ | Ca nguồn hoặc ca đích đã có một yêu cầu đổi ca khác ở trạng thái `PENDING` | Chặn tạo trùng yêu cầu | `BusinessException` (409 CONFLICT) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-SWP-06** | Quản Lý Duyệt Khi Nhân Viên Chưa Đồng Ý | Quản lý bấm Duyệt trước khi nhân viên đối tác đồng ý | Chặn duyệt với thông báo chuẩn: "Employee has not accepted this swap yet" | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-SWP-07** | Quản Lý Từ Chối Khi Nhân Viên Chưa Đồng Ý | Quản lý bấm Từ chối yêu cầu đổi ca đang chờ | Cho phép từ chối mà không cần chờ nhân viên đồng ý (Quyền phủ quyết của Quản lý) | `200 OK` (Trạng thái chuyển sang `REJECTED`) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-SWP-08** | Quản Lý Cửa Hàng Khác Thao Tác Đổi Ca | Quản lý Cửa hàng B cố tình duyệt/từ chối đổi ca tại Cửa hàng A | Chặn hành vi vi phạm ranh giới cửa hàng | `BusinessException` (403 FORBIDDEN) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-SWP-09** | Nhân Viên Đổi Ca Vướng Lịch Nghỉ Phép | Nhân viên nhận ca đổi đang có lịch nghỉ phép đã duyệt vào ngày đó | Chặn duyệt đổi ca để tránh xếp ca vào ngày nghỉ | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |

---

## 5. Xóa Ca Làm Việc & Hủy Phân Công (Shift Deletion & Unassignment)

| Mã Kịch Bản | Mô Tả Kịch Bản Lỗi | Điều Kiện Tiền Đề Kích Hoạt | Kết Quả Kỳ Vọng | Ngoại Lệ / Mã Lỗi HTTP | Trạng Thái Triển Khai |
|---|---|---|---|---|---|
| **SCN-DEL-01** | Xóa Ca Đã Hoàn Thành | Quản lý gọi xóa ca có trạng thái `COMPLETED` | Chặn xóa để bảo vệ lịch sử kỳ lương | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-DEL-02** | Xóa Ca Đã Có Dữ Liệu Chấm Công | Ca có phân công đã liên kết với bản ghi bảng `attendance` | Chặn xóa sạch bằng lỗi nghiệp vụ thay vì vỡ khóa ngoại DB | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-DEL-03** | Hủy Phân Công Ca Đã Hoàn Thành | Cố tình hủy gán nhân viên sau khi ca đã kết thúc | Chặn hủy gán | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-DEL-04** | Hủy Phân Công Nhân Viên Đã Chấm Công | Nhân viên đã quét mã vào ca; Quản lý bấm hủy gán | Chặn với thông báo rõ ràng, bảo vệ dữ liệu công | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |

---

## 6. Chấm Công, Mã QR & Hàng Rào Địa Lý (Attendance & Geofence)

| Mã Kịch Bản | Mô Tả Kịch Bản Lỗi | Điều Kiện Tiền Đề Kích Hoạt | Kết Quả Kỳ Vọng | Ngoại Lệ / Mã Lỗi HTTP | Trạng Thái Triển Khai |
|---|---|---|---|---|---|
| **SCN-ATT-01** | Tạo Mã QR Ca Không Tồn Tại | ID ca không có trong cơ sở dữ liệu | Trả về chuẩn REST 404 NOT_FOUND | `BusinessException` (404 NOT_FOUND) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-ATT-02** | Tạo Mã QR Cho Ca Cửa Hàng Khác | Ca thuộc Store B, Quản lý gọi API với Store A | Trả về chuẩn REST 403 FORBIDDEN | `BusinessException` (403 FORBIDDEN) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-ATT-03** | Chấm Công Vào Ca Đã Hủy / Ca Nháp | Nhân viên quét QR hoặc chụp ảnh cho ca `CANCELLED` hoặc `DRAFT` | Từ chối chấm công | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-ATT-04** | Chấm Công Quá Sớm Ngoài Khung Giờ | Nhân viên chấm công trước khoảng thời gian cho phép | Báo chưa đến giờ chấm công | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ATT-05** | Vi Phạm Hàng Rào Địa Lý (Geofence) | Tọa độ GPS của nhân viên nằm ngoài bán kính cho phép của cửa hàng | Từ chối chấm công | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-ATT-06** | Chấm Công Ra Hai Lần (Double Check-Out) | Nhân viên đã checkout thành công cố tình quét checkout lần nữa | Báo ca làm việc đã được checkout | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |

---

## 7. Chợ Ca Trống & Xử Lý Đồng Thời (Marketplace & Concurrency)

| Mã Kịch Bản | Mô Tả Kịch Bản Lỗi | Điều Kiện Tiền Đề Kích Hoạt | Kết Quả Kỳ Vọng | Ngoại Lệ / Mã Lỗi HTTP | Trạng Thái Triển Khai |
|---|---|---|---|---|---|
| **SCN-MKT-01** | Người Dùng Không Phải STAFF Nhận Ca | Quản lý hoặc Admin bấm nhận ca trống trên Chợ ca | Chặn; chỉ STAFF mới được nhận ca | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-MKT-02** | Nhân Viên Cửa Hàng Khác Nhận Ca | Nhân viên bị đình chỉ hoặc thuộc chi nhánh khác nhận ca | Chặn nhận ca | `BusinessException` (400 BAD_REQUEST) | **RESOLVED & ĐÃ XÁC MINH** |
| **SCN-MKT-03** | Tranh Chấp Khóa Phân Tán Đồng Thời | Nhiều nhân viên cùng bấm nhận ca tại một mili-giây | Khóa Redisson Client bảo đảm an toàn dữ liệu; người chậm tay nhận 429 hoặc 409 | `BusinessException` (429 / 409) | **EXPECTED / ĐÃ XÁC MINH** |
| **SCN-MKT-04** | Hết Hạn Nhận Ca Trống | Quá thời hạn đăng ký (`availabilityDeadline`) hoặc ca đã bắt đầu | Từ chối cho phép nhận ca | `BusinessException` (400 BAD_REQUEST) | **EXPECTED / ĐÃ XÁC MINH** |
