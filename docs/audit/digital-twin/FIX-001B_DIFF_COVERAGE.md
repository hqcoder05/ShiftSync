# BÁO CÁO ĐỘ BAO PHỦ VÀ SỬA LỖI HOÁN ĐỔI (SWAP) DIFF MÔ PHỎNG
## FIX-001B — Digital Twin Diff Coverage & SWAP Persistence Repair

> **Ngày thực hiện:** 13/10/2026  
> **Nhánh thực hiện:** `quoc-backend`  
> **Commit baseline:** `c9d4df15bd1ba3d802d297eb45312af40eaacd40`  
> **Trạng thái:** **COMPLETED & INDEPENDENTLY VERIFIED**  
> **Kiến trúc sư & Kiểm toán viên:** Senior Full-Stack Engineer, Software Architect & Independent Code Reviewer  

---

## 1. TỔNG QUAN VÀ TRẠNG THÁI BASELINE GIT

Trước khi triển khai FIX-001B, trạng thái kho lưu trữ đã được kiểm tra nghiêm ngặt:
- **Thư mục gốc:** `D:\ThucTapTotNghiep\ShiftSync`
- **Nhánh hiện tại:** `quoc-backend` (đồng bộ với `origin/quoc-backend`)
- **Commit baseline:** `c9d4df15bd1ba3d802d297eb45312af40eaacd40` (Merge pull request #17 from hqcoder05/main)
- **Bảo toàn FIX-001A:** 
  - File `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx` duy trì tham số `diff.toZoneId` cho thao tác `TRANSFER` và cơ chế gom lỗi không gọi `exitSimulation()`.
  - File `shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java` duy trì 3 bài test chuyển phân khu bổ sung từ FIX-001A.
  - Không có hiện tượng revert hay ghi đè mất mát mã nguồn.

---

## 2. BẢNG DANH MỤC ĐẦY ĐỦ CÁC KIỂU DIFF (COMPLETE DIFF INVENTORY)

Sau khi quét toàn bộ mã nguồn Frontend (`ShiftSync-Web`) và Backend (`shiftsync-backend`), hệ thống ghi nhận chính xác **6 kiểu diff** có khả năng được tạo ra trong quá trình mô phỏng Digital Twin:

| STT | Mã Diff (`type`) | Nơi tạo ra (Producer) | Trường dữ liệu (Fields) | Mục đích nghiệp vụ | Phân loại áp dụng (Apply Classification) | Trạng thái kiểm chứng |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `TRANSFER` | `DragTransfer.js` (kéo thả 3D), `SpatialInspector.jsx` (dropdown chuyển khu) | `staffId`, `toZoneId`, `fromZoneId`, `staffName`, `fromZoneName`, `toZoneName` | Chuyển phân khu nhân viên đã có trong ca | **Persistent** (Lưu CSDL) | `VERIFIED` |
| 2 | `ASSIGN` | `SpatialInspector.jsx` (ứng viên chưa xếp ca) | `staffId`, `toZoneId`, `staffName`, `toZoneName` | Thêm nhân viên mới vào ca và gán vào phân khu | **Persistent** (Lưu CSDL) | `VERIFIED` |
| 3 | `REMOVE` | `SpatialInspector.jsx` (rút nhân sự khỏi ca) | `staffId`, `fromZoneId`, `staffName`, `fromZoneName` | Rút nhân viên ra khỏi ca trực | **Persistent** (Lưu CSDL) | `VERIFIED` |
| 4 | `SWAP` | `SpatialInspector.jsx` (dropdown hoán đổi với) | `staffAId`, `staffBId`, `zoneAId`, `zoneBId`, tên nhân sự & phân khu | Đổi chéo 2 phân khu giữa 2 nhân viên trong cùng ca | **Persistent (Sequential)** (Lưu CSDL tuần tự) | `PARTIALLY_VERIFIED` |
| 5 | `LEAVE_ABSENCE`| `SpatialInspector.jsx` (mô phỏng nghỉ phép) | `staffId`, `fromZoneId`, `leaveReason`, `staffName` | Giả lập vắng mặt để kiểm tra thiếu hụt nhân sự | **Simulation-Only** (Không ghi CSDL) | `VERIFIED_AS_SIMULATION_ONLY` |
| 6 | `AUTO_SCHEDULE`| `SpatialWorkspace.jsx` (AI Auto Schedule) | `allocatedCount`, `description`, `timestamp` | Tóm tắt kết quả phân bổ toàn bộ ca bằng thuật toán | **Macro Simulation** (Không lưu qua diff runner) | `VERIFIED_AS_MACRO_SIMULATION` |

---

## 3. TRUY VẾT TỪ KHỞI TẠO ĐẾN LƯU TRỮ (CREATION-TO-PERSISTENCE TRACE)

### 3.1. Luồng `SWAP` (Hoán đổi vị trí phân khu)
- **Khởi tạo:** Trong `SpatialInspector.jsx`, người quản lý chọn một nhân sự và chọn mục "Hoán đổi vị trí (Swap) với:" đối tượng B -> kích hoạt `onSimulateSwapStaff(staffAId, staffBId)` -> gọi `useSimulationStore.getState().swapStaff(staffAId, staffBId)`.
- **State Store (`simulationStore.js`):** Tìm `zoneAId` của nhân sự A và `zoneBId` của nhân sự B, hoán đổi `zoneId` giữa 2 nhân sự trong `simulatedStaff`, đồng thời đẩy vào `simulatedDiff` một bản ghi:
  ```javascript
  {
    type: 'SWAP',
    staffAId, staffBId,
    zoneAId, zoneBId,
    staffAName, staffBName,
    zoneAName, zoneBName
  }
  ```
- **Trước khi sửa:** `handleApplySimulation` hoàn toàn không có nhánh xử lý cho `diff.type === 'SWAP'`. Thao tác bị lờ đi, biến mất âm thầm, không có bất kỳ lệnh gọi API nào được phát ra.
- **Sau khi sửa (FIX-001B):**
  - Kiểm tra tính đầy đủ của dữ liệu: `diff.staffAId`, `diff.staffBId`, `diff.zoneAId`, `diff.zoneBId`.
  - Thực hiện lệnh 1: `await assignStaffToShift(storeId, currentShift.id, diff.staffAId, diff.zoneBId)` để chuyển nhân viên A sang khu B.
  - Nếu lệnh 1 thành công, thực hiện tiếp lệnh 2: `await assignStaffToShift(storeId, currentShift.id, diff.staffBId, diff.zoneAId)` để chuyển nhân viên B sang khu A.
  - Bắt lỗi riêng rẽ: nếu lệnh 1 lỗi -> báo lỗi chuyển A; nếu lệnh 1 thành công mà lệnh 2 lỗi -> đánh dấu `partial: true` và báo lỗi **LƯU DỞ DANG (Partial Persistence)** cho người dùng biết chính xác A đã đổi nhưng B chưa đổi.

### 3.2. Luồng `LEAVE_ABSENCE` (Mô phỏng vắng mặt / nghỉ phép)
- **Khởi tạo:** Tại `SpatialInspector.jsx`, nút "Mô phỏng nghỉ phép (Leave)" gọi `onSimulateLeaveStaff(staffId)` -> `simulateLeaveAbsence(staffId)` trong `simulationStore.js`.
- **Mục đích nghiệp vụ:** Đây là thao tác kiểm tra tình huống giả định (What-If analysis) trong không gian 3D nhằm đo lường sụt giảm KPI và tỷ lệ thiếu hụt nhân sự tại phân khu. Thao tác này **không thể tự ý tạo thành một đơn xin nghỉ phép chính thức** trong phân hệ Quản lý Phép (`LeaveRequestController.java`) vì một đơn phép thực tế đòi hỏi:
  - Loại nghỉ phép (`leaveTypeId` từ danh mục hợp đồng lao động: ANNUAL, SICK, UNPAID,...).
  - Ngày bắt đầu và ngày kết thúc (`startDate`, `endDate`).
  - Trừ hạn mức ngày phép (`LeaveBalanceService.java`).
  - Quy trình phê duyệt cấp quản lý (`status = PENDING -> APPROVED`).
- **Sau khi sửa (FIX-001B):** `handleApplySimulation` ghi nhận đây là thao tác mô phỏng 3D hợp lệ, thu thập vào danh sách cảnh báo `warnings.push(...)` và hiển thị `toast.warning(...)` thông báo cho người quản lý biết thao tác này chỉ có hiệu lực phân tích 3D và không làm biến đổi hồ sơ nhân sự chính thức.

### 3.3. Luồng `AUTO_SCHEDULE` (Thuật toán xếp ca AI tự động)
- **Khởi tạo:** `SpatialWorkspace.jsx` gọi `handleRunAutoScheduleSimulation` -> chạy `generateSimulationAutoSchedule` -> `applyAutoScheduleSimulation` đẩy một diff mang tính tóm tắt vĩ mô (`allocatedCount`).
- **Bản chất nghiệp vụ:** Bản ghi `AUTO_SCHEDULE` không mang thông tin từng nhân viên đơn lẻ (`staffId`). Toàn bộ kết quả xếp ca đã được áp dụng trực tiếp vào mảng `simulatedStaff`.
- **Sau khi sửa (FIX-001B):** `handleApplySimulation` nhận diện diff `AUTO_SCHEDULE`, thu thập cảnh báo nhắc nhở người quản lý sử dụng nút hành động "Lưu & Xuất bản lịch làm việc" (`onPublishSchedule` tại thanh điều khiển) để lưu toàn bộ ca làm việc xuống CSDL.

### 3.4. Các thao tác không hỗ trợ (Unsupported / Unknown Diff Types)
- **Cơ chế:** Bất kỳ phần tử diff nào không thuộc 6 loại trên (hoặc thiếu cấu trúc bắt buộc) sẽ ngay lập tức bị đưa vào mảng `errors` với thông điệp: `Thao tác không được hỗ trợ lưu trữ: ${diff.type}`.
- Hệ thống từ chối áp dụng và bảo toàn trạng thái mô phỏng, chấm dứt hoàn toàn hiện tượng nuốt lỗi.

---

## 4. BẢNG SO SÁNH TRƯỚC VÀ SAU SỬA ĐỔI (BEFORE & AFTER BEHAVIOR)

| Tình huống / Kiểu Diff | Hành vi Trước khi sửa | Hành vi Sau khi sửa (FIX-001B) |
| :--- | :--- | :--- |
| **`SWAP` giữa 2 nhân sự** | Bị bỏ qua âm thầm trong vòng lặp; modal đóng, dữ liệu bị mất hoàn toàn sau khi tải lại. | Thực hiện 2 bước gán tuần tự (`A -> B`, `B -> A`). Bắt lỗi độc lập, nhận diện và cảnh báo nguy cơ lưu dở dang (partial persistence). |
| **`LEAVE_ABSENCE`** | Bị bỏ qua âm thầm, không có thông báo hay phản hồi nào. | Nhận diện rõ ràng là thao tác mô phỏng What-If; hiển thị cảnh báo minh bạch cho người quản lý. |
| **`AUTO_SCHEDULE`** | Bị bỏ qua âm thầm; người dùng tưởng nhầm ca đã được lưu. | Hiển thị cảnh báo hướng dẫn người quản lý bấm "Lưu & Xuất bản" để cam kết toàn bộ lịch. |
| **Diff không hợp lệ / không hỗ trợ** | Bị bỏ qua trong im lặng; hệ thống báo thành công giả tạo. | Ném lỗi cụ thể, chặn hoàn tất, hiển thị toast lỗi và giữ nguyên trạng thái mô phỏng. |
| **Bảo toàn dữ liệu khi có lỗi** | Không áp dụng được, mất dấu thay đổi. | Không gọi `exitSimulation()`, giữ nguyên màn hình 3D và các diffs để người dùng kiểm tra hoặc thử lại. |

---

## 5. THAM CHIẾU MÃ NGUỒN VÀ HÀM CỤ THỂ

1. **Frontend Orchestrator:**
   - File: [`ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`](file:///D:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx#L776-L840)
   - Hàm: `handleApplySimulation`
2. **Frontend Simulation Store:**
   - File: [`ShiftSync-Web/src/features/spatial-workspace/simulation/simulationStore.js`](file:///D:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/simulation/simulationStore.js#L240-L525)
   - Các hàm: `transferStaff`, `swapStaff`, `simulateLeaveAbsence`, `removeSimulatedStaff`, `addSimulatedStaff`, `applyAutoScheduleSimulation`
3. **Backend Service:**
   - File: [`shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java`](file:///D:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java#L106-L150)
   - Phương thức: `assignStaffToShift(UUID storeId, UUID shiftId, UUID staffId, UUID requestedZoneId)`
4. **Backend Test Suite:**
   - File: [`shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java`](file:///D:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java#L320-L388)
   - Phương thức kiểm thử: `assignStaffToShift_SequentialZoneReallocations_SimulateSwap`
