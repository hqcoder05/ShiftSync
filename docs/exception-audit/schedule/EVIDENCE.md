# Bằng Chứng Thực Nghiệm & Kết Quả Kiểm Thử Runtime (Evidence)

## 1. Lệnh Thực Thi & Môi Trường Kiểm Thử
- **Lệnh thực thi chạy toàn bộ cụm kiểm thử**:
  ```powershell
  mvn test "-Dtest=ShiftScheduleExceptionAuditTest,ShiftAssignmentServiceTest,ShiftServiceAssignmentDelegationTest,ShiftSwapServiceTest,AutoScheduleAssignmentCorrectnessTest,LeaveRequestServiceTest"
  ```
- **Môi trường Java Runtime**: OpenJDK 21 (debug parameters release 21)
- **Công cụ Build**: Apache Maven 3.9+ với `maven-surefire-plugin:3.5.6`
- **Cơ sở dữ liệu đích**: PostgreSQL 16
- **Framework kiểm thử**: JUnit Jupiter 5.10.x, Mockito 5.11+ với inline-mock-maker

---

## 2. Nhật Ký Kết Quả Thực Thi Từ Maven Surefire

```text
[INFO] Scanning for projects...
[INFO] 
[INFO] ------------------< com.shiftsync:shiftsync-backend >-------------------
[INFO] Building shiftsync-backend 0.0.1-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- resources:3.5.0:resources (default-resources) @ shiftsync-backend ---
[INFO] Copying 1 resource from src\main\resources to target\classes
[INFO] Copying 39 resources from src\main\resources to target\classes
[INFO] 
[INFO] --- compiler:3.15.0:compile (default-compile) @ shiftsync-backend ---
[INFO] Nothing to compile - all classes are up to date.
[INFO] 
[INFO] --- resources:3.5.0:testResources (default-testResources) @ shiftsync-backend ---
[INFO] skip non existing resourceDirectory D:\ThucTapTotNghiep\ShiftSync\shiftsync-backend\src\test\resources
[INFO] 
[INFO] --- compiler:3.15.0:testCompile (default-testCompile) @ shiftsync-backend ---
[INFO] Nothing to compile - all classes are up to date.
[INFO] 
[INFO] --- surefire:3.5.6:test (default-test) @ shiftsync-backend ---
[INFO] Using auto detected provider org.apache.maven.surefire.junitplatform.JUnitPlatformProvider
[INFO] 
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.shiftsync.leave.service.LeaveRequestServiceTest
[INFO] Tests run: 13, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.515 s -- in com.shiftsync.leave.service.LeaveRequestServiceTest
[INFO] Running com.shiftsync.shift.service.AutoScheduleAssignmentCorrectnessTest
[INFO] Tests run: 18, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.494 s -- in com.shiftsync.shift.service.AutoScheduleAssignmentCorrectnessTest
[INFO] Running com.shiftsync.shift.service.ShiftAssignmentServiceTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.049 s -- in com.shiftsync.shift.service.ShiftAssignmentServiceTest
[INFO] Running com.shiftsync.shift.service.ShiftScheduleExceptionAuditTest
[INFO] Running 1. Shift CRUD & Collision Exceptions
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.402 s -- in 1. Shift CRUD & Collision Exceptions
[INFO] Running 4. Attendance QR & Live Check-In Exceptions
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.030 s -- in 4. Attendance QR & Live Check-In Exceptions
[INFO] Running 3. Shift Swap Exceptions & Manager Verification
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.026 s -- in 3. Shift Swap Exceptions & Manager Verification
[INFO] Running 5. Marketplace Claim Exceptions
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.067 s -- in 5. Marketplace Claim Exceptions
[INFO] Running 2. Shift Assignment & Role Isolation Exceptions
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.024 s -- in 2. Shift Assignment & Role Isolation Exceptions
[INFO] Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.561 s -- in com.shiftsync.shift.service.ShiftScheduleExceptionAuditTest
[INFO] Running com.shiftsync.shift.service.ShiftServiceAssignmentDelegationTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.058 s -- in com.shiftsync.shift.service.ShiftServiceAssignmentDelegationTest
[INFO] Running com.shiftsync.shift.service.ShiftSwapServiceTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.009 s -- in com.shiftsync.shift.service.ShiftSwapServiceTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 59, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  7.072 s
[INFO] Finished at: 2026-09-29T21:14:23+07:00
[INFO] ------------------------------------------------------------------------
```

---

## 3. Bảng Chi Tiết 19 Test Case Mới Viết Trong `ShiftScheduleExceptionAuditTest`

| Nhóm Kiểm Thử | Tên Phương Thức Test | Ràng Buộc / Ngoại Lệ Mục Tiêu | Kết Quả Thực Nghiệm |
|---|---|---|---|
| **CRUD Ca** | `createShift_DuplicateIdentity_ThrowsConflict` | Tạo ca trùng lặp cùng giờ -> Báo 409 CONFLICT | **PASSED** (0.402s) |
| **CRUD Ca** | `updateShift_CompletedOrCancelled_ThrowsBadRequest` | Sửa ca đã hoàn thành/hủy -> Báo 400 BAD_REQUEST | **PASSED** |
| **CRUD Ca** | `updateShift_CollisionWithAnotherShift_ThrowsConflict` | Kéo thả ca đè lên ca khác -> Báo 409 CONFLICT | **PASSED** |
| **CRUD Ca** | `updateShift_HasAttendance_ThrowsBadRequest` | Dời giờ ca đã có chấm công -> Báo 400 BAD_REQUEST | **PASSED** |
| **CRUD Ca** | `deleteShift_Completed_ThrowsBadRequest` | Xóa ca đã hoàn thành -> Báo 400 BAD_REQUEST | **PASSED** |
| **CRUD Ca** | `deleteShift_HasAttendance_ThrowsBadRequest` | Xóa ca đã có chấm công -> Báo 400 BAD_REQUEST | **PASSED** |
| **Phân Công** | `assignStaff_CompletedShift_ThrowsBadRequest` | Gán người vào ca đã hoàn thành -> Báo 400 BAD_REQUEST | **PASSED** (0.024s) |
| **Phân Công** | `assignStaff_NonStaffRole_ThrowsBadRequest` | Gán tài khoản MANAGER vào ca làm -> Báo 400 BAD_REQUEST | **PASSED** |
| **Phân Công** | `unassignStaff_CompletedShift_ThrowsBadRequest` | Hủy gán ca đã hoàn thành -> Báo 400 BAD_REQUEST | **PASSED** |
| **Phân Công** | `unassignStaff_HasAttendance_ThrowsBadRequest` | Hủy gán nhân viên đã chấm công -> Báo 400 BAD_REQUEST | **PASSED** |
| **Đổi Ca** | `managerApprove_NotAccepted_ThrowsBadRequest` | Quản lý duyệt khi nhân viên chưa đồng ý -> Báo 400 BAD_REQUEST | **PASSED** (0.026s) |
| **Đổi Ca** | `managerReject_NotAccepted_SucceedsWithoutEmployeeAcceptedCheck` | Quản lý từ chối khi nhân viên chưa đồng ý -> 200 OK (REJECTED) | **PASSED** |
| **Đổi Ca** | `managerApprove_ForeignStoreManager_ThrowsForbidden` | Quản lý cửa hàng khác duyệt đổi ca -> Báo 403 FORBIDDEN | **PASSED** |
| **Đổi Ca** | `managerApprove_StaffOnApprovedLeave_ThrowsBadRequest` | Đổi ca đè lên ngày nhân viên nghỉ phép -> Báo 400 BAD_REQUEST | **PASSED** |
| **Chấm Công** | `generateQr_ShiftNotFound_ThrowsNotFound` | Tạo QR cho ca không tồn tại -> Báo 404 NOT_FOUND | **PASSED** (0.030s) |
| **Chấm Công** | `generateQr_StoreMismatch_ThrowsForbidden` | Tạo QR cho ca cửa hàng khác -> Báo 403 FORBIDDEN | **PASSED** |
| **Chấm Công** | `submitSelfie_CancelledShift_ThrowsBadRequest` | Chấm công vào ca đã bị Hủy -> Báo 400 BAD_REQUEST | **PASSED** |
| **Chợ Ca** | `claimOpenShift_NonStaffRole_ThrowsBadRequest` | Quản lý nhận ca trống trên Chợ ca -> Báo 400 BAD_REQUEST | **PASSED** (0.067s) |
| **Chợ Ca** | `claimOpenShift_InactiveEmployment_ThrowsBadRequest` | Nhân viên cửa hàng khác nhận ca -> Báo 400 BAD_REQUEST | **PASSED** |

---

## 4. Xác Minh Trực Tiếp Chỉ Đạo Phân Biệt Duyệt / Từ Chối Đổi Ca (Approve vs Reject)

### Bằng chứng mã nguồn:
1. `ShiftSwapService.java:187`:
   ```java
   if (!request.isEmployeeAccepted()) {
       throw new BusinessException("Employee has not accepted this swap yet", HttpStatus.BAD_REQUEST);
   }
   ```
   **Nhánh Phê duyệt (Approve)**: Ràng buộc chặt chẽ điều kiện nhân viên đối tác phải nhấn chấp thuận trước (`isEmployeeAccepted == true`).
2. `ShiftSwapService.java:248`:
   ```java
   public void managerRejectSwapRequest(UUID requestId, UUID managerId) { ... }
   ```
   **Nhánh Từ chối (Reject)**: Không có dòng kiểm tra `isEmployeeAccepted()`. Quản lý có đầy đủ thẩm quyền từ chối bất kỳ yêu cầu đổi ca nào đang chờ xử lý.
3. **Kết quả kiểm thử tự động**:
   - `ShiftScheduleExceptionAuditTest#managerApprove_NotAccepted_ThrowsBadRequest`: **PASSED**
   - `ShiftScheduleExceptionAuditTest#managerReject_NotAccepted_SucceedsWithoutEmployeeAcceptedCheck`: **PASSED**
