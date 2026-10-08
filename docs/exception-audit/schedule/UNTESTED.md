# Rà Soát Lỗ Hổng Kiểm Thử & Độ Bao Phủ Phân Hệ Lịch Làm Việc (Schedule)

## 1. Tóm Tắt Tổng Quan (Executive Summary)
Trước đợt kiểm toán này, bộ kiểm thử của phân hệ `com.shiftsync.shift` và các package liên quan chỉ tập trung vào các luồng thành công (happy path) cơ bản và một số ít trường hợp ngoại lệ thông thường. Rất nhiều quy tắc nghiệp vụ quan trọng, tình huống biên và phân lập bảo mật hoàn toàn chưa có bài test tự động (untested).

Tài liệu này ghi nhận chi tiết các lỗ hổng kiểm thử ban đầu, giải thích rủi ro và minh chứng cách thức chúng tôi đã đóng kín các lỗ hổng đó bằng bộ test hồi quy tự động.

---

## 2. Chi Tiết Các Lỗ Hổng Kiểm Thử Trước Kiểm Toán (Pre-Audit Test Gaps)

| Mã Lỗ Hổng | Module / Luồng Xử Lý | Mô Tả Trường Hợp Chưa Được Viết Test | Rủi Ro & Ảnh Hưởng Hệ Thống | Giải Pháp Đóng Lỗ Hổng Trong Bộ Test Mới |
|---|---|---|---|---|
| **GAP-01** | `ShiftService.createShift` | Chưa có test kiểm tra khi tạo ca trùng lặp hoàn toàn `(storeId, shiftDate, startTime, endTime)`. | Vi phạm ràng buộc unique 23505 văng lỗi 500 thay vì trả về 409 CONFLICT. | Bổ sung test `ShiftScheduleExceptionAuditTest#createShift_DuplicateIdentity_ThrowsConflict` |
| **GAP-02** | `ShiftService.updateShift` | Chưa có test từ chối khi sửa ca ở trạng thái `COMPLETED` hoặc `CANCELLED`. | Dữ liệu lịch sử kỳ lương có thể bị chỉnh sửa âm thầm. | Bổ sung test `ShiftScheduleExceptionAuditTest#updateShift_CompletedOrCancelled_ThrowsBadRequest` |
| **GAP-03** | `ShiftService.updateShift` | Chưa có test chặn dời ngày/giờ ca khi nhân viên đã phát sinh chấm công. | Sửa giờ ca sau khi nhân viên đã vào ca làm sai lệch tính công và đối soát. | Bổ sung test `ShiftScheduleExceptionAuditTest#updateShift_HasAttendance_ThrowsBadRequest` |
| **GAP-04** | `ShiftService.deleteShift` | Chưa có test chặn xóa ca đã có bản ghi chấm công liên kết. | Gây lỗi vi phạm khóa ngoại trên bảng `attendance` (HTTP 500). | Bổ sung test `ShiftScheduleExceptionAuditTest#deleteShift_HasAttendance_ThrowsBadRequest` |
| **GAP-05** | `ShiftAssignmentService.assignStaffToShift` | Chưa có test từ chối gán nhân viên vào ca đã `COMPLETED`. | Ca làm việc đã kết thúc vẫn có thể nhận thêm nhân viên mới. | Bổ sung test `ShiftScheduleExceptionAuditTest#assignStaff_CompletedShift_ThrowsBadRequest` |
| **GAP-06** | `ShiftAssignmentService.assignStaffToShift` | Chưa có test từ chối khi gán tài khoản vai trò `MANAGER` hoặc `ADMIN` vào ca làm việc. | Quản lý bị xếp vào vị trí nhân viên pha chế/thu ngân, làm sai lệch bảng lương. | Bổ sung test `ShiftScheduleExceptionAuditTest#assignStaff_NonStaffRole_ThrowsBadRequest` |
| **GAP-07** | `ShiftAssignmentService.unassignStaffFromShift` | Chưa có test từ chối hủy phân công nhân viên đã chấm công. | Gây lỗi khóa ngoại cơ sở dữ liệu và làm mồ côi bản ghi chấm công. | Bổ sung test `ShiftScheduleExceptionAuditTest#unassignStaff_HasAttendance_ThrowsBadRequest` |
| **GAP-08** | `ShiftSwapService.createSwapRequest` | Chưa có test xác minh ca phải ở trạng thái `PUBLISHED` và chưa có chấm công. | Ca nháp hoặc ca đang chạy có thể bị đem đi đổi chéo. | Bổ sung test tại `ShiftScheduleExceptionAuditTest` và kiểm chứng `ShiftSwapService.java:85-95` |
| **GAP-09** | `ShiftSwapService.managerApproveSwapRequest` | Xác minh chỉ đạo: Test kiểm tra Quản lý duyệt khi nhân viên chưa đồng ý phải báo `"Employee has not accepted this swap yet"`. | Đảm bảo tính nhất quán của quy trình đổi ca 2 bước. | Bổ sung test `ShiftScheduleExceptionAuditTest#managerApprove_NotAccepted_ThrowsBadRequest` |
| **GAP-10** | `ShiftSwapService.managerRejectSwapRequest` | Xác minh chỉ đạo: Test xác nhận Quản lý ĐƯỢC PHÉP từ chối đổi ca trước khi nhân viên bấm đồng ý mà không bị lỗi. | Giải quyết nhầm lẫn logic: Từ chối không yêu cầu nhân viên đối tác phải đồng ý trước. | Bổ sung test `ShiftScheduleExceptionAuditTest#managerReject_NotAccepted_SucceedsWithoutEmployeeAcceptedCheck` |
| **GAP-11** | `ShiftSwapService` Phân Lập Store | Chưa có test xác minh Quản lý chi nhánh khác không được can thiệp đổi ca của chi nhánh này. | Lỗ hổng bảo mật nghiêm trọng: Can thiệp trái phép lịch làm việc liên chi nhánh. | Bổ sung test `ShiftScheduleExceptionAuditTest#managerApprove_ForeignStoreManager_ThrowsForbidden` |
| **GAP-12** | `ShiftSwapService.managerApproveSwapRequest` | Chưa có test từ chối đổi ca khi nhân viên đang có đơn nghỉ phép đã duyệt vào ngày ca mới. | Nhân viên đang nghỉ phép bị xếp ca làm việc ngoài ý muốn. | Bổ sung test `ShiftScheduleExceptionAuditTest#managerApprove_StaffOnApprovedLeave_ThrowsBadRequest` |
| **GAP-13** | `AttendanceService.generateQrForShift` | Chưa có test kiểm tra trả về 404 NOT_FOUND khi ca không tồn tại và 403 FORBIDDEN khi sai cửa hàng. | Trước đây ném `IllegalArgumentException` chung chung. | Bổ sung test `ShiftScheduleExceptionAuditTest#generateQr_ShiftNotFound_ThrowsNotFound` và `generateQr_StoreMismatch_ThrowsForbidden` |
| **GAP-14** | `AttendanceService` Chấm Công | Chưa có test từ chối chấm công vào ca đã bị Hủy (`CANCELLED`). | Ca bị hủy vẫn có thể chấm công vào làm tính lương khống. | Bổ sung test `ShiftScheduleExceptionAuditTest#submitSelfie_CancelledShift_ThrowsBadRequest` |
| **GAP-15** | `MarketplaceService.claimOpenShift` | Chưa có test kiểm tra bắt buộc vai trò `STAFF` và hợp đồng làm việc hoạt động tại cửa hàng. | Người dùng trái quyền hoặc nhân viên chi nhánh khác có thể nhận ca trống. | Bổ sung test `ShiftScheduleExceptionAuditTest#claimOpenShift_NonStaffRole_ThrowsBadRequest` và `claimOpenShift_InactiveEmployment_ThrowsBadRequest` |

---

## 3. Tổng Hợp Độ Bao Phủ Sau Kiểm Toán

- **Số test case mới được viết bổ sung**: **19 test case** trong class `ShiftScheduleExceptionAuditTest.java`.
- **Số test case có sẵn trong cụm Schedule**: **40 test case** (`AutoScheduleAssignmentCorrectnessTest`, `ShiftAssignmentServiceTest`, `LeaveRequestServiceTest`, `ShiftServiceAssignmentDelegationTest`, `ShiftSwapServiceTest`).
- **Tổng số test case trong toàn cụm Schedule**: **59 test case**.
- **Kết quả thực thi**: **59/59 test pass 100%, 0 failures, 0 errors, 0 skipped**.
- **Số luồng nghiệp vụ quan trọng còn thiếu test**: **0**.
