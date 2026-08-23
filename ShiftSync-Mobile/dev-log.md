# Developer Log - ShiftSync Mobile

## [Phase II] - Setup Mobile Architecture & Navigation System
**Ngày thực hiện:** 07/08/2026  
**Nhánh Git:** `duyen-frontend`

---

### 1. Công việc đã thực hiện
* Tái cấu trúc ứng dụng React Native sử dụng **Expo Framework**.
* Thiết lập hệ thống điều hướng dạng Tab (`@react-navigation/bottom-tabs`) đồng bộ chức năng với bản Web.
* Tổ chức cấu trúc thư mục mã nguồn chuẩn Mobile: `src/screens`, `src/navigation`, `src/components`, `src/services`.
* Khởi tạo 5 Màn hình (Screens) chính đại diện cho các phân hệ nghiệp vụ: Dashboard, Lịch làm việc, Điểm danh, Phiếu lương, Yêu cầu.
* Kiểm thử ứng dụng trực tiếp trên thiết bị thật qua môi trường Expo Go.

---

### 2. Vấn đề Kỹ thuật & Giải pháp (Technical Challenge)
* **Vấn đề:** Khởi tạo kho mã nguồn độc lập dẫn đến việc lệch quy trình quản lý code chung của nhóm trên GitHub Repository.
* **Giải pháp:** Tiến hành đồng bộ và di chuyển mã nguồn về đúng thư mục dự án chuẩn (`D:\Projects\ShiftSync\ShiftSync-Mobile`), đồng bộ lại Git Remote và luồng Push code lên Repository nhóm.

---

### 3. Kế hoạch tiếp theo
* Kết hợp cùng bản Web triển khai **Phase III**: Thiết kế UI Authentication và xây dựng Custom Hooks quản lý trạng thái Login (Form Validation).
------------------------------------------------------------------------
# log 2
Ngày: 08/08/2026
Việc đã làm: Code hoàn chỉnh màn hình Login Mobile theo Figma (logo, validate, kết nối API
auth thật, hiệu ứng nhấn nút bằng Animated), sửa AppNavigator thêm Stack Navigator để app mở
đúng vào Login trước khi vào 5-tab (trước đó bị vào thẳng Dashboard bỏ qua Login)
Vấn đề gặp phải: App ban đầu mở thẳng vào Dashboard 5-tab do AppNavigator.js chỉ có
Tab.Navigator, chưa có tầng điều hướng Login đứng trước; đã thêm createNativeStackNavigator
bọc ngoài để kiểm soát đúng thứ tự Login → MainTabs
Kế hoạch tiếp theo: Sang Mục IV - Test API Auth đầy đủ bằng Postman, ghi Auth_Test_Report.md

----------------------------------------------------------------------------------------------
## [2026-08-13] - Nhật ký Phát triển Frontend Mobile (Tuần 4)

### 📌 Tính năng: Availability Registration UI (Khai báo Lịch Rảnh)
* **Người thực hiện:** Duyên (Frontend & UX/UI)
* **Mục tiêu:** Dựng màn hình khai báo khung giờ rảnh theo tuần cho nhân viên trên React Native (Expo), lưu/hiển thị qua API thật.

#### 🔨 Danh sách công việc đã hoàn thành:
1. **Khởi tạo API Service (`services/availabilityService.js`):**
   * Tích hợp 2 API endpoint: `getWeeklyAvailability` (Lấy lịch rảnh) và `saveWeeklyAvailability` (Lưu lịch rảnh).
2. **Xây dựng Màn hình Đăng ký (`screens/AvailabilityScreen.js`):**
   * Thiết kế Tab Bar chọn ngày trong tuần (Thứ 2 đến Chủ Nhật).
   * Tạo các Slot Card chọn khung giờ (Sáng: 07-12h, Chiều: 12-17h, Tối: 17-22h) dạng toggle bật/tắt linh hoạt.
   * Xử lý State lưu trữ khung giờ rảnh theo dạng Map object.
   * Thêm nút "Lưu Đăng Ký" kèm hiệu ứng loading và thông báo `Alert`.
3. **Cấu hình Điều hướng (`AppNavigator.js`):**
   * Đăng ký `AvailabilityScreen` vào danh sách màn hình ứng dụng Mobile.

----------------------------------------------------------------------------------------------
## [2026-08-23] - Nhật ký Phát triển Frontend Mobile (Tuần 5)

### 📌 Tính năng: Schedule UI & Shift Color Synchronization (Màn hình Lịch Làm Việc)
* **Người thực hiện:** Duyên (Frontend & UX/UI)
* **Mục tiêu:** Xây dựng màn hình xem Lịch làm việc cá nhân (`My shifts`) và Lịch làm việc tổng thể quán (`Schedule`) trên React Native (Expo) theo mockup `Lịch.docx` (Ảnh 1 & Ảnh 2), đồng bộ 100% mã màu ca trực (`SHIFT_COLORS`) với bản Web.
* **Nhánh Git:** `duyen-frontend`
* **Commit Hash:** `dabeabc`

---

#### 🔨 1. Công việc đã thực hiện:
1. **Xây dựng Màn hình Lịch (`screens/ScheduleScreen.js`):**
   * Thiết kế Header Tháng hiển thị tiêu đề tháng kèm nút chuyển tuần/tháng `‹` và `›`.
   * Tạo bộ chuyển Tab Switcher (`Rectangle 576/577`): Tab `My shifts` nền xanh nhạt `#ECF9E8` và Tab `Schedule` nền `#F2F0F0`.
   * Xây dựng thanh 7 Ngày trong tuần (`Rectangle 578`): Hỗ trợ cơ chế toggle chọn xem 1 ngày cụ thể (highlight xanh `#ECF9E8` như Ảnh 2) hoặc xem toàn bộ 7 ngày (Ảnh 1).
   * Hiển thị danh sách Thẻ ca làm việc với màu sắc tương ứng từng vị trí ca:
     * **Barista (Ca Sáng 6:00 - 15:00):** Nền thẻ mint `#F0FAF6`, vạch màu & chấm tròn xanh ngọc `#5BC8B8`.
     * **Cashier (Ca Chiều 14:00 - 22:00):** Nền thẻ hồng `#FDF2F7`, vạch màu & chấm tròn hồng `#D97FB2`.
     * **Kitchen / Bếp:** Nền thẻ `#FFF6ED`, màu `#D98080`.
     * **Service / Phục vụ:** Nền thẻ `#FAFBE8`, màu `#C8C84A`.
     * **Supervisor / Quản lý ca:** Nền thẻ `#F2F6FC`, màu `#7AA8D9`.
   * Hiển thị trạng thái Ngày trống với thông báo: *"Bạn không có lịch làm việc."* kèm vạch phân cách xám.
2. **Khởi tạo Dịch vụ Ca làm việc (`services/shiftService.js`):**
   * Định nghĩa các hàm `getMyShifts`, `getShiftsForStore`, `registerShift` kết nối Backend API.
3. **Cấu hình Trải nghiệm Đăng nhập (`screens/LoginScreen.js`):**
   * Bổ sung nút truy cập nhanh chế độ Demo và xử lý fallback để dễ dàng kiểm thử trên trình duyệt web.
4. **Kiểm thử trên Nền tảng Web:**
   * Khởi chạy thành công trên Expo Web (`npx expo start --web` tại `http://localhost:8081`).

---

#### 💡 2. Vấn đề Kỹ thuật & Giải pháp (Technical Challenge):
* **Vấn đề:** Cần đáp ứng đồng thời 2 chế độ hiển thị trong tài liệu thiết kế `Lịch.docx`: chế độ xem toàn bộ 7 ngày trong tuần (Ảnh 1) và chế độ xem chi tiết từng ngày được bấm chọn (Ảnh 2) mà không cần chuyển trang.
* **Giải pháp:** Sử dụng state `selectedDayIndex` kết hợp cơ chế toggle 2 chiều: khi người dùng chạm vào một ngày đang được chọn, hệ thống tự động reset `selectedDayIndex = null` để hiển thị lại toàn bộ tuần một cách trực quan và mượt mà.

---

#### 🚀 3. Kế hoạch tiếp theo:
* Phát triển Popup/Modal "Gửi yêu cầu ca làm" (Xin đổi ca / Xin nghỉ phép / Mượn nhân sự) ngay khi chạm vào thẻ ca trực trên `ScheduleScreen.js`.
* Hoàn thiện màn hình `RequestScreen.js` trên Mobile để nhân viên theo dõi trạng thái phê duyệt từ Quản lý Web.