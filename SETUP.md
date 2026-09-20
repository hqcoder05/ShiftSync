# Hướng dẫn cài đặt và khởi chạy ShiftSync

ShiftSync là một hệ thống Full-stack bao gồm 3 phần chính. Bạn cần khởi chạy cả 3 phần để hệ thống hoạt động trơn tru.

---

## Yêu cầu môi trường
- **Java 21** & **Maven**
- **Node.js 20+** & **npm**
- **PostgreSQL 16+** & **Redis 7+**
- (Tuỳ chọn) **Docker** nếu muốn chạy Database qua container.

---

## PHẦN 1: Khởi chạy Backend (Spring Boot)

### 1. Chuẩn bị Database
- Mở PostgreSQL, tạo một database mới tên là `shiftsync`.
- Cấu hình biến môi trường trong `shiftsync-backend/.env` theo mẫu `.env.example`. Không đưa mật khẩu thật vào Git.
- Bật Redis server ở cổng mặc định `6379`.

### 2. Chạy ứng dụng
Mở Terminal, di chuyển vào thư mục `shiftsync-backend`:
```bash
cd shiftsync-backend
./mvnw clean install -DskipTests
./mvnw spring-boot:run
```
Khi thấy dòng `Started ShiftsyncBackendApplication`, server đã chạy thành công ở cổng **8080**.
API Docs: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

---

## PHẦN 2: Khởi chạy Web Admin (React - Dashboard)

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
Ứng dụng Web chạy tại **http://localhost:5173** hoặc cổng được Vite cấp phát.

---

## PHẦN 3: Khởi chạy Mobile App (React Native - Nhân viên)

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
- Cập nhật `CURRENT_LAN_IP` trong `ShiftSync-Mobile/services/api.js` nếu Expo không tự nhận diện đúng địa chỉ máy chủ.

### 3. Khởi chạy Expo
```bash
npx expo start
```
Expo sẽ hiện mã QR. Dùng Expo Go trên iOS/Android để quét và mở ứng dụng.

---

## Xử lý lỗi thường gặp
1. **Lỗi ngốn Port (Port in use):** Nếu Backend báo cổng 8080 đã bị chiếm, đổi cổng trong `application.properties` thành `8081` và nhớ đổi lại endpoint tương ứng trên Web/Mobile.
2. **Lỗi kết nối Mobile App tới Backend (Network Error):** Chắc chắn điện thoại và máy tính cùng kết nối chung 1 mạng Wifi, và bạn đã thay `localhost` bằng đúng địa chỉ IP LAN của máy tính.
