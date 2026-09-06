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
   * Google Antigravity IDE / Gemini (Google) & Claude 3.5 Sonnet.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 23/08/2026.
   * **Mục tiêu:** Lập trình hoàn thiện màn hình Lịch làm việc (`screens/ScheduleScreen.js`) trên React Native (Expo) theo tài liệu thiết kế `Lịch.docx` (Ảnh 1 & Ảnh 2); đồng bộ 100% bảng mã màu ca trực với bản Web (`SHIFT_COLORS`); tạo tầng dịch vụ `services/shiftService.js` và tối ưu điều hướng `AppNavigator.js`.
   * **Ngữ cảnh:** Ứng dụng Mobile cần giao diện xem lịch cá nhân (`My shifts`) và lịch tổng thể quán (`Schedule`), hỗ trợ chuyển đổi tuần linh hoạt, chọn ngày xem chi tiết ca trực hoặc xem toàn tuần, hiển thị vị trí ca (Barista, Cashier, Kitchen...) kèm màu sắc trực quan.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Tiếp tục hoàn thiện màn hình Lịch làm việc trên Mobile. Tôi đã phân tích tài liệu thiết kế `Lịch.docx` và xác định các yếu tố cần triển khai: Header tháng có điều hướng tuần, Tab chuyển đổi giữa lịch cá nhân và lịch toàn quán, danh sách 7 ngày trong tuần và các thẻ ca làm việc. Yêu cầu đặc biệt là màu sắc các ca trực phải đồng nhất với màu đã thiết lập trên Web. Hãy tiếp tục phát triển file `screens/ScheduleScreen.js` theo đúng định hướng này."*
   * **Prompt hiệu chỉnh:** *"Điều chỉnh và bổ sung các chi tiết kỹ thuật sau vào `ScheduleScreen.js`: (1) Triển khai cơ chế toggle 2 chiều khi người dùng bấm chọn ngày: bấm lần 1 để lọc và xem ca trực của ngày đó (Ảnh 2), bấm lần 2 để quay về chế độ xem toàn bộ tuần (Ảnh 1); (2) Ánh xạ màu ca trực theo vai trò: Barista xanh ngọc `#5BC8B8` nền `#F0FAF6`, Cashier hồng `#D97FB2` nền `#FDF2F7`, Kitchen cam `#D98080`, Service vàng `#C8C84A`, Supervisor xanh dương `#7AA8D9`; (3) Tự xây dựng Custom Week Strip thuần React Native, không dùng thư viện DatePicker bên thứ 3 để đảm bảo hiệu năng và tính tương thích trên Expo Web."*

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
   * **Chỉnh sửa:** Bổ sung cơ chế toggle thông minh 2 chiều; tinh chỉnh padding và font chữ hiển thị chuẩn xác trên cả màn hình điện thoại thật và Expo Web.
   * **Loại bỏ:** Lược bỏ các thư viện Datepicker bên thứ 3, tự dựng Custom Week Strip thuần React Native nhằm đảm bảo hiệu năng và bám sát Figma.

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

----------------------------------------------------------------------------------------------------
## [2026-08-24] - Màn hình Yêu cầu Ca làm & Giao diện Hồ sơ Nhân viên (Tuần 6)

1. **Công cụ & Mô hình:**
   * Google Antigravity IDE / Gemini (Google) & Claude 3.7 Sonnet.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 24/08/2026.
   * **Mục tiêu:** Xây dựng màn hình Yêu cầu (`screens/RequestScreen.js`) cho phép nhân viên gửi đơn đổi ca, xin nghỉ phép và theo dõi trạng thái phê duyệt từ Quản lý Web.
   * **Ngữ cảnh:** Nhân viên cần có kênh giao tiếp trực tiếp với Quản lý ngay trên ứng dụng Mobile để gửi và theo dõi các yêu cầu ca làm, thay vì phải liên hệ thủ công qua điện thoại hoặc tin nhắn.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Tôi đã phân tích luồng nghiệp vụ đổi ca và xin nghỉ phép. Cần xây dựng màn hình Yêu cầu trên Mobile bao gồm: danh sách các yêu cầu đã gửi kèm trạng thái phê duyệt, form gửi đơn đổi ca và form xin nghỉ phép. Màn hình cần kết nối với REST API `/api/requests` để đồng bộ dữ liệu với Quản lý trên Web."*
   * **Prompt hiệu chỉnh:** *"Bổ sung thêm 2 điểm sau: (1) Sau khi gửi yêu cầu thành công, cập nhật state cục bộ ngay lập tức để danh sách hiển thị mục mới mà không cần tải lại toàn bộ trang; (2) Xử lý phân biệt trạng thái màu sắc cho từng loại: đang chờ (xám), đã duyệt (xanh lá), bị từ chối (đỏ) để người dùng nhanh chóng nhận biết kết quả."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * `screens/RequestScreen.js`: Giao diện danh sách yêu cầu, Modal gửi đơn đổi ca và xin nghỉ phép.
   * `services/requestService.js`: Tầng dịch vụ gọi API `/api/requests`, xử lý tạo và truy vấn yêu cầu.

5. **Kết quả AI trả về:**
   * Màn hình `RequestScreen.js` hiển thị danh sách yêu cầu có màu trạng thái và Modal gửi đơn đầy đủ.
   * Service `requestService.js` kết nối REST API và xử lý response.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Cấu trúc danh sách yêu cầu, logic phân biệt màu trạng thái, form gửi đơn.
   * **Chỉnh sửa:** Tối ưu cơ chế cập nhật state cục bộ ngay sau khi API trả về 201 Created để tránh re-fetch.

7. **Lý do chỉnh sửa:**
   * Cải thiện tốc độ phản hồi giao diện sau thao tác gửi đơn, giảm số lần gọi API không cần thiết.

8. **Phương pháp kiểm thử & Xác minh:**
   * Gửi đơn xin đổi ca -> kiểm tra xuất hiện tức thì trong danh sách với trạng thái "Đang chờ".
   * Mô phỏng phê duyệt từ Web -> kiểm tra trạng thái trên Mobile cập nhật sang "Đã duyệt".

9. **Commit tương ứng:**
   * **Commit Message:** `feat(yeu-cau): phat trien man hinh doi ca nhan vien mobile va quan ly duyet yeu cau`
   * **Nhánh Git:** `duyen-frontend`

----------------------------------------------------------------------------------------------------
## [2026-08-25] - Chỉnh sửa Giao diện Chấm công Web & Xây dựng Màn hình Hồ sơ Mobile (Tuần 6)

1. **Công cụ & Mô hình:**
   * Google Antigravity IDE / Gemini (Google) & Claude 3.7 Sonnet.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 25/08/2026.
   * **Mục tiêu:** Đồng bộ giao diện trang Quản lý Chấm công Web (`AttendancePageLive.jsx`) theo ngôn ngữ thiết kế của trang Lịch; xây dựng màn hình Hồ sơ Mobile (`ProfileScreenApi.js`) theo tài liệu `Hồ sơ.docx` và ảnh `Hoso.png`.
   * **Ngữ cảnh:** Giao diện trang Chấm công đang không nhất quán về phong cách với trang Lịch (các icon thừa, bộ lọc không hoạt động đúng). Đồng thời, màn hình Hồ sơ Mobile chưa được xây dựng theo đúng đặc tả thiết kế, cần hiển thị thông tin nhân viên tự điền thay vì có sẵn cứng.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Sau khi đánh giá lại giao diện trang Chấm công, tôi nhận thấy cần điều chỉnh để đồng bộ phong cách với trang Lịch. Cụ thể: (1) Xóa bỏ toàn bộ icon thừa ở cột tiêu đề và khu vực bộ lọc; (2) Bộ lọc Chi nhánh cần hoạt động dạng dropdown xổ xuống; (3) Cụm nút hành động ở góc phải cần thiết kế lại theo dạng Capsule bo tròn liền mạch. Với màn hình Hồ sơ Mobile, hãy đọc file `Hồ sơ.docx` và `Hoso.png` rồi triển khai giao diện để người dùng tự điền thông tin cá nhân."*
   * **Prompt hiệu chỉnh:** *"Về trang Chấm công Web: Thiết kế cụm nút Capsule (`.att-capsule-card`) gồm nút 'Tóm tắt bảng lương' màu xanh ngọc `#ccfbf1` bên trái và nút 'Xuất' màu vàng hổ phách `#FEF3C7` bên phải, ngăn cách bằng vạch dọc mỏng - tương tự phong cách nút đã làm ở trang Lịch. Về màn hình Hồ sơ Mobile: Bố cục gồm thẻ nền vàng nhạt ở trên với avatar và thông tin cơ bản; 2 khối thẻ trắng bên dưới là 'Thông tin cá nhân' và 'Thông tin đăng nhập'. Các trường thông tin mở rộng (Nơi sinh, Giới tính) lưu vào `AsyncStorage` vì API chưa hỗ trợ."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * Web: `src/pages/AttendancePageLive.jsx`, `AttendancePageLive.css`, `src/services/attendanceService.js`.
   * Mobile: `screens/ProfileScreen.js`, `screens/ProfileScreenApi.js`, `services/profileService.js`, `services/attendanceService.js`.
   * Backend: `V17__add_attendance_location_and_selfies.sql`, `AttendanceController.java`, `AttendanceService.java`.

5. **Kết quả AI trả về:**
   * Trang Chấm công Web với Sidebar bộ lọc gọn gàng và thanh Capsule hành động chuẩn thiết kế.
   * Màn hình Hồ sơ Mobile với thẻ vàng nhạt và 2 khối thông tin trắng theo đúng `Hoso.png`.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Bố cục Sidebar bộ lọc 2 mục Chi nhánh và Người dùng, thiết kế thẻ hồ sơ theo đặc tả.
   * **Chỉnh sửa:** Thay thế 2 nút rời rạc thành 1 thanh Capsule nhộng bo tròn duy nhất; bổ sung cơ chế hybrid lưu thông tin hồ sơ: dữ liệu cơ bản từ API, dữ liệu mở rộng từ `AsyncStorage`.
   * **Loại bỏ:** Xóa toàn bộ icon trang trí ở tiêu đề cột và khu vực bộ lọc trang Chấm công.

7. **Lý do chỉnh sửa:**
   * Tạo ngôn ngữ thiết kế đồng nhất xuyên suốt các trang quản lý trên Web.
   * Đảm bảo màn hình Hồ sơ hoạt động ổn định ngay cả khi API chưa hỗ trợ đầy đủ các trường thông tin.

8. **Phương pháp kiểm thử & Xác minh:**
   * Web: Kiểm tra dropdown bộ lọc Chi nhánh xổ xuống, nhấn nút Capsule điều hướng sang trang Bảng lương.
   * Mobile: Điền thông tin hồ sơ -> thoát app -> mở lại kiểm tra dữ liệu vẫn còn.
   * Build: `npm run build` thành công trong 711ms.

9. **Commit tương ứng:**
   * **Commit Message:** `feat(cham-cong, ho-so): dong bo giao dien cham cong web dang capsule va xay dung man hinh ho so mobile`
   * **Nhánh Git:** `duyen-frontend`

----------------------------------------------------------------------------------------------------
## [2026-08-26] - Tái thiết kế Trang Quản lý Bảng lương Web & Modal Xuất Excel (Tuần 6)

1. **Công cụ & Mô hình:**
   * Google Antigravity IDE / Gemini (Google) & Claude 3.7 Sonnet.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 26/08/2026.
   * **Mục tiêu:** Tái thiết kế toàn diện trang Quản lý Bảng lương (`PayrollPage.jsx`, `PayrollPage.css`) chuẩn 100% theo tài liệu `luongweb.docx` và ảnh minh họa `luong.png`, tích hợp cơ chế tính lương tự động dựa trên đơn giá giờ do Quản lý thiết lập.
   * **Ngữ cảnh:** Giao diện bảng lương hiện tại chưa đáp ứng đủ các trường nghiệp vụ (Tăng ca, Thưởng, Trợ cấp, Chi phí khác). Quản lý cần một giao diện trực quan để thiết lập đơn giá lương/giờ, xem tổng hợp và xuất báo cáo lương ra file Excel cuối kỳ.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Tôi đã nghiên cứu kỹ tài liệu `luongweb.docx` và xác định cấu trúc giao diện cần xây dựng gồm: Sidebar bên trái chứa bộ chọn kỳ lương, ô thiết lập đơn giá giờ và bộ lọc nhân viên; Bảng tính lương bên phải với các cột Giờ làm, Tăng ca, Thưởng, Trợ cấp, Chi phí khác và Tổng lương; Modal xuất báo cáo Excel có ảnh minh họa `luong.png`. Hãy triển khai theo đúng đặc tả này và kết nối với API backend để lấy dữ liệu giờ công thực tế."*
   * **Prompt hiệu chỉnh:** *"Bổ sung cơ chế tính lương tự động dùng `useMemo`: khi Quản lý thay đổi giá trị ô đơn giá/giờ (`baseHourlyRate`), toàn bộ bảng lương phải cập nhật tức thì theo công thức `Tổng lương = (Giờ làm × Đơn giá) + (Tăng ca × Đơn giá × 1.5) + Trợ cấp - Chi phí khác`. Với Modal xuất Excel: chia làm 2 cột, cột trái chứa ảnh `luong.png`, cột phải chứa nút tải file và hộp cảnh báo xác nhận chốt kỳ lương. Xử lý tải file blob Excel qua `Axios responseType: 'blob'`."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * Web: `src/pages/PayrollPage.jsx`, `PayrollPage.css`, `src/assets/illustrations/luong.png`, `src/services/payrollService.js`.
   * Backend: `PayrollController.java`, `PayrollCalculationService.java`, `PayrollDTO.java`.

5. **Kết quả AI trả về:**
   * Giao diện `PayrollPage.jsx` chuẩn 100% thiết kế `luongweb.docx`, bao gồm Sidebar chức năng đầy đủ và bảng tính lương tính toán realtime.
   * Modal xuất bảng lương chia 2 cột với ảnh minh họa và nút tải Excel tích hợp API.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Cấu trúc Sidebar, bảng tính lương header xanh ngọc `#EAF8E6`, dòng tổng kết xám `#E8E8E8`, cột chi phí khác màu đỏ `#C60D1C`.
   * **Chỉnh sửa:** Tích hợp ô nhập đơn giá/giờ (`baseHourlyRate`) vào Sidebar để Quản lý có thể điều chỉnh linh hoạt; thêm highlight xám `#CFCFCF` khi chọn lọc từng nhân viên cụ thể.
   * **Loại bỏ:** Bỏ phiên bản bảng lương placeholder cũ với dữ liệu mẫu cứng.

7. **Lý do chỉnh sửa:**
   * Đáp ứng đúng nghiệp vụ thực tế: Quản lý có thể thử nghiệm các mức lương/giờ khác nhau và xem kết quả tức thì trước khi chốt kỳ lương.

8. **Phương pháp kiểm thử & Xác minh:**
   * Thay đổi giá trị ô đơn giá -> kiểm tra toàn bộ cột Tổng lương và dòng Tổng cộng cập nhật ngay lập tức.
   * Nhấn nút Xuất -> Modal hiện ra với ảnh `luong.png` bên trái -> nhấn Download -> file `.xlsx` tải về máy thành công.
   * Build: `npm run build` thành công trong 472ms, 0 lỗi.

9. **Commit tương ứng:**
   * **Commit Message:** `feat(bang-luong-web): tai thiet ke trang quan ly bang luong voi tinh luong realtime va modal xuat excel`
   * **Nhánh Git:** `duyen-frontend`

----------------------------------------------------------------------------------------------------
## [2026-08-27] - Màn hình Phiếu lương 2 View & Đồng bộ Widget Thu nhập Trang chủ Mobile (Tuần 6)

1. **Công cụ & Mô hình:**
   * Google Antigravity IDE / Gemini (Google) & Claude 3.7 Sonnet.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 27/08/2026.
   * **Mục tiêu:** Tái thiết kế màn hình Phiếu lương Mobile (`PayrollScreen.js`) theo tài liệu `luongmobile.docx` với 2 chế độ xem: danh sách phiếu lương theo tháng và báo cáo thu nhập chi tiết; đồng bộ widget Báo cáo thu nhập tại Trang chủ (`DashboardScreen.js`).
   * **Ngữ cảnh:** Nhân viên cần tra cứu thu nhập theo từng tháng và xem chi tiết cơ cấu lương (lương cơ bản, phụ phí, trợ phí) ngay trên ứng dụng Mobile mà không cần liên hệ Quản lý.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Tôi đã nghiên cứu tài liệu `luongmobile.docx` và xác định 2 màn hình cần xây dựng: (1) Màn hình danh sách liệt kê các phiếu lương theo từng tháng trong năm, có nút lọc theo năm; (2) Màn hình báo cáo chi tiết khi chọn vào một tháng cụ thể, hiển thị thẻ xanh tổng quan và 3 mục chi tiết: Tổng tiền, Phụ phí, Trợ phí. Đồng thời cần cập nhật widget trang chủ để hiển thị đúng số liệu thu nhập thực tế."*
   * **Prompt hiệu chỉnh:** *"Bổ sung yêu cầu kỹ thuật: Quản lý chuyển đổi giữa 2 màn hình bằng state `selectedPayslip` thay vì dùng Stack Navigation để tránh re-render toàn bộ component. Thẻ xanh tổng quan (`#EAF8E6`) cần hiển thị: Lương ước tính, đơn giá theo giờ, số ca đã làm (16 of 16) và số giờ đã làm (132 of 132). Phần 'Lương thực nhận' ở cuối cần nổi bật với font 20px màu xanh lá `#51A33D`."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * Mobile: `screens/PayrollScreen.js`, `screens/DashboardScreen.js`, `services/payrollService.js`.
   * Assets: `assets/luong.png` (ảnh minh họa trong thẻ chi tiết).

5. **Kết quả AI trả về:**
   * `PayrollScreen.js` hoàn chỉnh với 2 chế độ xem, chuyển đổi mượt mà bằng state cục bộ.
   * Widget Trang chủ đồng bộ hiển thị đúng số giờ làm và lương thực nhận từ dữ liệu API.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Bố cục thẻ xanh hero, 3 thẻ con trắng (Tổng tiền, Phụ phí, Trợ phí), 3 khối thông tin chi tiết có vạch ngăn cách.
   * **Chỉnh sửa:** Dùng state `selectedPayslip` để chuyển đổi màn hình thay vì Navigation Stack, giảm độ phức tạp và cải thiện tốc độ phản hồi.

7. **Lý do chỉnh sửa:**
   * Tối ưu trải nghiệm: chuyển giữa danh sách và chi tiết phiếu lương nhanh và mượt mà hơn.

8. **Phương pháp kiểm thử & Xác minh:**
   * Nhấn vào phiếu lương Tháng 7 -> Màn hình chi tiết hiện ra đúng số liệu.
   * Nhấn nút quay lại -> Danh sách các tháng hiện ra đúng vị trí.
   * Bundle: `npx expo export` thành công cho cả Web, Android và iOS.

9. **Commit tương ứng:**
   * **Commit Message:** `feat(phieu-luong-mobile): xay dung 2 view danh sach phieu luong thang va bao cao thu nhap chi tiet`
   * **Nhánh Git:** `duyen-frontend`

----------------------------------------------------------------------------------------------------
## [2026-08-28] - Chỉnh sửa Trực tiếp Hồ sơ Inline & Kết nối Dữ liệu Ca làm Thực tế (Tuần 6)

1. **Công cụ & Mô hình:**
   * Google Antigravity IDE / Gemini (Google) & Claude 3.7 Sonnet (Thinking Mode).

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 28/08/2026.
   * **Mục tiêu:** Chuyển đổi màn hình Hồ sơ sang cơ chế chỉnh sửa trực tiếp ngay trên giao diện (Inline Editing) mà không mở popup Modal; kết nối toàn bộ dữ liệu ca làm việc từ API backend thực tế, loại bỏ hoàn toàn dữ liệu mẫu cứng (mock data).
   * **Ngữ cảnh:** Người dùng phản hồi rằng việc phải mở thêm popup Modal để chỉnh sửa thông tin hồ sơ gây gián đoạn trải nghiệm trên Mobile. Đồng thời, lịch làm việc và phiếu lương cần phản ánh đúng dữ liệu thực tế từ CSDL, không được dùng dữ liệu mẫu cứng.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"Sau khi đánh giá trải nghiệm người dùng trên thiết bị thật, tôi quyết định chuyển màn hình Hồ sơ sang chế độ chỉnh sửa trực tiếp trên trang: tất cả các trường thông tin phải là `TextInput` có thể bấm chỉnh ngay lập tức, không hiển thị thêm Modal hay chuyển sang trang khác. Đồng thời, toàn bộ dữ liệu ca làm việc trong `ScheduleScreen.js` phải được lấy từ API backend thực tế, không dùng bất kỳ mảng dữ liệu mặc định nào."*
   * **Prompt hiệu chỉnh:** *"Với `ProfileScreenApi.js`: Loại bỏ hoàn toàn component `<Modal>`, thay tất cả các trường hiển thị text tĩnh bằng `<TextInput>` tương ứng. Thêm cơ chế tự động lưu bất đồng bộ vào `AsyncStorage` khi người dùng kết thúc nhập liệu (`onChangeText`), kèm thông báo trạng thái 'Đã lưu' hiện ngắn trên header. Với `ScheduleScreen.js`: Xóa bỏ các mảng `DEFAULT_MY_SHIFTS` và `DEFAULT_STORE_SHIFTS` cứng, thay bằng `useEffect` gọi API `/api/users/me/shifts` và `/api/stores/{storeId}/shifts` khi component mount."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * Mobile: `screens/ProfileScreenApi.js`, `screens/ScheduleScreen.js`, `navigation/AppNavigator.js`, `services/api.js`.
   * Web: `src/App.jsx`, `src/pages/SchedulePage.jsx`, `SchedulePage.css`, `src/services/availabilityService.js`.
   * Log: `ShiftSync-Mobile/dev-log.md`, `ShiftSync-Web/dev-log.md`, `ShiftSync-Web/AI_Development_Log.md`, `dev-log.md`.

5. **Kết quả AI trả về:**
   * `ProfileScreenApi.js` với toàn bộ trường thông tin là `TextInput` chỉnh sửa trực tiếp, tự động lưu vào `AsyncStorage`.
   * `ScheduleScreen.js` kết nối API backend thực tế, không còn dữ liệu mẫu cứng.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Cơ chế `TextInput` Inline Editing, tự động lưu bất đồng bộ vào `AsyncStorage`, kết nối API ca làm thực tế.
   * **Chỉnh sửa:** Tối ưu luồng re-render: chỉ cập nhật state cục bộ khi người dùng gõ, ghi `AsyncStorage` bất đồng bộ để không làm giật lag giao diện nhập liệu.
   * **Loại bỏ:** Xóa bỏ toàn bộ component `<Modal>` popup cũ và các mảng `DEFAULT_MY_SHIFTS`, `DEFAULT_STORE_SHIFTS` mẫu cứng.

7. **Lý do chỉnh sửa:**
   * Cải thiện trực tiếp trải nghiệm người dùng dựa trên phản hồi thực tế: không bị gián đoạn bởi popup Modal khi chỉnh sửa thông tin hồ sơ trên màn hình nhỏ.
   * Đảm bảo tính trung thực học thuật và toàn vẹn dữ liệu: mọi số liệu hiển thị phải phản ánh đúng dữ liệu nghiệp vụ từ CSDL PostgreSQL.

8. **Phương pháp kiểm thử & Xác minh:**
   * Bấm trực tiếp vào trường "Họ tên" -> bàn phím hiện ra, gõ chỉnh sửa -> "Đã lưu" hiện trên header -> thoát app -> mở lại kiểm tra dữ liệu vẫn còn.
   * Mở màn hình Lịch -> kiểm tra ca làm hiển thị là dữ liệu thực tế từ API, không phải dữ liệu mẫu mặc định.
   * Build Web: `npm run build` thành công trong 663ms (0 lỗi).
   * Bundle Mobile: `npx expo export` thành công cho Web (656 modules), Android (1011 modules), iOS (1013 modules).

9. **Commit tương ứng:**
   * **Commit Message:** `feat(ho-so, lich, nhat-ky): chinh sua truc tiep ho so mobile, ket noi du lieu ca lam that va cap nhat nhat ky thuc tap`
   * **Nhánh Git:** `duyen-frontend`

----------------------------------------------------------------------------------------------------
## [2026-09-01] - Loại bỏ 100% Mock Data Mobile (Yêu cầu, Lương, Hồ sơ, Dashboard) & Kiểm thử Build

1. **Công cụ & Mô hình:**
   * Google Antigravity IDE / Gemini 3.7 Flash.

2. **Ngày - Mục tiêu - Ngữ cảnh:**
   * **Ngày:** 01/09/2026.
   * **Mục tiêu:** Rà soát và loại bỏ toàn bộ dữ liệu mặc định/tượng trưng (mock/placeholder data) trên ứng dụng Mobile, kết nối trực tiếp với API backend Spring Boot và CSDL PostgreSQL thật.
   * **Ngữ cảnh:** Đảm bảo tất cả các màn hình Mobile (Yêu cầu `RequestScreen.js`, Phiếu lương `PayrollScreen.js`, Trang chủ `DashboardScreen.js`, Hồ sơ `ProfileScreenApi.js` và dịch vụ `requestService.js`) chỉ sử dụng dữ liệu thực tế từ tài khoản đăng nhập và ca làm việc thực tế.

3. **Prompt gốc & Prompt hiệu chỉnh:**
   * **Prompt gốc:** *"bạn xem fe và be còn thiếu hay lỗi gì ko fix lai cho tui đi nha, lưu ý ko dùng dữ liệu mặc định tượng trưng hay dữ liệu ảo phải dữ liệu thiệt mới được á"*
   * **Prompt hiệu chỉnh:** *"Xóa bỏ triệt để các mảng `INITIAL_MOCK_REQUESTS`, `DEFAULT_MONTHLY_PAYSLIPS`, `MY_AVAILABLE_SHIFTS`, tên người dùng cứng 'Dilan. Jon'. Kết nối `getMyRequests()`, `getMyPayslips()`, `getMyShifts()`, `getMyProfile()` để hiển thị thông tin thực tế từ backend; xử lý trạng thái rỗng (empty state) khi chưa có ca làm hoặc phiếu lương."*

4. **Tệp / Thành phần mã nguồn liên quan:**
   * Mobile: `services/requestService.js`, `screens/RequestScreen.js`, `screens/DashboardScreen.js`, `screens/PayrollScreen.js`, `screens/ProfileScreenApi.js`.

5. **Kết quả AI trả về:**
   * `requestService.js`: Xóa hoàn toàn 3 request mẫu cứng, gọi API `/requests` thật.
   * `RequestScreen.js`: Tự động tải ca làm thực tế của nhân viên bằng `getMyShifts()` và tên người dùng thật bằng `getMyProfile()`.
   * `PayrollScreen.js`: Gọi API `/users/me/payslips` hoặc tính toán lương ước tính từ các ca đã hoàn thành trong CSDL.
   * `DashboardScreen.js`: Lời chào và tên nhân viên hiển thị theo thông tin tài khoản đang đăng nhập.

6. **Phần chấp nhận, chỉnh sửa hoặc loại bỏ:**
   * **Chấp nhận:** Kết nối API thực tế, cơ chế tự động hiển thị Empty State lịch sự khi cơ sở dữ liệu chưa có bản ghi.
   * **Loại bỏ:** Xóa 100% mock data, placeholder data và tên giả định.

7. **Lý do chỉnh sửa:**
   * Tuân thủ quy định nghiêm ngặt về tính xác thực của dữ liệu đồ án tốt nghiệp và hệ thống thực tế.

8. **Phương pháp kiểm thử & Xác minh:**
   * Bundle export: `npx expo export` thành công 100% cho cả Web (654 modules), iOS (1013 modules), Android (1011 modules).

9. **Commit tương ứng:**
   * **Commit Message:** `fix(mobile): eliminate all mock data in requests, payroll, dashboard and profile screens`
   * **Nhánh Git:** `duyen-frontend`




