# Tài liệu Đặc tả API (API Contract) dành cho Frontend

Tài liệu này cung cấp chi tiết định dạng Dữ liệu (Request/Response) của toàn bộ API hiện có, giúp team Frontend tạo Model/Interface (TypeScript) và gọi qua Axios/Fetch một cách chuẩn xác.

---

## 🔹 1. AUTHENTICATION (Xác thực & Phân quyền)
*Base URL: `http://localhost:8080`*
*Lưu ý: Các API này không cần truyền Header Token.*

### 1.1. Đăng ký tài khoản (Register)
- **Endpoint:** `POST /api/auth/register`
- **Request Body:**
```json
{
  "firstName": "Nguyen",
  "lastName": "Van A",
  "email": "nguyenvana@gmail.com",
  "password": "Password@123",
  "phone": "0987654321" // (Có thể bỏ trống)
}
```
- **Response (200 OK):**
```json
{
  "message": "User registered successfully"
}
```

### 1.2. Đăng nhập (Login)
- **Endpoint:** `POST /api/auth/login`
- **Request Body:**
```json
{
  "email": "nguyenvana@gmail.com",
  "password": "Password@123"
}
```
- **Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUz...",
  "refreshToken": "d7a8s7d8a7sd..."
}
```
> **Frontend Note:** Hãy lưu `accessToken` vào LocalStorage hoặc Cookie để truyền vào Header cho các API bên dưới theo định dạng: `Authorization: Bearer <accessToken>`

### 1.3. Làm mới Token (Refresh Token)
- **Endpoint:** `POST /api/auth/refresh`
- **Request Body:**
```json
{
  "refreshToken": "d7a8s7d8a7sd..."
}
```
- **Response (200 OK):** (Trả về token mới)
```json
{
  "accessToken": "eyJhbGciOiJIUz...",
  "refreshToken": "d7a8s7d8a7sd..."
}
```

---

## 🔹 2. USER API (Quản lý Nhân sự)
*Yêu cầu Header: `Authorization: Bearer <accessToken>`*

### 2.1. Lấy danh sách toàn bộ User
- **Endpoint:** `GET /api/users`
- **Response (200 OK):**
```json
[
  {
    "id": 1,
    "firstName": "Nguyen",
    "lastName": "Van A",
    "email": "nguyenvana@gmail.com",
    "phone": "0987654321",
    "systemRole": "STAFF", // Hoặc "MANAGER", "ADMIN"
    "status": "ACTIVE",
    "createdAt": "2026-08-01T10:00:00Z"
  }
]
```

### 2.2. Lấy chi tiết 1 User
- **Endpoint:** `GET /api/users/{id}` (Ví dụ: `/api/users/1`)
- **Response (200 OK):** Cùng object như 2.1

### 2.3. Tạo User mới (Chỉ dành cho ADMIN)
- **Endpoint:** `POST /api/users`
- **Request Body:**
```json
{
  "firstName": "Tran",
  "lastName": "Van B",
  "email": "tranvanb@gmail.com",
  "password": "Password@123",
  "phone": "0123456789",
  "systemRole": "MANAGER",
  "status": "ACTIVE"
}
```
- **Response (201 Created):** Trả về chi tiết User vừa tạo.

### 2.4. Cập nhật thông tin User
- **Endpoint:** `PUT /api/users/{id}`
- **Request Body:** (Giống lúc tạo nhưng bỏ password)
```json
{
  "firstName": "Tran",
  "lastName": "Van B (Updated)",
  "phone": "0123456789",
  "systemRole": "MANAGER",
  "status": "ACTIVE"
}
```
- **Response (200 OK):** Trả về chi tiết User sau khi cập nhật.

### 2.5. Xoá User
- **Endpoint:** `DELETE /api/users/{id}`
- **Response (204 No Content):** Không có body trả về.

---

## 🔹 3. STORE API (Quản lý Cửa hàng)
*Yêu cầu Header: `Authorization: Bearer <accessToken>`*

### 3.1. Lấy danh sách Cửa hàng
- **Endpoint:** `GET /api/stores`
- **Response (200 OK):**
```json
[
  {
    "id": 10,
    "storeCode": "HCM-01",
    "name": "Cửa hàng Quận 1",
    "address": "123 Lê Lợi, Quận 1, TP.HCM",
    "phone": "0281234567",
    "email": "store-q1@shiftsync.com",
    "timezone": "Asia/Ho_Chi_Minh",
    "openTime": "08:00:00",
    "closeTime": "22:00:00",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "status": "ACTIVE"
  }
]
```

### 3.2. Lấy chi tiết 1 Cửa hàng
- **Endpoint:** `GET /api/stores/{id}`
- **Response (200 OK):** Cùng object như 3.1

### 3.3. Tạo Cửa hàng mới
- **Endpoint:** `POST /api/stores`
- **Request Body:**
```json
{
  "storeCode": "HCM-02",
  "name": "Cửa hàng Quận 2",
  "address": "456 Thảo Điền, Quận 2, TP.HCM",
  "phone": "0287654321",
  "email": "store-q2@shiftsync.com",
  "timezone": "Asia/Ho_Chi_Minh",
  "openTime": "07:00:00",
  "closeTime": "23:00:00",
  "latitude": 10.8015,
  "longitude": 106.7408,
  "status": "ACTIVE"
}
```
- **Response (201 Created):** Trả về chi tiết Cửa hàng vừa tạo.

### 3.4. Cập nhật Cửa hàng
- **Endpoint:** `PUT /api/stores/{id}`
- **Request Body:** Tương tự như lúc Tạo mới.
- **Response (200 OK):** Trả về chi tiết Cửa hàng sau cập nhật.

### 3.5. Xoá Cửa hàng
- **Endpoint:** `DELETE /api/stores/{id}`
- **Response (204 No Content):** Không có body.

---
## Cấu trúc Lỗi Chuẩn (Error Response)
Khi Frontend gửi request sai, token hết hạn, hoặc bị từ chối quyền, Backend luôn trả về JSON lỗi chuẩn như sau để Frontend dễ parse:
```json
{
  "timestamp": "2026-08-01T10:05:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired JWT token",
  "path": "/api/users"
}
```
