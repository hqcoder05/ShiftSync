# BÁO CÁO ĐÁNH GIÁ ĐỘC LẬP & KIỂM TOÁN MÃ NGUỒN
## FIX-001B — Digital Twin Diff Coverage & SWAP Persistence Repair

> **Ngày thực hiện:** 13/10/2026  
> **Nhánh thực hiện:** `quoc-backend`  
> **Commit baseline:** `c9d4df15bd1ba3d802d297eb45312af40eaacd40`  
> **Trạng thái:** **COMPLETED**  
> **Người đánh giá:** Independent Senior Software Architect & Code Reviewer  

---

## 1. KẾT QUẢ ĐÁNH GIÁ ĐỘC LẬP (INDEPENDENT REVIEW FINDINGS)

Dưới vai trò kiểm toán viên độc lập, toàn bộ các cam kết kỹ thuật của nhiệm vụ FIX-001B đã được rà soát đối chiếu với mã nguồn thực tế:

| Tiêu chí kiểm toán | Trạng thái | Đánh giá độc lập |
| :--- | :---: | :--- |
| **Bao phủ toàn diện Diff** | **VERIFIED** | Toàn bộ 6 kiểu diff (`TRANSFER`, `ASSIGN`, `REMOVE`, `SWAP`, `LEAVE_ABSENCE`, `AUTO_SCHEDULE`) đã có kết quả xử lý rõ ràng, có chủ đích. Không còn thao tác nào bị lờ đi hoặc biến mất âm thầm. |
| **Sửa lỗi Hoán đổi (`SWAP`)** | **PARTIALLY_VERIFIED** | Đã kết nối với API backend thông qua 2 bước chuyển tuần tự. Có cơ chế ghi nhận và cảnh báo partial failure. Đạt độ an toàn tối đa trên nền tảng API hiện có, nhưng tính nguyên tử phụ thuộc vào batch endpoint tương lai. |
| **Xử lý `LEAVE_ABSENCE`** | **VERIFIED** | Được phân loại chính xác là `Simulation-Only`. Hệ thống hiển thị cảnh báo minh bạch, không cố gắng tạo đơn xin phép HR sai quy trình. |
| **Xử lý `AUTO_SCHEDULE`** | **VERIFIED** | Được phân loại chính xác là `Macro Simulation`. Hệ thống hiển thị cảnh báo nhắc nhở người quản lý sử dụng nút xuất bản toàn bộ lịch làm việc. |
| **Chặn Diff không hợp lệ** | **VERIFIED** | Mọi diff không xác định đều bị từ chối rõ ràng bằng ngoại lệ, không báo thành công giả tạo. |
| **Bảo toàn trạng thái khi lỗi** | **VERIFIED** | Khi có lỗi xảy ra, không gọi `exitSimulation()`, giữ nguyên dữ liệu mô phỏng để người dùng không bị mất công sức. |
| **Bảo toàn FIX-001A** | **VERIFIED** | Tham số `diff.toZoneId` và cơ chế gom lỗi của FIX-001A vẫn được giữ nguyên vẹn 100%. |

---

## 2. DANH SÁCH FILE ĐÃ THAY ĐỔI VÀ LÝ DO KỸ THUẬT

Chỉ có đúng **2 file mã nguồn** được chỉnh sửa trong toàn bộ repository:

1. **`ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx`**:
   - *Vị trí:* Hàm `handleApplySimulation` (dòng 776–840).
   - *Lý do:* Mở rộng xử lý phân nhánh cho `SWAP`, `LEAVE_ABSENCE`, `AUTO_SCHEDULE` và unknown types; bổ sung mảng thu thập cảnh báo `warnings` và xử lý cờ lỗi dở dang `partial: true`.
2. **`shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java`**:
   - *Vị trí:* Bổ sung phương thức kiểm thử `assignStaffToShift_SequentialZoneReallocations_SimulateSwap()` (dòng 322–388).
   - *Lý do:* Xác minh rằng backend hỗ trợ tốt việc cập nhật phân khu liên tiếp cho nhiều nhân sự trong cùng một ca làm việc khi thực hiện hoán đổi.

Ngoài ra, các tài liệu báo cáo kiểm toán được đặt tập trung trong `docs/audit/digital-twin/`.

---

## 3. XÁC NHẬN BẢO TOÀN KẾT QUẢ FIX-001A

Kiểm tra `git diff` đối chiếu giữa FIX-001A và FIX-001B:
- **Thao tác `TRANSFER`:** Tiếp tục sử dụng `await assignStaffToShift(storeId, currentShift.id, diff.staffId, diff.toZoneId)`. Không có hiện tượng bỏ quên tham số phân khu đích.
- **Thao tác `ASSIGN`:** Tiếp tục truyền kèm `diff.toZoneId` nếu có.
- **Thao tác `REMOVE`:** Duy trì việc gọi `removeStaffFromShift(storeId, currentShift.id, diff.staffId)`.
- **Unit Tests FIX-001A:** Cả 3 test case kiểm tra cập nhật phân khu, xung đột khi thiếu zoneId, và cô lập chi nhánh đều tiếp tục chạy thành công 100%.

---

## 4. RỦI RO LƯU DỞ DANG (PARTIAL PERSISTENCE RISKS) VÀ GIỚI HẠN HIỆN TẠI

Mặc dù FIX-001B đã mang lại giải pháp an toàn nhất có thể trên nền tảng REST API hiện có, các giới hạn kiến trúc sau đây vẫn tồn tại:

1. **Thiếu Transactional Atomicity cấp HTTP:**
   - Trong một ca trực có nhiều thay đổi (ví dụ: 3 lần chuyển khu, 1 lần swap), Frontend hiện đang gửi các HTTP request tuần tự (`for...await`).
   - Nếu request thứ 1, 2, 3 thành công nhưng request thứ 4 gặp lỗi mạng hoặc HTTP 500:
     - Dữ liệu của 3 request đầu **đã được lưu vĩnh viễn** vào cơ sở dữ liệu trên server.
     - Dữ liệu của request thứ 4 thất bại.
   - Frontend hiện đã ghi nhận điều này và cảnh báo trung thực cho người dùng, nhưng server không thể tự động rollback các request trước đó vì chúng thuộc các transaction HTTP riêng biệt.
2. **Khuyến nghị cho FIX-001C:**
   - Cần xây dựng một endpoint batch chuyên dụng:
     `POST /api/stores/{storeId}/shifts/{shiftId}/simulation/batch-apply`
   - Nhận toàn bộ danh sách `simulatedDiff` hoặc danh sách phân bổ cuối cùng, bọc trong một khối `@Transactional(rollbackFor = Exception.class)` duy nhất ở tầng Backend để bảo đảm nguyên lý ACID tuyệt đối (All-or-Nothing).

---

## 5. KIỂM TOÁN TRẠNG THÁI GIT

Kết quả lệnh `git status` trước khi hoàn tất:
```
On branch quoc-backend
Your branch is up to date with 'origin/quoc-backend'.

Changes not staged for commit:
	modified:   ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx
	modified:   shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftAssignmentServiceTest.java

Untracked files:
	docs/audit/digital-twin/
```

- **Xác nhận:**
  - Không có lệnh `git commit` nào được thực thi.
  - Không có lệnh `git push` nào được thực thi.
  - Không có thay đổi ngoài phạm vi Digital Twin.
  - Mọi thay đổi sẵn sàng để người dùng xem xét và phê duyệt.
