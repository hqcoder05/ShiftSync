# ⚙️ Hướng dẫn cài đặt và chạy ShiftSync Backend

Tài liệu này hướng dẫn chi tiết cách chạy phần **Backend (Spring Boot)** của hệ thống ShiftSync trên máy tính cá nhân (Local).

## 📌 1. Yêu cầu hệ thống (Prerequisites)

- **Java Development Kit (JDK) 21**
- **Maven 3.9+** (hoặc dùng `mvnw` đi kèm source code)
- **PostgreSQL 16+** (Cài đặt trực tiếp hoặc chạy qua Docker)
- **IDE:** IntelliJ IDEA (khuyên dùng) hoặc VS Code.

---

## 🗄️ 2. Thiết lập Cơ sở dữ liệu (PostgreSQL)

Bạn cần tạo một Database trống trên PostgreSQL trước khi khởi chạy ứng dụng. Spring Boot kết hợp với Flyway sẽ tự động chạy các file SQL để tạo bảng và cấu trúc schema.

1. Mở pgAdmin hoặc công cụ quản lý Database của bạn (DBeaver, DataGrip...).
2. Tạo database mới với tên: `shiftsync`
3. Username và Password mặc định mà hệ thống đang dùng là `postgres` / `postgres`. Nếu bạn dùng password khác, xem tiếp Bước 3.

---

## 🛠️ 3. Cấu hình biến môi trường (`application.properties`)

Di chuyển vào thư mục `shiftsync-backend/src/main/resources`.
Mở file `application.properties`, tìm cấu hình Datasource. Nếu cấu hình CSDL của bạn khác mặc định, hãy sửa lại ở đây:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/shiftsync
spring.datasource.username=postgres
spring.datasource.password=123456  # Sửa thành mật khẩu PostgreSQL của máy bạn
```

---

## ▶️ 4. Khởi chạy ứng dụng (Run Application)

Có 2 cách phổ biến để chạy Backend:

### Cách 1: Chạy bằng IntelliJ IDEA (Khuyên dùng)
1. Mở thư mục con `shiftsync-backend` bằng IntelliJ IDEA.
2. Đợi IDE tải xong các thư viện Maven (Sync Maven).
3. Mở file `ShiftsyncBackendApplication.java` nằm trong `src/main/java/com/shiftsync`.
4. Bấm nút ▶️ **Run** màu xanh.

### Cách 2: Chạy bằng Terminal (Command Line)
Mở Terminal, di chuyển vào thư mục `shiftsync-backend` và gõ lệnh sau:
```bash
# Trên Windows (PowerShell/CMD)
.\mvnw spring-boot:run

# Trên Mac/Linux
./mvnw spring-boot:run
```

⏳ Khi Terminal hiện dòng chữ `Started ShiftsyncBackendApplication in ... seconds`, server đã khởi động thành công và đang lắng nghe ở cổng **8080**.

---

## 🧪 5. Kiểm tra API (Swagger UI)

Khi server đang chạy, bạn mở trình duyệt web và truy cập vào đường link sau để xem giao diện tài liệu API (OpenAPI) và test trực tiếp:

👉 **http://localhost:8080/swagger-ui.html**

Tại đây, bạn có thể xem tất cả các nhóm API (Auth, Store, Shift, Attendance...) và dùng nút "Try it out" để thử nghiệm gửi request.

---

## 🆘 Các lỗi thường gặp (Troubleshooting)

**1. Lỗi "Port 8080 was already in use":**
Điều này có nghĩa là đang có một ứng dụng khác trên máy bạn chiếm dụng cổng 8080.
- Xử lý: Bạn có thể đổi cổng chạy app trong `application.properties` (ví dụ `server.port=8081`) hoặc tìm và tắt tiến trình đang chiếm cổng 8080.

**2. Lỗi "Connection to localhost:5432 refused":**
Spring Boot không thể kết nối tới PostgreSQL.
- Xử lý: Hãy kiểm tra xem PostgreSQL server đã được bật chưa, và thông tin port, username, password trong file `application.properties` đã chính xác chưa.

**3. Lỗi "FlywayException: Validate failed":**
Xảy ra khi cấu trúc các file SQL Migration bị sửa đổi không khớp với trạng thái hiện tại của Database.
- Xử lý: Cách nhanh nhất ở môi trường Dev là vào PostgreSQL, Xóa hoàn toàn database `shiftsync` (Drop Database) và tạo lại một cái trống. Sau đó chạy lại ứng dụng để Flyway tự tạo lại cấu trúc từ đầu.
