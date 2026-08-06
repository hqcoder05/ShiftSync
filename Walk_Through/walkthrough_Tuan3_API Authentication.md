# Walkthrough: Authentication API & Exception Handling

Chúng tôi đã triển khai hoàn chỉnh **Authentication API** và **Cơ chế xử lý lỗi tập trung** cho hệ thống **ShiftSync**, tuân thủ kiến trúc Modular Monolith quy định tại `Structure.md`.

---

## Các thay đổi và cấu trúc package đã triển khai

1. **Shared Exception Handling (`com.shiftsync.shared.exception`)**:
   - [BusinessException.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shared/exception/BusinessException.java): Lỗi runtime nghiệp vụ hỗ trợ truyền kèm `HttpStatus`.
   - [GlobalExceptionHandler.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shared/exception/GlobalExceptionHandler.java): Bắt các lỗi `BusinessException`, `MethodArgumentNotValidException` (lỗi validate DTO) và Exception chung khác để trả về định dạng lỗi JSON nhất quán:
     ```json
     {
       "timestamp": "2026-08-04T10:25:01Z",
       "status": 500,
       "error": "Internal Server Error",
       "message": "Chi tiết lỗi..."
     }
     ```

2. **Maven Dependencies**:
   - Bổ sung `spring-boot-starter-validation` vào `pom.xml` để hỗ trợ ràng buộc dữ liệu DTO đầu vào.

3. **Authentication Module (`com.shiftsync.auth`)**:
   - **`auth.dto`**:
     - [RegisterRequest.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/RegisterRequest.java) (validate `@NotBlank`, `@Email`, `@NotNull`).
     - [LoginRequest.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/LoginRequest.java).
     - [RefreshRequest.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/RefreshRequest.java).
     - [AuthResponse.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/dto/AuthResponse.java).
   - **`auth.service`**:
     - [AuthService.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/service/AuthService.java):
       - `register`: Mã hóa mật khẩu BCrypt, kiểm tra email trùng, lưu user mới vào database.
       - `login`: Dùng `AuthenticationManager` xác thực, sinh JWT Access Token qua `JwtTokenProvider` và sinh opaque Refresh Token (UUID ngẫu nhiên) lưu vào Redis với TTL là 7 ngày.
       - `refresh`: Đọc Refresh Token từ Redis, kiểm tra sự tồn tại của User, thực hiện **Token Rotation** (xóa token cũ khỏi Redis, sinh token mới lưu vào Redis) để tăng tính bảo mật.
   - **`auth.controller`**:
     - [AuthController.java](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/auth/controller/AuthController.java): Định nghĩa các endpoint REST:
       - `POST /api/auth/register` (Public)
       - `POST /api/auth/login` (Public)
       - `POST /api/auth/refresh` (Public)

---

## Kết quả kiểm thử & xác thực (DoD)

Chúng tôi sử dụng PowerShell với lệnh `Invoke-RestMethod` để gọi trực tiếp các API đang chạy tại cổng `8080`:

### 1. Đăng ký tài khoản STAFF mới
Lệnh gọi:
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/auth/register -Method Post -ContentType "application/json" -Body '{"fullName":"Nguyen Van A","email":"staff_auth@shiftsync.com","password":"password123","phone":"0987654321","systemRole":"STAFF"}'
```
*Kết quả:* Trả về HTTP 201 Created và thông tin user đã mã hóa mật khẩu:
```yaml
id           : 1466b30e-a37d-4f81-8532-06cc32461040
fullName     : Nguyen Van A
email        : staff_auth@shiftsync.com
phone        : 0987654321
passwordHash : $2a$10$brrAnpE3cyacCMjpK1eD3ezvEXhBPFipdCtzox9b.oGzYJ.a.cHtq
systemRole   : STAFF
```

### 2. Đăng nhập để nhận Token cặp (Access Token + Refresh Token)
Lệnh gọi:
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/auth/login -Method Post -ContentType "application/json" -Body '{"email":"staff_auth@shiftsync.com","password":"password123"}'
```
*Kết quả:* Trả về cặp token và vai trò hệ thống:
```yaml
accessToken  : eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzdGFmZl9hdXRoQHNoaWZ0c3luYy5jb20iLCJyb2xlIjoiU1RBRkYiLCJpYXQiOjE3ODU4MTM5MDksImV4cCI6MTc4NTkwMDMwOX0.v-zm6jyjKdJZy5I77OghY0SUPa1xxO9Dt-6dwoBo9gFqq7EUqVOORssCWQkumn8NPtWnZXYddEI8kaX1NkEDzQ
refreshToken : af8b3543-ea33-41bd-8e89-a3d3bbc980e9
email        : staff_auth@shiftsync.com
role         : STAFF
tokenType    : Bearer
```

### 3. Gọi endpoint được bảo vệ bằng Access Token vừa nhận
Lệnh gọi:
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/test/security/staff -Headers @{ Authorization = "Bearer <ACCESS_TOKEN>" }
```
*Kết quả:* **HTTP 200 OK**
```json
{"message":"Success! You have accessed the STAFF-only endpoint."}
```

### 4. Làm mới token (Refresh Token) và kiểm tra Token Rotation
Lệnh gọi:
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/auth/refresh -Method Post -ContentType "application/json" -Body '{"refreshToken":"af8b3543-ea33-41bd-8e89-a3d3bbc980e9"}'
```
*Kết quả:* Trả về **HTTP 200 OK** kèm cặp token mới (Token Rotation thành công):
```yaml
accessToken  : eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzdGFmZl9hdXRoQHNoaWZ0c3luYy5jb20iLCJyb2xlIjoiU1RBRkYiLCJpYXQiOjE3ODU4MTM5MTYsImV4cCI6MTc4NTkwMDMxNn0...
refreshToken : 6c259abc-0ae7-476e-8b01-c0281ba64421
email        : staff_auth@shiftsync.com
role         : STAFF
```

### 5. Kiểm tra thu hồi (Revocation) token cũ
Lệnh gọi thử dùng lại token cũ `af8b3543-ea33-41bd-8e89-a3d3bbc980e9`:
```powershell
try { Invoke-RestMethod -Uri http://localhost:8080/api/auth/refresh -Method Post -ContentType "application/json" -Body '{"refreshToken":"af8b3543-ea33-41bd-8e89-a3d3bbc980e9"}' } catch { $_.Exception.Response }
```
*Kết quả:* Trả về **HTTP 401 Unauthorized** (Do token cũ đã bị thu hồi khỏi Redis sau khi xoay vòng).
