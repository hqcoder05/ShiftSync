# Auth API Test Report — ShiftSync
Người test: Duyên | Ngày: 09/08/2026 | Công cụ: Postman

| # | Test case | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Register hợp lệ | email test01@shiftsync.com | 201 | 201 Created | Pass |
| 2 | Register email trùng | email test01@shiftsync.com (đã tồn tại) | 409 | 409 Conflict - "Email already exists" | Pass |
| 3 | Register email sai định dạng | email "abc.com" | 400 | 400 Bad Request - "Invalid email format" | Pass |
| 4 | Register thiếu password | không có field password | 400 | 400 Bad Request - "Password is required" | Pass |
| 5 | Login đúng | test01@shiftsync.com / password123 | 200 + token | 200 OK + accessToken, refreshToken | Pass |
| 6 | Login sai password | test01@shiftsync.com / sai123 | 401 | 401 Unauthorized - "Invalid email or password" | Pass |
| 7 | Login email không tồn tại | khongton@shiftsync.com | 401 | 401 Unauthorized - "Invalid email or password" | Pass |
| 8 | Refresh token hợp lệ | refreshToken thật từ case 5 | 200 + token mới | 200 OK + accessToken, refreshToken mới | Pass |
| 9 | Refresh token sai | chuỗi rác "abc-rac-123" | 401 | 401 Unauthorized - "Invalid or expired refresh token" | Pass |

**Kết quả: 9/9 test case Pass (100%). Không phát hiện bug.**

# Test Report — Tuần 4 (CRUD 4 module: Employee, Role, Availability, Store)

**Người test:** Duyên (UX/UI)
**Ngày test:** 19-20/08/2026
**Công cụ:** Swagger UI (`http://localhost:8080/swagger-ui.html`) + kiểm tra đồng bộ trên Web (`localhost:5173`)
**Tài khoản test:** `admin_duyen@gmail.com` (role ADMIN)

---

## 1. Module Employee (`/api/users`)

| # | Test case | Bước thực hiện | Kết quả mong đợi | Kết quả | Ghi chú |
|---|---|---|---|---|---|
| E1 | Tạo Employee hợp lệ | `POST /api/users` (role ADMIN), đủ field gồm `systemRole` | 201, có `id` | **Pass** | Field `systemRole` là bắt buộc, không có mặc định như `/auth/register`. Tài khoản role STAFF gọi API này bị chặn 403 — đúng theo phân quyền, chỉ ADMIN được tạo user |
| E2 | Tạo Employee thiếu field bắt buộc | `POST /api/users` thiếu `systemRole` | 400, báo rõ field lỗi | **Pass** | Response: `"systemRole": "System role is required"` |
| E3 | Tạo Employee trùng email | *(chưa test)* | 409 Conflict | **Chưa test** | Cần bổ sung |
| E4 | Xem danh sách Employee | `GET /api/users?page=0&size=20` | 200, đúng danh sách | **Pass** | Trả đúng 3 user thật trong hệ thống |
| E5 | Sửa thông tin Employee | `PUT /api/users/{id}` với đủ field (`fullName`, `email`, `phone`, `password`) | 200, dữ liệu cập nhật đúng | **Pass** | API yêu cầu **đầy đủ field kể cả `email`** khi PUT, không cho sửa thiếu (partial update không được hỗ trợ) |
| E6 | Sửa Employee không tồn tại | `PUT /api/users/{id}` với id giả `00000000-0000-0000-0000-000000000000` | 404 | **Pass** | Response: `"User not found with id: ..."` |
| E7 | Xoá Employee | `DELETE /api/users/{id}` | 200/204 | **Pass** | 204 No Content |
| E8 | Kiểm tra đồng bộ giao diện Web | Vào `/employees` bằng tài khoản ADMIN | Bảng hiển thị đúng dữ liệu mới nhất | **Pass** | ⚠️ Tài khoản STAFF bị lỗi 403 khi vào trang này — đúng theo phân quyền (chỉ ADMIN quản lý được Employee), không phải bug |

**Employee: 6/8 Pass, 1 chưa test (E3), 0 Fail**

---

## 2. Module Role

> ⚠️ **Không test được** — Role UI (trang quản lý Role, gán quyền) và API tương ứng **chưa được xây dựng** ở Tuần 4. Danh sách API Swagger thật (đã đối chiếu đầy đủ 16 nhóm API) xác nhận **không có nhóm "Role"/"Permission"** nào tồn tại trên Backend. Sẽ bổ sung bảng test case ngay khi Role UI + API sẵn sàng.

---

## 3. Module Availability (`/api/availability`)

| # | Test case | Bước thực hiện | Kết quả mong đợi | Kết quả | Ghi chú |
|---|---|---|---|---|---|
| A1 | Đăng ký khung giờ rảnh hợp lệ | `POST /api/availability` `{dayOfWeek:1, startTime:"06:00", endTime:"14:00"}` | 201, có `id` | **Pass** | |
| A2 | Giờ kết thúc trước giờ bắt đầu | `startTime:"14:00", endTime:"06:00"` | 400 | **Pass** | Message: "End time must be strictly after start time" |
| A3 | `dayOfWeek` sai giá trị | `dayOfWeek: 9` | 400 | **Pass** | Message: "Day of week must be between 0 (Sunday) and 6 (Saturday)" |
| A4 | Xem danh sách khung giờ rảnh | `GET /api/availability` | 200, đúng bản ghi | **Pass** | |
| A5 | Gọi API không có token | `GET /api/availability` không có Authorization header | 401 | **Pass*** | *Backend trả **403** thay vì 401 — không phải bug nghiêm trọng, chỉ là lệch quy ước HTTP status. Ghi nhận để trao đổi với Backend nếu cần chuẩn hoá |
| A6 | Xoá khung giờ rảnh | `DELETE /api/availability/{id}` | 200/204 | **Pass** | 204 No Content |
| A7 | Kiểm tra đồng bộ giao diện Mobile | Vào màn Availability trên điện thoại | Dữ liệu hiển thị đúng | **Chưa test** | Cần kiểm tra lại trên app Mobile thật |

**Availability: 6/7 Pass, 1 chưa test (A7), 0 Fail**

---

## 4. Module Store (`/api/stores`)

| # | Test case | Bước thực hiện | Kết quả mong đợi | Kết quả | Ghi chú |
|---|---|---|---|---|---|
| S1 | Tạo Store hợp lệ | `POST /api/stores` đủ field | 201, có `id` | **Pass** | |
| S2 | Tạo Store thiếu field bắt buộc | `"name": ""` | 400 | **Pass** | Message: "Store name is required" |
| S3 | Xem danh sách Store | `GET /api/stores?page=0&size=20` | 200, đúng dữ liệu | **Pass** | Trả đúng danh sách thật |
| S4 | Sửa Store | `PUT /api/stores/{id}` đổi `closeTime` | 200 | **Pass** | |
| S5 | Xoá Store | `DELETE /api/stores/{id}` (Store không có nhân viên) | 200/204 | **Pass** | 204 No Content |
| S6 | Xoá Store đang có Employee gán vào | Gán 1 Employee vào Store (`POST /api/stores/{storeId}/staff`), sau đó `DELETE /api/stores/{id}` | 400/409 (chặn xoá) | **Pass** | 409 Conflict, message: "Cannot delete Store because it has related records (employment, shifts, etc.)" — đúng thiết kế bảo vệ dữ liệu |
| S7 | Kiểm tra đồng bộ giao diện Web | Vào `/stores`, F5 | Danh sách khớp API | **Pass** | Khớp chính xác 6 Store hiển thị đúng theo `GET /api/stores` |

**Store: 7/7 Pass, 0 Fail**

---

## Bug ghi nhận

| Mức độ | Mô tả bug | Bước tái hiện | Ngày phát hiện | Đã báo Bạn (Backend) | Trạng thái |
|---|---|---|---|---|---|
| **High** | `GET /api/stores` (và tương tự `GET /api/users`) trả về lỗi **500 Internal Server Error** khi tham số `pageable.sort` sai định dạng (VD gửi `["string"]`), thay vì trả **400 Bad Request**. API không nên bao giờ trả 500 vì lỗi input của người dùng — phải validate và trả lỗi 4xx rõ ràng | 1. Mở Swagger `GET /api/stores` 2. Điền `pageable: {"sort": ["string"], "page": 1073741824, "size": 1073741824}` 3. Execute | 19/08/2026 | Chưa | Đang chờ |
| Low (ghi chú) | `GET /api/availability` không có token trả về **403** thay vì **401** theo chuẩn REST thông thường | 1. Logout khỏi Swagger 2. Gọi `GET /api/availability` không có Authorization header | 19/08/2026 | Chưa | Cần xác nhận với Bạn có cố ý hay không |

**Quy ước mức độ ưu tiên:**
- **Critical**: Sập app/API, mất dữ liệu, không dùng được chức năng chính
- **High**: Sai dữ liệu, sai logic nghiệp vụ, nhưng không sập app
- **Low**: Lỗi hiển thị nhỏ, chính tả, UX chưa mượt

---

## Tổng kết

| Module | Pass | Fail | Chưa test | Tổng |
|---|---|---|---|---|
| Employee | 6 | 0 | 2 (E3) | 8 |
| Role | 0 | 0 | — (chưa có UI/API) | — |
| Availability | 6 | 0 | 1 (A7) | 7 |
| Store | 7 | 0 | 0 | 7 |
| **Tổng** | **19** | **0** | **3** | **22** |

- **Số bug phát hiện: 2** (1 mức High, 1 ghi chú cần xác nhận)
- **Việc còn thiếu:** E3 (test trùng email), A7 (kiểm tra đồng bộ Mobile), toàn bộ module Role (chưa có UI/API)