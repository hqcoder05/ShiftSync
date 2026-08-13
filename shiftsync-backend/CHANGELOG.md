# CHANGELOG - Bug Fix Tổng Hợp (Tuần 8)

Bản cập nhật này tập trung vào việc xử lý triệt để các lỗi Critical và High được ghi nhận trong các đợt kiểm thử hiệu năng, bảo mật và logic tuần trước.

## 🔴 [Critical] 
- **Lỗi N+1 Query làm treo hệ thống khi Auto-Schedule và Generate Payroll**
  - **Mô tả:** Hàm `autoSchedule` và `generatePayroll` gọi lệnh SELECT vào DB bên trong vòng lặp `for` ứng với từng nhân sự (O(N)). Khi số lượng nhân sự > 50, DB bị quá tải, API mất hơn 2 giây để phản hồi.
  - **Khắc phục:** Refactor sang phương pháp Bulk Fetch (Lấy toàn bộ dữ liệu 1 lần) và In-Memory Grouping (Sử dụng HashMaps để xử lý tại RAM). Giảm thiểu độ phức tạp xuống O(1) query.
  - **Trạng thái:** Đã FIX & Verify. (Performance Report đính kèm xác nhận tốc độ tăng >90%).

## 🟠 [High]
- **Lỗ hổng IDOR khi Export Bảng Lương (Excel/PDF)**
  - **Mô tả:** Store Manager của Cửa hàng A có thể truyền `periodId` của Cửa hàng B vào API `/export` để lấy trộm dữ liệu bảng lương.
  - **Khắc phục:** Thêm bước xác minh chéo (Cross-verification). Repository đã được điều chỉnh thành `findByIdAndStoreId(periodId, storeId)` để đảm bảo chỉ những kỳ lương thuộc quyền quản lý của user mới được trả về.
  - **Trạng thái:** Đã FIX.

- **Tính toán trùng lặp khi chạy lại Payroll**
  - **Mô tả:** Chạy lại `generatePayroll` cho một khoảng thời gian đã tồn tại sẽ sinh ra dữ liệu trùng lặp.
  - **Khắc phục:** Bổ sung logic `existsByStoreIdAndStartDateAndEndDate` để chặn ngay ở đầu API nếu kỳ lương đã tồn tại.
  - **Trạng thái:** Đã FIX.

- **Vòng lặp bất tận (Infinite Loop) ở Auto-Scheduling do kẹt Blackout Dates**
  - **Mô tả:** Khi nhân sự có BlackoutDate nhưng lại là người duy nhất có skill phù hợp, hệ thống liên tục lặp cố gắng xếp ca.
  - **Khắc phục:** Giới hạn điều kiện kiểm tra (fallback to DRAFT thay vì cố ép nhân sự).
  - **Trạng thái:** Đã FIX.

## 🟡 [Low / Code Smells]
- **Lỗi Warning khi build Entity `@Builder.Default`**
  - **Mô tả:** Lombok warning tại `StaffSkill.java` do khai báo giá trị mặc định `LEVEL = "BEGINNER"` mà không gắn annotation.
  - **Khắc phục:** Thêm `@Builder.Default` để giá trị mặc định có tác dụng ngay cả khi dùng Builder.
  - **Trạng thái:** Đã FIX.

- **Thiếu DB Indexing**
  - **Mô tả:** Tra cứu Assignment và Attendance bị chậm.
  - **Khắc phục:** Bổ sung `V7__Add_Performance_Indexes.sql` để tạo index cho các cột tra cứu nhiều (store_id, shift_date, staff_id).
  - **Trạng thái:** Đã FIX.

---
*Tất cả các lỗi trên đã được kiểm tra chéo (Regression) và pass 100% test case mới nhất.*
