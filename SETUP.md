# 🚀 Hướng dẫn Cài đặt & Khởi chạy toàn bộ dự án ShiftSync

ShiftSync là một hệ thống Full-stack bao gồm 3 phần chính. Bạn cần khởi chạy cả 3 phần để hệ thống hoạt động trơn tru.

---

## 📌 Yêu cầu môi trường (Prerequisites)
- **Java 21** & **Maven**
- **Node.js 18+** & **npm**
- **PostgreSQL 16+** & **Redis 7+**
- (Tuỳ chọn) **Docker** nếu muốn chạy Database qua container.

---

## 🛠️ PHẦN 1: Khởi chạy Backend (Spring Boot)

### 1. Chuẩn bị Database
- Mở PostgreSQL, tạo một database mới tên là `shiftsync`.
- Mở file `shiftsync-backend/src/main/resources/application.properties` để kiểm tra tài khoản DB. Mặc định là `postgres` / `postgres`. Hãy đổi mật khẩu cho đúng với máy bạn.
- Bật Redis server ở cổng mặc định `6379`.

### 2. Chạy ứng dụng
Mở Terminal, di chuyển vào thư mục `shiftsync-backend`:
```bash
cd shiftsync-backend
./mvnw clean install -DskipTests
./mvnw spring-boot:run
```
✅ Khi thấy dòng `Started ShiftsyncBackendApplication`, server đã chạy thành công ở cổng **8080**.
👉 API Docs: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

---

## 🌐 PHẦN 2: Khởi chạy Web Admin (React - Dashboard)

Phần Web dành cho Manager và Admin để quản lý cửa hàng, nhân viên, xếp lịch tự động.

### 1. Cài đặt thư viện
Mở một tab Terminal mới, di chuyển vào thư mục `ShiftSync-Web`:
```bash
cd ShiftSync-Web
npm install
```

### 2. Chạy ứng dụng Web
```bash
npm run dev
```
✅ Ứng dụng Web sẽ tự động mở hoặc bạn có thể truy cập qua link: **http://localhost:5173** (hoặc cổng khác tuỳ Vite cấp phát).

---

## 📱 PHẦN 3: Khởi chạy Mobile App (React Native - Nhân viên)

Phần App dành cho Nhân viên điểm danh GPS, xem lịch, đổi ca.

### 1. Cài đặt thư viện
Mở một tab Terminal mới, di chuyển vào thư mục `ShiftSync-Mobile`:
```bash
cd ShiftSync-Mobile
npm install
```

### 2. Cấu hình IP máy tính (Quan trọng)
App điện thoại chạy qua Wifi sẽ không hiểu `localhost`. 
- Tìm IP mạng LAN của máy bạn (Vd: `192.168.1.5`).
- Mở file `ShiftSync-Mobile/services/api.js` (hoặc file tương đương) và đổi `localhost` thành IP của bạn.

### 3. Khởi chạy Expo
```bash
npx expo start
```
✅ Expo sẽ hiện ra một mã QR. 
👉 Dùng điện thoại tải app **Expo Go** (trên iOS/Android), quét mã QR đó để mở app trực tiếp trên điện thoại của bạn!

---

## 🆘 Troubleshooting (Sửa lỗi nhanh)
1. **Lỗi ngốn Port (Port in use):** Nếu Backend báo cổng 8080 đã bị chiếm, đổi cổng trong `application.properties` thành `8081` và nhớ đổi lại endpoint tương ứng trên Web/Mobile.
2. **Lỗi kết nối Mobile App tới Backend (Network Error):** Chắc chắn điện thoại và máy tính cùng kết nối chung 1 mạng Wifi, và bạn đã thay `localhost` bằng đúng địa chỉ IP LAN của máy tính.
