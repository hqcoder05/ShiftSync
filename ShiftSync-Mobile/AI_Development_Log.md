# Báo Cáo Sử Dụng AI (AI Development Log) - ShiftSync Mobile

1. **Công cụ & Mô hình:** Claude (Anthropic - Claude 3.5 Sonnet).

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 07/08/2026.
   * **Mục tiêu:** Xây dựng hệ thống Navigation dạng Bottom Tab Navigator cho ứng dụng React Native Mobile.
   * **Ngữ cảnh:** Cần trải nghiệm người dùng (UX) liền mạch trên Mobile, tương thích với cấu trúc 5 phân hệ chính đã định nghĩa ở bản Web.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Hướng dẫn tạo thư mục và code Bottom Tab Navigator với 5 màn hình (Dashboard, Lịch làm việc, Điểm danh, Phiếu lương, Yêu cầu) bằng React Navigation."*
   * **Prompt hiệu chỉnh:** *"Viết cấu hình TabNavigator sử dụng @react-navigation/bottom-tabs, tách biệt file AppNavigator.js với các file Screen riêng lẻ để đảm bảo nguyên lý Single Responsibility."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * Navigation: `navigation/AppNavigator.js`.
   * Screens: `screens/DashboardScreen.js`, `screens/ScheduleScreen.js`, `screens/AttendanceScreen.js`, `screens/PayrollScreen.js`, `screens/RequestScreen.js`.

5. **Kết quả AI trả về:**
   * Mã nguồn file `AppNavigator.js` sử dụng `createBottomTabNavigator`.
   * Khung boilerplate cho 5 màn hình Screen độc lập.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Luồng chuyển Tab và cấu trúc Provider cho Navigation Container.
   * **Chỉnh sửa:** Tùy chỉnh danh sách màn hình, Screen Options (nhãn hiển thị, tiêu đề header) chuẩn hóa theo thiết kế Figma Mobile.
   * **Loại bỏ:** Các cấu hình Icon mặc định chưa phù hợp với bộ Icon thiết kế của dự án.

7. **Lý do chỉnh sửa:**
   * Đảm bảo giao diện Mobile tuân thủ đúng Design Guideline trên Figma.
   * Chuẩn hóa cấu trúc thư mục đồng bộ với bản Web để tái sử dụng tư duy tổ chức dữ liệu.

8. **Phương pháp kiểm thử & Xác minh:**
   * **Chạy môi trường:** Chạy `npx expo start` tạo QR Code.
   * **Kiểm thử thiết bị thật:** Sử dụng ứng dụng Expo Go trên điện thoại cá nhân quét QR Code.
   * **Xác minh chức năng:** Thao tác vuốt/chạm chuyển giữa các Tab, xác nhận chuyển màn hình mượt mà, không gặp crash ứng dụng hay Red Screen Error.

9. **Commit tương ứng:**
   * **Commit Hash:** `367433fe6b71c9d21ca9a905ed231881df4c9141`
* **Link Commit:** https://github.com/hqcoder05/ShiftSync/commit/9ebaf787a22bd6c539ef7223279f65da38a1e728
------------------------------------------------------------------------
## Log #2 — Duyên — Màn hình Login Mobile + sửa luồng điều hướng

1. Công cụ: Claude (Anthropic)
2. Ngày - Mục tiêu: 08/08/2026 - Code hoàn chỉnh màn hình Login Mobile theo Figma, sửa luồng điều hướng bắt buộc qua Login trước khi vào 5-tab, thêm hiệu ứng nhấn nút
3. Prompt: "Hướng dẫn tôi code màn hình Login cho React Native (LoginScreen.js), đồng bộ thiết kế với bản Web: nền xanh mint #EAF6EA, card trắng, logo vẽ bằng react-native-svg vì RN không đọc được thẻ svg HTML, input đổi viền xanh #51A33D khi focus dùng state onFocus/onBlur vì RN không có :focus như CSS, tái sử dụng logic validate từ utils/validators.js dùng chung với Web. Hiện tại app đang mở thẳng vào Dashboard 5-tab, bỏ qua Login — hướng dẫn sửa navigation/AppNavigator.js: thêm createNativeStackNavigator bọc ngoài BottomTabNavigator hiện có, để app luôn mở Login trước, chỉ chuyển sang MainTabs sau khi login thành công bằng navigation.replace(). Sau đó hướng dẫn thêm hiệu ứng nhấn nút mượt mà bằng Animated API: dùng Animated.Value + interpolate để nút chuyển màu nền/màu chữ/scale/shadowOpacity khi onPressIn/onPressOut, tương đương hiệu ứng hover/active bên Web."
4. Response: AI trả về đầy đủ code LoginScreen.js (logo SVG, form, Animated Pressable), navigation/AppNavigator.js (thêm Stack.Navigator bọc MainTabs), hướng dẫn cài thêm 2 thư viện @react-navigation/native-stack và react-native-svg
5. File liên quan: screens/LoginScreen.js, navigation/AppNavigator.js, utils/validators.js
6. Phần chấp nhận/chỉnh sửa: Giữ nguyên toàn bộ, không chỉnh sửa thêm
7. Lý do chỉnh sửa: Không có
8. Cách kiểm thử: npx expo start, quét QR Expo Go, xác nhận app mở vào Login trước (không vào thẳng Dashboard nữa), đối chiếu layout với Figma, test hiệu ứng nhấn giữ nút, test đăng nhập chuyển đúng sang MainTabs
9. Commit: afb1802d4b0ea27d969b3fbf4ca2b9b6daa85231

----------------------------------------------------------------------------------------------------------------------
## [2026-08-13] - Phát triển Module Employee UI (Web) & Availability UI (Mobile)

### 1. Mục tiêu
* **Employee UI (Web):** Thiết kế và lập trình giao diện Quản lý Nhân viên theo mockup Figma, kết nối API xử lý CRUD, phân trang và tìm kiếm.
* **Availability UI (Mobile):** Lập trình màn hình khai báo khung giờ rảnh theo tuần trên React Native (Expo), kết nối API lưu/hiển thị dữ liệu thật.

### 2. AI Prompt Log (Nhật ký tham khảo & tư vấn AI)
* **Thao tác 1 (Employee UI - Web):**
  > "Tôi đã thiết kế xong Luồng Quản lý Nhân viên gồm Bảng dữ liệu, Thanh tìm kiếm và Modal chỉnh sửa. Hướng dẫn giúp tôi cấu hình khung Component React cho `EmployeeListPage` và `EmployeeModal` kết nối qua `employeeService` (Axios) để tối ưu luồng re-render khi bấm Save."
* **Thao tác 2 (Availability UI - Mobile):**
  > "Tôi đã thiết kế xong UI/UX luồng khai báo ca rảnh theo tuần trên Figma. Nhờ AI tư vấn giúp đoạn code React Native (StyleSheet) tổ chức State lưu trữ dữ liệu dạng danh sách theo Thứ (MON-SUN) và gọi API `saveWeeklyAvailability` đảm bảo trải nghiệm mượt mà trên Mobile."

### 3. Kết quả triển khai & Mã nguồn tạo dựng
* **Dự án Web (`ShiftSync-Web`):**
  * `src/services/employeeService.js`: Xây dựng các hàm gọi REST API CRUD Employee.
  * `src/components/Employee/EmployeeModal.jsx`: Modal form nhập thông tin nhân viên.
  * `src/pages/EmployeeListPage.jsx`: Màn hình hiển thị danh sách, phân trang và tìm kiếm.
* **Dự án Mobile (`ShiftSync-Mobile`):**
  * `services/availabilityService.js`: Khởi tạo dịch vụ tích hợp API lịch rảnh.
  * `screens/AvailabilityScreen.js`: Màn hình chọn khung giờ rảnh theo tuần (Sáng/Chiều/Tối) dạng Tab Bar linh hoạt.

### 4. Ghi nhận Bug & Kiểm thử (Checklist)
| ID Bug / Testcase | Mô tả | Mức độ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| TC-EMP-01 | Kiểm tra tải danh sách nhân viên từ API thật (Web) | Normal | Passed | Hiển thị đúng dữ liệu phân trang từ Server |
| TC-EMP-02 | Tìm kiếm nhân viên theo tên/email (Web) | Normal | Passed | Bảng tự động reload theo từ khóa tìm kiếm |
| TC-EMP-03 | Tạo/Sửa nhân viên qua Modal (Web) | High | Passed | Dữ liệu lưu thành công vào DB và tự làm mới |
| TC-AVL-01 | Tải lịch rảnh đã đăng ký theo tuần (Mobile) | Normal | Passed | Hiển thị đúng trạng thái khung giờ rảnh của tuần hiện tại |
| TC-AVL-02 | Chọn ca rảnh & bấm Lưu thay đổi (Mobile) | High | Passed | Gọi API thành công, reload app vẫn giữ nguyên trạng thái đã lưu |
----------------------------------------------------------------------------------------------------
## [2026-08-23] - Hoàn thiện Màn hình Lịch làm việc (ScheduleScreen) & Đồng bộ màu ca trực với Web (Tuần 5)

1. **Công cụ & Mô hình:**
   * Google Antigravity / Gemini (Google) & Claude 3.5 Sonnet.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 23/08/2026.
   * **Mục tiêu:** Lập trình hoàn thiện màn hình Lịch làm việc (`screens/ScheduleScreen.js`) trên React Native (Expo) theo tài liệu thiết kế `Lịch.docx` (Ảnh 1 & Ảnh 2); đồng bộ 100% bảng mã màu ca trực với bản Web (`SHIFT_COLORS`); tạo tầng dịch vụ `services/shiftService.js` và tối ưu điều hướng `AppNavigator.js`.
   * **Ngữ cảnh:** Ứng dụng Mobile cần giao diện xem lịch cá nhân (`My shifts`) và lịch tổng thể quán (`Schedule`), hỗ trợ chuyển đổi tuần linh hoạt, chọn ngày xem chi tiết ca trực hoặc xem toàn tuần, hiển thị vị trí ca (Barista, Cashier, Kitchen...) kèm màu sắc trực quan.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"làm tiếp phần mobile chỗ lịch đi, đọc fiel lịch.docx của t á làm đi t đã làm sẵn 1 trang rồi làm tiếp phần còn lại nha lưu ý cái màu của nó tương ứng với màu mà trweb đã xếp lịch cho nha ScheduleScreen.js làm tiếp trong file này của thư mục ShiftSync_Mobile thư mục con screens á nha"*
   * **Prompt hiệu chỉnh:** *"Xây dựng ScheduleScreen.js bằng React Native StyleSheet bám sát mockup Lịch.docx: Header tháng có nút điều hướng tuần ‹ ›; Tab Switcher My shifts (xanh nhạt #ECF9E8) / Schedule; Thanh 7 ngày trong tuần dạng ô bấm; Danh sách ca làm việc với hiệu ứng toggle xem cả tuần (Ảnh 1) / xem 1 ngày (Ảnh 2); Ánh xạ màu ca trực (Barista xanh ngọc #5BC8B8 nền #F0FAF6, Cashier hồng #D97FB2 nền #FDF2F7, Kitchen #D98080, Service #C8C84A, Supervisor #7AA8D9); cấu hình chạy mượt mà trên Expo Web."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * `screens/ScheduleScreen.js`: Toàn bộ logic giao diện, state điều hướng tuần, chuyển tab, toggle chọn ngày, hiển thị thẻ ca làm việc và ngày trống.
   * `services/shiftService.js`: Tầng dịch vụ gọi REST API (`getMyShifts`, `getShiftsForStore`, `registerShift`).
   * `screens/LoginScreen.js`: Tích hợp fallback truy cập nhanh chế độ Demo khi backend offline.
   * `navigation/AppNavigator.js`: Đăng ký `ScheduleScreen` trong Bottom Tab Navigator và Stack Navigator.

5. **Kết quả AI trả về:**
   * Mã nguồn hoàn chỉnh cho `ScheduleScreen.js` bám sát pixel-perfect tài liệu `Lịch.docx`.
   * Tầng service `shiftService.js` chuẩn Axios instance có gắn JWT Token.
   * Bộ màu `ROLE_THEMES` đồng bộ hoàn toàn với bản Web.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Layout Tab Switcher, cấu trúc 7 ngày trong tuần, định dạng thẻ ca trực theo vai trò, thuật toán tính ngày trong tuần Monday-first.
   * **Chỉnh sửa:** Bổ sung cơ chế toggle thông minh: Bấm vào 1 ngày để lọc ca ngày đó (Ảnh 2), bấm lại lần nữa để xem toàn bộ 7 ngày trong tuần (Ảnh 1); tinh chỉnh padding và font chữ hiển thị chuẩn xác trên cả màn hình điện thoại thật và Expo Web.
   * **Loại bỏ:** Lược bỏ các thư viện Datepicker bên thứ 3 để tự dựng Custom Week Strip thuần React Native nhằm đảm bảo hiệu năng và bám sát Figma.

7. **Lý do chỉnh sửa:**
   * Đảm bảo tính nhất quán giao diện và màu sắc giữa 2 nền tảng Web và Mobile.
   * Tránh xung đột phụ thuộc và đảm bảo ứng dụng chạy mượt mà trên Expo Web (`http://localhost:8081`) và Expo Go.

8. **Phương pháp kiểm thử & Xác minh:**
   * **Kiểm thử trên Expo Web:** Chạy `npx expo start --web`, mở `http://localhost:8081` trên trình duyệt:
     * Chuyển đổi qua lại giữa Tab `My shifts` và `Schedule`.
     * Bấm nút `‹` và `›` kiểm tra chuyển đổi tuần/tháng.
     * Bấm vào ô `Thứ 4 (05)` kiểm tra kích hoạt highlight xanh và lọc hiển thị ca Barista (Ảnh 2).
     * Bấm lại vào ô `Thứ 4 (05)` kiểm tra quay về hiển thị toàn bộ 7 ngày (Ảnh 1).
   * **Kiểm thử dữ liệu:** Đối chiếu màu sắc thẻ ca trực (Barista `#5BC8B8`, Cashier `#D97FB2`) khớp 100% với Web Schedule.

9. **Commit tương ứng:**
   * **Commit Hash:** `dabeabc`
   * **Link Commit:** https://github.com/hqcoder05/ShiftSync/commit/dabeabc

