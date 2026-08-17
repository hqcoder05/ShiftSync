# Thiết lập API Authentication (Register, Login, Refresh)

Nhiệm vụ này sẽ triển khai các endpoint xác thực người dùng bao gồm đăng ký tài khoản, đăng nhập (trả về Access Token JWT và Refresh Token) và làm mới token (Refresh Token) sử dụng Redis để lưu trữ Refresh Token nhằm đảm bảo bảo mật và khả năng thu hồi token.

## User Review Required

> [!IMPORTANT]
> - **Refresh Token Storage:** Sử dụng Redis làm nơi lưu trữ Refresh Token dạng Opaque (UUID ngẫu nhiên) để quản lý phiên đăng nhập và hỗ trợ thu hồi (revoke) token tức thì khi cần. TTL của Refresh Token trong Redis sẽ được cấu hình mặc định là 7 ngày.
> - **Error Handling:** Sử dụng `BusinessException` đặt tại `com.shiftsync.shared.exception` để ném các lỗi nghiệp vụ và được xử lý tập trung bởi `GlobalExceptionHandler`.
> - **DTO Packages:** Các DTO phục vụ cho module Auth sẽ nằm ở package `com.shiftsync.auth.dto` theo Structure.md.

## Proposed Changes

### 1. Exception Handling (Shared Module)

#### [NEW] [BusinessException.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shared/exception/BusinessException.java)
- Định nghĩa lỗi runtime dùng chung cho các lỗi nghiệp vụ (như trùng email, sai tài khoản/mật khẩu).

#### [NEW] [GlobalExceptionHandler.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shared/exception/GlobalExceptionHandler.java)
- Xử lý các exception tập trung, định dạng JSON phản hồi lỗi thống nhất (`status`, `message`, `timestamp`).

### 2. Định nghĩa DTOs (Auth Module)

#### [NEW] [RegisterRequest.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/RegisterRequest.java)
- Chứa thông tin đăng ký: `fullName`, `email`, `password`, `phone`, `systemRole`.

#### [NEW] [LoginRequest.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/LoginRequest.java)
- Chứa thông tin đăng nhập: `email`, `password`.

#### [NEW] [RefreshRequest.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/RefreshRequest.java)
- Chứa thông tin refresh: `refreshToken`.

#### [NEW] [AuthResponse.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/AuthResponse.java)
- Phản hồi chứa `accessToken`, `refreshToken`, `email`, `role`, và `tokenType = "Bearer"`.

### 3. Business Logic (Auth Module & Shared Security)

#### [NEW] [AuthService.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/service/AuthService.java)
- Chứa logic:
  - `register`: Mã hóa mật khẩu, kiểm tra email trùng, lưu user mới.
  - `login`: Sử dụng `AuthenticationManager` để xác thực, sinh JWT và sinh Refresh Token dạng UUID ngẫu nhiên, lưu vào Redis với thời hạn 7 ngày.
  - `refresh`: Đọc Refresh Token từ Redis, kiểm tra tính hợp lệ, thu hồi token cũ, sinh cặp token mới (Access Token + Refresh Token) và trả về.

#### [NEW] [AuthController.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/controller/AuthController.java)
- Định nghĩa các Rest endpoint:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`

## Verification Plan

### Automated Tests
- Chạy `mvn clean compile` để đảm bảo code không có lỗi cú pháp.

### Manual Verification (DoD Verification)
Sử dụng `curl.exe` gọi trực tiếp các endpoint:

1. **Đăng ký tài khoản STAFF mới**:
   ```bash
   curl.exe -i -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d "{\"fullName\":\"Nguyen Van A\",\"email\":\"staff_auth@shiftsync.com\",\"password\":\"password123\",\"phone\":\"0987654321\",\"systemRole\":\"STAFF\"}"
   ```
   *Kỳ vọng: HTTP 200 OK hoặc 201 Created. Trả về thông tin user đã đăng ký.*

2. **Đăng nhập**:
   ```bash
   curl.exe -i -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"staff_auth@shiftsync.com\",\"password\":\"password123\"}"
   ```
   *Kỳ vọng: HTTP 200 OK. Phản hồi chứa `accessToken` và `refreshToken`.*

3. **Thử truy cập endpoint được bảo vệ bằng accessToken vừa lấy**:
   ```bash
   curl.exe -i -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:8080/api/test/security/staff
   ```
   *Kỳ vọng: HTTP 200 OK.*

4. **Làm mới token (Refresh)**:
   ```bash
   curl.exe -i -X POST http://localhost:8080/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d "{\"refreshToken\":\"<REFRESH_TOKEN>\"}"
   ```
   *Kỳ vọng: HTTP 200 OK. Phản hồi chứa `accessToken` và `refreshToken` mới.*

5. **Thu hồi kiểm tra**: Thử sử dụng lại `<REFRESH_TOKEN>` cũ để làm mới lần nữa.
   ```bash
   curl.exe -i -X POST http://localhost:8080/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d "{\"refreshToken\":\"<REFRESH_TOKEN_CU>\"}"
   ```
   *Kỳ vọng: HTTP 400 Bad Request hoặc 401 Unauthorized (do cơ chế token rotation đã thu hồi token cũ).*
