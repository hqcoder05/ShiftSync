# THIẾT KẾ KỸ THUẬT ATOMIC SWAP VÀ BẢO TOÀN TÍNH NHẤT QUÁN DỮ LIỆU
## FIX-001C — Atomic SWAP & Persistence Consistency Design

> **Thời điểm lập:** 13/10/2026  
> **Nhánh thực hiện:** `quoc-backend`  
> **Commit baseline:** `c9d4df15bd1ba3d802d297eb45312af40eaacd40`  
> **Tác giả & Kiến trúc sư:** Senior Java Spring Boot Engineer, Senior React Engineer, Database Engineer & Independent Code Auditor  
> **Phạm vi:** Backend REST API, Service Transaction Boundary, Data Integrity Constraints, Frontend Digital Twin Client  

---

## 1. BỐI CẢNH VÀ VẤN ĐỀ CẦN XỬ LÝ (PROBLEM STATEMENT)

### 1.1. Rủi ro của giải pháp tuần tự trong FIX-001B
Trong phiên bản **FIX-001B**, thao tác `SWAP` (hoán đổi phân khu giữa hai nhân sự $A$ và $B$ trong cùng một ca làm việc) được hiện thực trên frontend `SpatialWorkspace.jsx` thông qua hai lệnh gọi API tuần tự:
```javascript
// Mã cũ trong FIX-001B:
await assignStaffToShift(storeId, currentShift.id, diff.staffAId, diff.zoneBId); // Request 1
await assignStaffToShift(storeId, currentShift.id, diff.staffBId, diff.zoneAId); // Request 2
```

Mô hình này tồn tại lỗ hổng nghiêm trọng về **Tính nguyên tử (Atomicity)** và **Tính nhất quán (Consistency)** trong môi trường phân tán web:
1. **Lỗi mạng hoặc client ngắt kết nối (Network Partition / Client Abort):** Sau khi Request 1 thực hiện thành công, đường truyền gặp sự cố hoặc người dùng vô tình đóng tab/trình duyệt trước khi Request 2 hoàn tất.
2. **Lỗi nghiệp vụ hoặc xung đột ở Request 2 (Late Failure):** Request 1 thành công nhưng Request 2 gặp lỗi (ví dụ: mất kết nối CSDL, deadlock, trigger validation, phân khu $A$ bị vô hiệu hóa giữa chừng).
3. **Hiện tượng Lưu dở dang (Partial Persistence / Corrupted State):** Nhân sự $A$ đã bị chuyển sang phân khu $B$, trong khi nhân sự $B$ vẫn nằm ở phân khu $B$. Kết quả là cả hai nhân sự đều tập trung tại phân khu $B$, phân khu $A$ bị bỏ trống, làm sai lệch cấu trúc định biên và vi phạm toàn bộ ý định nghiệp vụ ban đầu của người quản lý.

### 1.2. Mục tiêu kỹ thuật của FIX-001C
1. Chuyển đổi toàn bộ thao tác hoán đổi sang mô hình **Atomic Single-Request Operation**: Frontend chỉ gửi duy nhất 1 HTTP request tới Backend.
2. Thiết lập ranh giới giao dịch CSDL tường minh `@Transactional(rollbackFor = Exception.class)` tại tầng Service của Spring Boot.
3. Nếu bất kỳ nhân sự nào không thỏa mãn điều kiện hoặc việc ghi dữ liệu của một trong hai đối tượng thất bại, toàn bộ giao dịch phải được rollback tự động về trạng thái ban đầu (All-or-Nothing).
4. Phản hồi đầy đủ thông tin của cả hai bản ghi gán ca sau khi hoán đổi thành công cho Frontend cập nhật UI đồng bộ.

---

## 2. PHÂN TÍCH RÀNG BUỘC CƠ SỞ DỮ LIỆU (DATABASE CONSTRAINTS ANALYSIS)

Kiểm tra định nghĩa bảng `shift_assignment` trong schema PostgreSQL của hệ thống:
- Khóa chính: `id UUID PRIMARY KEY`.
- Ràng buộc tham chiếu: `shift_id UUID REFERENCES shift(id)`, `staff_id UUID REFERENCES users(id)`, `zone_id UUID REFERENCES store_zone(id)`.
- Ràng buộc duy nhất đang áp dụng:
  ```sql
  CREATE UNIQUE INDEX idx_shift_assignment_shift_staff_active 
  ON shift_assignment (shift_id, staff_id) 
  WHERE deleted = false;
  ```
- **Kết luận kiến trúc quan trọng:**
  - CSDL chỉ cấm một nhân sự xuất hiện 2 lần trong cùng một ca làm việc (`shift_id`, `staff_id`).
  - **Không có Unique Constraint trên cặp `(shift_id, zone_id)`**. Một phân khu có thể có nhiều nhân viên làm việc cùng lúc.
  - Do đó, việc cập nhật `zone_id` của $A$ và $B$ trong cùng một Transaction không gây ra xung đột trùng lặp khóa trung gian (intermediate constraint violation), đảm bảo giao dịch diễn ra êm thuận và an toàn tuyệt đối.

---

## 3. THIẾT KẾ KIẾN TRÚC BACKEND (SPRING BOOT)

### 3.1. Hợp đồng dữ liệu DTO (Data Transfer Objects)

#### A. Request DTO: `ShiftZoneSwapRequest`
Vị trí: `shiftsync-backend/src/main/java/com/shiftsync/shift/dto/ShiftZoneSwapRequest.java`
```java
package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftZoneSwapRequest {
    @NotNull(message = "staffAId is required")
    private UUID staffAId;

    @NotNull(message = "staffBId is required")
    private UUID staffBId;

    private UUID zoneAId;
    private UUID zoneBId;

    private UUID targetZoneForAId;
    private UUID targetZoneForBId;
}
```
*Đặc điểm thiết kế:* Hỗ trợ cả `targetZoneForAId`/`targetZoneForBId` tường minh hoặc tự động suy luận chéo từ `zoneAId`/`zoneBId` hiện tại, mang lại độ mềm dẻo cao cho mọi client.

#### B. Response DTO: `ShiftZoneSwapResponseDTO`
Vị trí: `shiftsync-backend/src/main/java/com/shiftsync/shift/dto/ShiftZoneSwapResponseDTO.java`
```java
package com.shiftsync.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftZoneSwapResponseDTO {
    private ShiftAssignmentResponseDTO assignmentA;
    private ShiftAssignmentResponseDTO assignmentB;
    private String message;
}
```

### 3.2. Nghiệp vụ và Ranh giới Giao dịch: `ShiftAssignmentService`
Vị trí: `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java`
Phương thức: `swapStaffZones`

```java
@Transactional(rollbackFor = Exception.class)
public ShiftZoneSwapResponseDTO swapStaffZones(UUID storeId, UUID shiftId, ShiftZoneSwapRequest request) {
    // 1. Kiểm tra hai nhân viên phải khác nhau
    if (request.getStaffAId().equals(request.getStaffBId())) {
        throw new BusinessException("Cannot swap zones with the same staff member", HttpStatus.BAD_REQUEST);
    }

    // 2. Kiểm tra tồn tại của ca và thuộc về chi nhánh
    Shift shift = shiftRepository.findByIdAndStoreId(shiftId, storeId)
            .orElseThrow(() -> new BusinessException("Shift not found in this store", HttpStatus.NOT_FOUND));

    // 3. Kiểm tra trạng thái ca và kỳ công/lương (Payroll lock)
    if (shift.getStatus() == ShiftStatus.COMPLETED) {
        throw new BusinessException("Cannot swap assignments in a COMPLETED shift", HttpStatus.BAD_REQUEST);
    }
    validatePayrollPeriodNotLocked(storeId, shift.getShiftDate());

    // 4. Tìm kiếm bản ghi phân công của cả hai nhân viên trong ca
    ShiftAssignment assignmentA = shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, request.getStaffAId())
            .orElseThrow(() -> new BusinessException("Staff A is not assigned to this shift", HttpStatus.NOT_FOUND));

    ShiftAssignment assignmentB = shiftAssignmentRepository.findByShiftIdAndStaffId(shiftId, request.getStaffBId())
            .orElseThrow(() -> new BusinessException("Staff B is not assigned to this shift", HttpStatus.NOT_FOUND));

    // 5. Xác định phân khu đích (Target Zones)
    UUID targetZoneAId = request.getTargetZoneForAId() != null ? request.getTargetZoneForAId() : request.getZoneBId();
    UUID targetZoneBId = request.getTargetZoneForBId() != null ? request.getTargetZoneForBId() : request.getZoneAId();

    if (targetZoneAId == null && assignmentB.getZone() != null) {
        targetZoneAId = assignmentB.getZone().getId();
    }
    if (targetZoneBId == null && assignmentA.getZone() != null) {
        targetZoneBId = assignmentA.getZone().getId();
    }

    // 6. Kiểm tra tính hợp lệ và quyền sở hữu phân khu đối với cửa hàng
    StoreZone newZoneForA = resolveAndValidateZone(storeId, targetZoneAId, "Target zone for Staff A");
    StoreZone newZoneForB = resolveAndValidateZone(storeId, targetZoneBId, "Target zone for Staff B");

    // 7. Hoán đổi vị trí phân khu
    assignmentA.setZone(newZoneForA);
    assignmentB.setZone(newZoneForB);

    // 8. Lưu đồng thời trong cùng một Transaction
    assignmentA = shiftAssignmentRepository.save(assignmentA);
    assignmentB = shiftAssignmentRepository.save(assignmentB);

    // 9. Ghi Audit Log và phản hồi DTO
    auditLogService.logAction(ActionType.UPDATE, "SHIFT_ASSIGNMENT", ...);

    return ShiftZoneSwapResponseDTO.builder()
            .assignmentA(mapToResponseDTO(assignmentA))
            .assignmentB(mapToResponseDTO(assignmentB))
            .message("Successfully swapped zones between staff members")
            .build();
}
```

### 3.3. Endpoint REST API: `ShiftAssignmentController`
Vị trí: `shiftsync-backend/src/main/java/com/shiftsync/shift/controller/ShiftAssignmentController.java`
- **Method:** `POST`
- **Path:** `/api/stores/{storeId}/shifts/{shiftId}/assignments/swap`
- **Authorization:** `@PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN', 'CHAIN_MANAGER')")`
- **Status code:** `200 OK` (hoặc `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).

---

## 4. THIẾT KẾ PHÍA FRONTEND (REACT / DIGITAL TWIN)

### 4.1. Tầng API Service: `shiftService.js`
Vị trí: `ShiftSync-Web/src/services/shiftService.js`
```javascript
export const swapStaffZones = (storeId, shiftId, swapData) =>
  api.post(`/stores/${storeId}/shifts/${shiftId}/assignments/swap`, swapData);
```

### 4.2. Tích hợp Điều phối Mô phỏng: `SpatialWorkspace.jsx`
Vị trí: `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`
- Thay thế hoàn toàn vòng lặp 2 request cũ bằng lệnh gọi duy nhất:
```javascript
} else if (diff.type === 'SWAP') {
  if (!diff.staffAId || !diff.staffBId || !diff.zoneAId || !diff.zoneBId) {
    const err = new Error('Dữ liệu hoán đổi không hợp lệ: thiếu thông tin nhân sự hoặc phân khu');
    errors.push({ diff, error: err });
  } else {
    try {
      await swapStaffZones(storeId, currentShift.id, {
        staffAId: diff.staffAId,
        staffBId: diff.staffBId,
        zoneAId: diff.zoneAId,
        zoneBId: diff.zoneBId,
        targetZoneForAId: diff.zoneBId,
        targetZoneForBId: diff.zoneAId,
      });
    } catch (e) {
      console.error('Atomic Swap API error:', e);
      errors.push({
        diff,
        error: new Error(`Không thể hoán đổi vị trí giữa ${diff.staffAName || 'Nhân sự A'} và ${diff.staffBName || 'Nhân sự B'}: ${e.response?.data?.message || e.message || 'Lỗi server'}`),
      });
    }
  }
}
```
- **Xóa bỏ cờ `partial: true`**: Do endpoint backend đã đảm bảo giao dịch nguyên tử, client không bao giờ rơi vào trạng thái "chỉ một người được đổi". Nếu có lỗi xảy ra, toàn bộ trạng thái không đổi và giao diện thông báo lỗi thống nhất.

---

## 5. SO SÁNH ĐẶC TÍNH KIẾN TRÚC (ARCHITECTURAL COMPARISON MATRIX)

| Tiêu chí | Trước khi sửa (FIX-001B) | Sau khi triển khai FIX-001C |
| :--- | :--- | :--- |
| **Số lượng HTTP Request** | 2 requests riêng biệt | **1 request duy nhất** |
| **Tính nguyên tử (Atomicity)** | Không có (kết nối mạng độc lập) | **Nguyên tử 100% (All-or-Nothing Transaction)** |
| **Rủi ro Partial Persistence** | Rất cao khi lỗi mạng giữa chừng | **Triệt tiêu hoàn toàn** |
| **Toàn vẹn khóa Unique** | Không vi phạm | **Được bảo đảm bởi Transaction** |
| **Xử lý Rollback** | Frontend phải cố gắng tự cảnh báo `partial` | **Spring Data JPA Transaction rollback tự động** |
| **Độ trễ người dùng** | $2 \times RTT$ (Round-Trip Time) | Giảm 50% thời gian chờ đợi trên UI |
| **Khả năng hồi quy** | Tương thích ngược | Giữ nguyên các hàm `assignStaffToShift`, không ảnh hưởng tính năng cũ |

---

## 6. KẾT LUẬN THIẾT KẾ
Giải pháp FIX-001C đã giải quyết dứt điểm điểm nghẽn kỹ thuật cuối cùng trong luồng lưu trữ mô phỏng Digital Twin của ShiftSync, mang lại sự vững chắc về kiến trúc dữ liệu và trải nghiệm mượt mà, tin cậy cho người quản lý chi nhánh.
