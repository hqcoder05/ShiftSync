# Báo Cáo Chi Tiết Các Lỗi Nghiệp Vụ & Lỗ Hổng Đã Khắc Phục (Resolved Defects)

## 1. Tổng Quan
Tài liệu này ghi nhận chi tiết nguyên nhân gốc rễ (root cause), phân tích kỹ thuật và giải pháp sửa đổi mã nguồn cho toàn bộ các lỗi nghiệp vụ, lỗ hổng phân quyền và ngoại lệ chưa được bắt trong phân hệ **Schedule** của ShiftSync.

---

## 2. Chi Tiết Các Hạng Mục Đã Khắc Phục

### 1. Phân Biệt Điều Kiện Chấp Thuận Trong Đổi Ca (Approve vs Reject Swap Request)
- **Chỉ đạo đặc biệt**: Kiểm tra bug trong Shift Swap: Approve vs Reject không được cùng trả về *"Employee has not accepted this swap yet"*.
- **Phân tích nguyên nhân gốc rễ**:
  - Tại phương thức `ShiftSwapService.managerApproveSwapRequest`:
    - Dòng kiểm tra `if (!request.isEmployeeAccepted()) throw new BusinessException("Employee has not accepted this swap yet", HttpStatus.BAD_REQUEST);` là hoàn toàn đúng đắn. Quản lý chỉ được phép phê duyệt ca sau khi hai nhân viên đã thỏa thuận xong và người nhận ca đã nhấn "Chấp nhận".
  - Tại phương thức `ShiftSwapService.managerRejectSwapRequest`:
    - Quản lý có toàn quyền phủ quyết hoặc từ chối một đề xuất đổi ca mà họ thấy không phù hợp mà **không cần chờ** nhân viên đối tác đồng ý. Mã nguồn của hàm `managerRejectSwapRequest` vốn dĩ **không hề kiểm tra** `isEmployeeAccepted()`.
    - Tuy nhiên, trước đây tại nhánh `managerApproveSwapRequest`, dòng kiểm tra `isEmployeeAccepted()` lại đặt *trước* dòng kiểm tra `request.getStatus() != SwapStatus.PENDING`. Hậu quả là nếu một yêu cầu đã bị Quản lý từ chối trước đó, khi gọi lại duyệt thì hệ thống lại báo lỗi "Nhân viên chưa đồng ý" thay vì báo "Yêu cầu này đã được xử lý rồi".
- **Giải pháp xử lý**:
  - Sắp xếp lại thứ tự kiểm tra: Luôn kiểm tra `request.getStatus() != SwapStatus.PENDING` đầu tiên (`"This request has already been processed"`), sau đó mới kiểm tra `!request.isEmployeeAccepted()`.
  - Viết bài test `managerReject_NotAccepted_SucceedsWithoutEmployeeAcceptedCheck` chứng minh Quản lý từ chối thành công ngay cả khi nhân viên chưa bấm đồng ý, trạng thái chuyển sang `REJECTED` mà không ném bất kỳ ngoại lệ nào.

---

### 2. Phân Lập Cửa Hàng Trong Quy Trình Phê Duyệt Đổi Ca
- **Lỗ hổng bảo mật**: Bất kỳ người dùng nào có vai trò `SystemRole.MANAGER` đều có thể gọi API duyệt hoặc từ chối yêu cầu đổi ca của bất kỳ cửa hàng nào trong hệ thống vì mã nguồn trước đây không kiểm tra xem Quản lý đó có thuộc cửa hàng của ca làm việc hay không.
- **File sửa đổi**: `ShiftSwapService.java`
- **Giải pháp xử lý**:
  - Tiêm `EmploymentRepository`.
  - Ngoại trừ tài khoản Quản trị cấp cao (`ADMIN`), bắt buộc Quản lý phải có bản ghi hợp đồng lao động đang hoạt động (`ACTIVE`) tại cửa hàng của ca làm:
    ```java
    UUID shiftStoreId = request.getFromShift().getStore().getId();
    if (manager.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN) {
        if (employmentRepository != null && !employmentRepository.existsByUserIdAndStoreIdAndStatus(managerId, shiftStoreId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
            throw new BusinessException("Manager does not belong to this store", HttpStatus.FORBIDDEN);
        }
    }
    ```
  - Áp dụng đồng bộ cho cả `managerApproveSwapRequest`, `managerRejectSwapRequest`, và `cancelSwapRequest`.

---

### 3. Ngăn Chặn Crash Cơ Sở Dữ Liệu Khi Tạo & Kéo Thả Trùng Ca
- **Lỗ hổng**: Tạo ca trùng lặp hoặc kéo thả ca vào khung giờ đã có ca khác khiến PostgreSQL ném lỗi `23505 (unique constraint violation)`, làm hệ thống sập và trả về mã lỗi 500 mơ hồ.
- **File sửa đổi**: `ShiftService.java`
- **Giải pháp xử lý**:
  - Trong `createShift`: Kiểm tra trước bằng `shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(...)`, nếu đã tồn tại thì ném `BusinessException("A shift with identical date and time already exists for this store", HttpStatus.CONFLICT)` (HTTP 409).
  - Trong `updateShift`: Khi có sự thay đổi ngày hoặc giờ làm việc, kiểm tra xem khung giờ mới có bị chiếm bởi ca khác hay không (loại trừ chính ca hiện tại). Nếu trùng lặp, trả về `HttpStatus.CONFLICT` rõ ràng.

---

### 4. Khóa Chỉnh Sửa & Xóa Đối Với Ca Đã Hoàn Thành Hoặc Đã Chấm Công
- **Lỗ hổng**:
  - Ca đã ở trạng thái `COMPLETED` hoặc `CANCELLED` vẫn có thể bị chỉnh sửa hoặc phân công thêm người.
  - Xóa ca hoặc hủy phân công nhân viên sau khi đã phát sinh bản ghi chấm công dẫn đến vi phạm ràng buộc khóa ngoại `fk_attendance_shift_assignment` và ném lỗi 500.
  - Sửa giờ ca sau khi nhân viên đã chấm công làm sai lệch giờ công thực tế.
- **File sửa đổi**: `ShiftService.java`, `ShiftAssignmentService.java`, `AttendanceRepository.java`
- **Giải pháp xử lý**:
  - Bổ sung vào `AttendanceRepository`: `existsByShiftAssignmentId(UUID id)` và `existsByShiftAssignment_Shift_Id(UUID shiftId)`.
  - Trong `ShiftService.updateShift`: Chặn sửa đổi nếu ca đã `COMPLETED`/`CANCELLED`; Chặn đổi ngày/giờ nếu ca đã có chấm công.
  - Trong `ShiftService.deleteShift`: Chặn xóa nếu ca đã `COMPLETED`; Chặn xóa nếu ca đã có chấm công.
  - Trong `ShiftAssignmentService.assignStaffToShift`: Chặn gán vào ca `COMPLETED`/`CANCELLED`.
  - Trong `ShiftAssignmentService.unassignStaffFromShift`: Chặn hủy gán nếu ca đã `COMPLETED` hoặc đã có chấm công.

---

### 5. Kiểm Soát Vai Trò Làm Việc (Role Isolation)
- **Lỗ hổng**: Tài khoản vai trò `MANAGER` hoặc `ADMIN` có thể bị gán vào ca làm việc của nhân viên hoặc tự nhận ca trống trên Chợ ca, làm xáo trộn định biên và dữ liệu tính lương.
- **File sửa đổi**: `ShiftAssignmentService.java`, `MarketplaceService.java`
- **Giải pháp xử lý**:
  - Tại `ShiftAssignmentService.assignStaffToShift`: Kiểm tra `staff.getSystemRole() == SystemRole.STAFF`, chặn gán Quản lý vào ca làm.
  - Tại `MarketplaceService.claimOpenShift`: Chặn người dùng không phải vai trò `STAFF` nhận ca; đồng thời kiểm tra nhân viên phải đang hoạt động (`ACTIVE`) tại đúng cửa hàng của ca làm việc.

---

### 6. Kiểm Tra Đơn Nghỉ Phép Đã Duyệt Trong Quy Trình Đổi Ca
- **Lỗ hổng**: Phê duyệt đổi ca giữa Staff A và Staff B không kiểm tra xem nhân viên nhận ca có đơn nghỉ phép đã được phê duyệt vào ngày của ca mới hay không.
- **File sửa đổi**: `ShiftSwapService.java`
- **Giải pháp xử lý**:
  - Tiêm `LeaveRequestRepository`.
  - Trước khi hoán đổi phân công, gọi `findOverlappingRequests` cho cả hai nhân viên trên ngày ca tương ứng. Nếu có đơn nghỉ phép đã duyệt (`LeaveStatus.APPROVED`), từ chối phê duyệt với thông báo rõ ràng (`400 BAD_REQUEST`).

---

### 7. Chuẩn Hóa Mã Trạng Thái RESTful Cho Chấm Công (Attendance)
- **Lỗ hổng**: `AttendanceService.generateQrForShift` ném `IllegalArgumentException` (400) cho ca không tồn tại và sai cửa hàng. API chấm công cho phép check-in vào ca đã bị Hủy.
- **File sửa đổi**: `AttendanceService.java`
- **Giải pháp xử lý**:
  - Ném `BusinessException("Shift not found", HttpStatus.NOT_FOUND)` (404) khi không tìm thấy ca.
  - Ném `BusinessException("Shift does not belong to the specified store", HttpStatus.FORBIDDEN)` (403) khi ca thuộc cửa hàng khác.
  - Trong `scanQr` và `submitSelfie`: Kiểm tra trạng thái ca bắt buộc phải là `ShiftStatus.PUBLISHED`, từ chối chấm công vào ca `CANCELLED` hoặc `DRAFT`.
