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