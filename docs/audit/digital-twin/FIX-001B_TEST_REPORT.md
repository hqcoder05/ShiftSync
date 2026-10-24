# BÁO CÁO THỰC THI KIỂM THỬ TỰ ĐỘNG VÀ HỒI QUY
## FIX-001B — Digital Twin Diff Coverage & SWAP Persistence Repair

> **Ngày thực hiện:** 13/10/2026  
> **Nhánh thực hiện:** `quoc-backend`  
> **Commit baseline:** `c9d4df15bd1ba3d802d297eb45312af40eaacd40`  
> **Trạng thái:** **PASSED — ALL TESTS & BUILDS GREEN**  
> **Người thực hiện:** Senior Full-Stack Engineer & Independent Test Auditor  

---

## 1. TỔNG QUAN KIỂM THỬ

Mục tiêu kiểm thử của nhiệm vụ FIX-001B là xác minh tính đúng đắn của việc xử lý bao phủ các kiểu diff (`SWAP`, `LEAVE_ABSENCE`, `AUTO_SCHEDULE`), bảo đảm luồng hoán đổi vị trí tuần tự hoạt động chính xác trên backend, và chứng minh không gây hồi quy (regression) cho các tính năng phân ca và không gian đã có.

---

## 2. CHI TIẾT CÁC BÀI TEST ĐÃ THÊM / CẬP NHẬT TRÊN BACKEND

File kiểm thử: [`shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java`](file:///D:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java)

### 2.1. Ca kiểm thử mới cho luồng SWAP tuần tự:
**`assignStaffToShift_SequentialZoneReallocations_SimulateSwap()`**
- **Mục tiêu:** Kiểm chứng hành vi của backend khi nhận 2 lệnh điều chuyển phân khu liên tiếp cho 2 nhân sự khác nhau trong cùng một ca trực (`shiftId`), mô phỏng chính xác luồng gọi của Frontend khi thực hiện `SWAP`.
- **Dữ liệu giả lập (Setup):**
  - Ca trực `shift` tại cửa hàng `store`.
  - Phân khu A (`zoneA`) và phân khu B (`zoneB`).
  - Nhân sự A (`staffA`) ban đầu được phân công tại `zoneA`.
  - Nhân sự B (`staffB`) ban đầu được phân công tại `zoneB`.
- **Thực thi:**
  - Bước 1: Gọi `service.assignStaffToShift(storeId, shiftId, staffAId, zoneBId)` -> Kiểm tra `resultA.getZoneId() == zoneBId`, `assignmentA.getZone() == zoneB`.
  - Bước 2: Gọi `service.assignStaffToShift(storeId, shiftId, staffBId, zoneAId)` -> Kiểm tra `resultB.getZoneId() == zoneAId`, `assignmentB.getZone() == zoneA`.
- **Xác minh tương tác Mock:**
  - `verify(shiftAssignmentRepository, times(1)).save(assignmentA)`
  - `verify(shiftAssignmentRepository, times(1)).save(assignmentB)`
- **Kết quả:** **PASSED**. Cả hai thao tác điều chuyển độc lập đều diễn ra thành công mà không gây xung đột khóa hay sai lệch dữ liệu phân khu.

---

## 3. CÁC LỆNH KIỂM THỬ ĐÃ THỰC THI VÀ KẾT QUẢ THỰC TẾ

### 3.1. Kiểm thử đơn vị phân ca (`ShiftAssignmentServiceTest`)
- **Lệnh thực thi:**
  ```powershell
  mvn test -Dtest=ShiftAssignmentServiceTest
  ```
- **Kết quả thực tế từ Surefire:**
  ```
  [INFO] Running com.shiftsync.shift.service.ShiftAssignmentServiceTest
  [INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.591 s -- in com.shiftsync.shift.service.ShiftAssignmentServiceTest
  [INFO] Results:
  [INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0
  [INFO] BUILD SUCCESS
  [INFO] Total time: 4.768 s
  ```
- **Đánh giá:** 11/11 tests PASS 100% (bao gồm 7 tests gốc, 3 tests từ FIX-001A và 1 test mới từ FIX-001B).

### 3.2. Kiểm thử hồi quy phân bổ không gian 3D (`SpatialAllocationServiceTest`)
- **Lệnh thực thi:**
  ```powershell
  mvn test -Dtest=SpatialAllocationServiceTest
  ```
- **Kết quả thực tế từ Surefire:**
  ```
  [INFO] Running com.shiftsync.layout.service.SpatialAllocationServiceTest
  [INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.384 s -- in com.shiftsync.layout.service.SpatialAllocationServiceTest
  [INFO] Results:
  [INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
  [INFO] BUILD SUCCESS
  [INFO] Total time: 4.648 s
  ```
- **Đánh giá:** 9/9 tests PASS 100%. Không có bất kỳ hồi quy nào đối với thuật toán phân bổ nhân sự không gian.

### 3.3. Kiểm thử đóng gói và cú pháp Frontend (`ShiftSync-Web`)
- **Lệnh thực thi:**
  ```powershell
  npm run build
  ```
- **Kết quả thực tế:**
  ```
  vite v8.2.1 building client environment for production...
  transforming...✓ 2042 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                     1.10 kB │ gzip:   0.56 kB
  dist/assets/luong-BKDUcalL.png    171.96 kB
  dist/assets/index-C6WN-hDp.css    294.64 kB │ gzip:  48.11 kB
  dist/assets/index-DiLdQnC9.js   1,779.28 kB │ gzip: 458.98 kB
  ✓ built in 684ms
  ```
- **Đánh giá:** Biên dịch client thành công mỹ mãn trong 684ms, không có lỗi cú pháp JSX, TypeScript hay import hỏng.

---

## 4. GIỚI HẠN HẠ TẦNG KIỂM THỬ VÀ CÁC KỊCH BẢN CHƯA THỂ TEST

### 4.1. Giới hạn hạ tầng Frontend
- Thư mục `ShiftSync-Web` không được cài đặt sẵn test runner như Jest hoặc Vitest trong `package.json` (chỉ có `vite` và `eslint`).
- Do đó, việc kiểm chứng Frontend được thực hiện thông qua:
  1. Biên dịch tĩnh toàn diện (`npm run build`).
  2. Phân tích tĩnh (`npx eslint src/features/spatial-workspace/SpatialWorkspace.jsx`).
  3. Rà soát cấu trúc mã nguồn (code-level structural verification).
- Không tự ý cài đặt thêm các thư viện kiểm thử nặng vào dự án để tuân thủ quy tắc quản trị phạm vi (Scope Control).

### 4.2. Các kịch bản chưa thể kiểm thử tự động (Known Untested Scenarios)
1. **Lỗi mạng ngắt quãng tại Bước 2 của SWAP (Network drop midway):**
   - Kịch bản: Nhân viên A đã đổi sang khu B thành công, nhưng kết nối mạng bị rớt khi đang gửi request đổi nhân viên B sang khu A.
   - Hiện trạng: Frontend đã bắt được lỗi này và gắn cờ `partial: true` để hiển thị `CẢNH BÁO LƯU DỞ DANG`, nhưng chưa thể mô phỏng network teardown trong integration test nếu không có công cụ mock network HTTP cấp trình duyệt (Playwright/Cypress).
2. **Kiểm tra Transactional Rollback liên ca ở tầng Database:**
   - Vì backend chưa có endpoint batch `SWAP` trong cùng một `@Transactional` context, hai thao tác lưu này được thực hiện trong 2 transaction độc lập trên database. Khi bước 2 thất bại, bước 1 không tự động rollback trên CSDL. Đây là giới hạn kiến trúc đã được ghi nhận và bàn giao cho FIX-001C.

---

## 5. PHÂN LOẠI CƠ CHẾ KIỂM THỬ

| Hạng mục kiểm chứng | Cấp độ kiểm thử (Level) | Công cụ thực hiện | Trạng thái |
| :--- | :---: | :---: | :---: |
| Luồng chuyển khu vực đơn lẻ | Unit Test | JUnit 5 / Mockito | **PASSED** |
| Luồng hoán đổi 2 nhân sự liên tiếp | Unit Test | JUnit 5 / Mockito | **PASSED** |
| Phân bổ không gian 3D | Unit Test | JUnit 5 / Mockito | **PASSED** |
| Biên dịch & Bundle Frontend | Static Build | Vite v8.2.1 | **PASSED** |
| Xử lý gom lỗi & partial failure UI | Code Inspection & Build | Static Review / ESLint | **VERIFIED** |
| Phục hồi CSDL khi rớt mạng | Database Integration | Cần FIX-001C Batch Endpoint | **DOCUMENTED GAP** |
