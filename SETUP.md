# Hướng dẫn cài đặt và khởi chạy ShiftSync

ShiftSync là một hệ thống Full-stack bao gồm 3 phần chính. Bạn cần khởi chạy cả 3 phần để hệ thống hoạt động trơn tru.

---

## Yêu cầu môi trường
- **Java 21** & **Maven**
- **Node.js 20+** & **npm**
- **PostgreSQL 16+** & **Redis 7+**
- **Docker Desktop** nếu muốn chạy toàn bộ hệ thống bằng container.

## Chạy toàn bộ hệ thống bằng Docker

Tệp Compose chuẩn của dự án là `docker-compose.yml` tại thư mục gốc. Tệp
`shiftsync-backend/docker-compose.yml` chỉ là lối vào tương thích và luôn nạp
chính tệp gốc cùng `.env` ở thư mục gốc; không còn một Compose Backend độc lập.

1. Sao chép `.env.example` thành `.env` tại thư mục gốc và thay các giá trị mẫu,
   đặc biệt là `DB_PASSWORD` và `JWT_SECRET`.
2. Với điện thoại thật, thay `EXPO_HOST_IP` và `MOBILE_PUBLIC_API_URL` bằng LAN IP
   của máy chạy Docker.
3. Từ thư mục gốc dự án, chạy:

   ```powershell
   docker compose up -d --build
   ```

4. Kiểm tra Backend đã sẵn sàng:

   ```powershell
   Invoke-WebRequest http://localhost:8080/actuator/health/readiness
   ```

Các dịch vụ mặc định: Web `http://localhost:3000`, Mobile Expo
`http://localhost:8081`, Backend `http://localhost:8080`.

Nếu đang đứng trong `shiftsync-backend`, lệnh `docker compose up -d --build`
vẫn hợp lệ và sẽ dùng đúng cấu hình gốc. Không tạo hoặc chỉnh tệp `.env` thứ hai
để chạy Docker.

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
