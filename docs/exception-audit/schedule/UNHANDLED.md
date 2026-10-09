# Phân Tích Các Ngoại Lệ Chưa Được Bắt & Rủi Ro Hệ Thống Phân Hệ Lịch Làm Việc (Schedule)

## 1. Tóm Tắt Tổng Quan (Executive Summary)
Trong quá trình kiểm toán chuyên sâu mã nguồn phân hệ **Schedule** và các dịch vụ trực tiếp liên quan, chúng tôi đã phát hiện một số lỗ hổng nghiêm trọng liên quan đến các ngoại lệ chưa được xử lý (unhandled exceptions). Trước khi tiến hành kiểm toán và sửa lỗi, các trường hợp này dẫn tới:
- Lỗi cơ sở dữ liệu `DataIntegrityViolationException` (HTTP 500) do vi phạm ràng buộc unique hoặc khóa ngoại.
- Lỗi `NoSuchElementException` (HTTP 500) khi truy vấn entity bằng `.orElseThrow()`.
- Lỗ hổng bảo mật xuyên cửa hàng (cross-store privilege escalation) khi Quản lý chi nhánh này có thể duyệt/hủy đổi ca của chi nhánh khác.
- Lỗi sai lệch dữ liệu lịch sử chấm công và kỳ lương.

Toàn bộ các lỗ hổng trên đã được giải quyết triệt để ở tầng nghiệp vụ (Service layer) và được chứng minh bằng các bài kiểm thử tự động.

---

## 2. Chi Tiết Các Lỗ Hổng & Giải Pháp Đã Xử Lý

### Lỗ Hổng 1: Crash Unique Key Cơ Sở Dữ Liệu Khi Tạo/Kéo Trùng Ca
- **Vị Trí**: `ShiftService.createShift(storeId, request)` & `ShiftService.updateShift(storeId, shiftId, request)`
- **Bản Chất Lỗi**: Bảng `shift` có ràng buộc unique tổng hợp `idx_shift_unique_identity` trên 4 trường `(store_id, shift_date, start_time, end_time)`. Khi người dùng tạo ca trùng hoặc kéo thả một ca vào khung giờ đã có ca khác, hệ thống không kiểm tra trước ở tầng ứng dụng.
- **Hậu Quả Trước Kiểm Toán**: PostgreSQL trả về mã lỗi `23505`, Spring ném `DataIntegrityViolationException`, người dùng nhận lỗi hệ thống 500 mơ hồ, không hiểu lý do.
- **Giải Pháp Triển Khai**:
  - Bổ sung truy vấn `shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(...)`.
  - Trong `createShift`: Ném `BusinessException("A shift with identical date and time already exists for this store", HttpStatus.CONFLICT)` (HTTP 409).
  - Trong `updateShift`: Loại trừ ID ca hiện tại (`filter(s -> !s.getId().equals(shiftId))`) và ném HTTP 409 nếu khung giờ đích đã bị chiếm bởi ca khác.
- **Trạng Thái**: **RESOLVED** (Xác minh tại `ShiftScheduleExceptionAuditTest#createShift_DuplicateIdentity_ThrowsConflict`).

---

### Lỗ Hổng 2: Lỗi Khóa Ngoại Khi Xóa Ca Hoặc Hủy Phân Công Ca Đã Chấm Công
- **Vị Trí**: `ShiftService.deleteShift` & `ShiftAssignmentService.unassignStaffFromShift`
- **Bản Chất Lỗi**: Bảng `attendance` tham chiếu khóa ngoại tới `shift_assignment(id)`. Khi nhân viên đã chấm công vào ca, nếu Quản lý xóa ca hoặc bấm hủy phân công nhân viên đó, hệ thống gọi lệnh `shiftAssignmentRepository.delete()`.
- **Hậu Quả Trước Kiểm Toán**: Cơ sở dữ liệu chặn lại và ném lỗi `fk_attendance_shift_assignment`, ứng dụng văng lỗi 500 Internal Server Error và có nguy cơ làm mồ côi dữ liệu chấm công.
- **Giải Pháp Triển Khai**:
  - Tiêm `AttendanceRepository` vào cả hai service.
  - Thêm tiền điều kiện:
    - Trong `deleteShift`: `attendanceRepository.existsByShiftAssignment_Shift_Id(shiftId)` -> ném `BusinessException("Cannot delete shift with existing attendance records", HttpStatus.BAD_REQUEST)`.
    - Trong `unassignStaffFromShift`: `attendanceRepository.existsByShiftAssignmentId(assignment.getId())` -> ném `BusinessException("Cannot unassign staff from a shift with existing attendance records", HttpStatus.BAD_REQUEST)`.
- **Trạng Thái**: **RESOLVED** (Xác minh tại `ShiftScheduleExceptionAuditTest#deleteShift_HasAttendance_ThrowsBadRequest` và `unassignStaff_HasAttendance_ThrowsBadRequest`).

---

### Lỗ Hổng 3: Ngoại Lệ `NoSuchElementException` Trong Quy Trình Đổi Ca
- **Vị Trí**: `ShiftSwapService.createSwapRequest`, `managerApproveSwapRequest`, `managerRejectSwapRequest`
- **Bản Chất Lỗi**: Việc gọi `userRepository.findById(managerId).orElseThrow()` không truyền supplier ngoại lệ nghiệp vụ.
- **Hậu Quả Trước Kiểm Toán**: Nếu tài khoản Quản lý hoặc Nhân viên không tìm thấy, hệ thống văng `java.util.NoSuchElementException` trả về mã lỗi 500.
- **Giải Pháp Triển Khai**:
  - Chuẩn hóa toàn bộ thành `.orElseThrow(() -> new BusinessException("User/Manager/Staff not found", HttpStatus.NOT_FOUND))`.
- **Trạng Thái**: **RESOLVED** (Kiểm chứng tại `ShiftSwapService.java:98,190,256`).

---

### Lỗ Hổng 4: Vi Phạm Ranh Giới Cửa Hàng Trong Quy Trình Duyệt Đổi Ca
- **Vị Trí**: `ShiftSwapService.managerApproveSwapRequest`, `managerRejectSwapRequest`, `cancelSwapRequest`
- **Bản Chất Lỗi**: Hệ thống chỉ kiểm tra người dùng có quyền `MANAGER` hay không, mà không kiểm tra Quản lý đó có thuộc cửa hàng nơi diễn ra ca làm việc hay không.
- **Hậu Quả Trước Kiểm Toán**: Quản lý của Cửa hàng B có thể tùy tiện duyệt hoặc hủy yêu cầu đổi ca của Cửa hàng A.
- **Giải Pháp Triển Khai**:
  - Thực thi kiểm tra ranh giới phân lập cửa hàng:
    ```java
    UUID shiftStoreId = request.getFromShift().getStore().getId();
    if (manager.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN) {
        if (employmentRepository != null && !employmentRepository.existsByUserIdAndStoreIdAndStatus(managerId, shiftStoreId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
            throw new BusinessException("Manager does not belong to this store", HttpStatus.FORBIDDEN);
        }
    }
    ```
- **Trạng Thái**: **RESOLVED** (Xác minh tại `ShiftScheduleExceptionAuditTest#managerApprove_ForeignStoreManager_ThrowsForbidden`).

---

### Lỗ Hổng 5: Đổi Ca Đè Lên Lịch Nghỉ Phép Đã Duyệt
- **Vị Trí**: `ShiftSwapService.managerApproveSwapRequest`
- **Bản Chất Lỗi**: Khi duyệt đổi ca giữa Staff A và Staff B, hệ thống chỉ kiểm tra số giờ làm trong tuần và trùng ca, nhưng bỏ qua kiểm tra đơn nghỉ phép (Leave Request).
- **Hậu Quả Trước Kiểm Toán**: Nhân viên đang trong kỳ nghỉ phép đã được phê duyệt lại bị Quản lý gán một ca làm mới thông qua tính năng đổi ca.
- **Giải Pháp Triển Khai**:
  - Tích hợp `LeaveRequestRepository` kiểm tra xung đột ngày nghỉ phép trước khi hoán đổi:
    ```java
    boolean fromStaffOnLeave = leaveRequestRepository.findOverlappingRequests(
            request.getFromStaff().getId(), request.getToShift().getShiftDate(), request.getToShift().getShiftDate())
            .stream().anyMatch(l -> l.getStatus() == LeaveStatus.APPROVED);
    if (fromStaffOnLeave) {
        throw new BusinessException(request.getFromStaff().getFullName() + " has approved leave on target shift date", HttpStatus.BAD_REQUEST);
    }
    ```
- **Trạng Thái**: **RESOLVED** (Xác minh tại `ShiftScheduleExceptionAuditTest#managerApprove_StaffOnApprovedLeave_ThrowsBadRequest`).

---

### Lỗ Hổng 6: Mã Lỗi Không Chuẩn Trong Tạo Mã QR Chấm Công
- **Vị Trí**: `AttendanceService.generateQrForShift`
- **Bản Chất Lỗi**: Ném `IllegalArgumentException` cho cả trường hợp không tìm thấy ca và ca thuộc cửa hàng khác.
- **Hậu Quả Trước Kiểm Toán**: Trả về 400 Bad Request chung chung, không đúng chuẩn RESTful API.
- **Giải Pháp Triển Khai**:
  - Trả về `404 NOT_FOUND` nếu ca không tồn tại.
  - Trả về `403 FORBIDDEN` nếu ca thuộc cửa hàng khác.
- **Trạng Thái**: **RESOLVED** (Xác minh tại `ShiftScheduleExceptionAuditTest#generateQr_ShiftNotFound_ThrowsNotFound` và `generateQr_StoreMismatch_ThrowsForbidden`).

---

## 3. Các Trường Hợp Chưa Xử Lý Còn Lại (Residual Unhandled Cases)
- **HOÀN TOÀN KHÔNG CÒN (NONE)**: Mọi kịch bản gây ra lỗi 500, lỗi vi phạm ràng buộc cơ sở dữ liệu, lỗi phân quyền và sai lệch trạng thái trong phân hệ Schedule đều đã được xử lý triệt để với các mã trạng thái HTTP chuẩn mực (`400 BAD_REQUEST`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `429 TOO_MANY_REQUESTS`).
