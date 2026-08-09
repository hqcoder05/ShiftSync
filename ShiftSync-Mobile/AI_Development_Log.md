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
