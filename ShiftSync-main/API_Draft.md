# ShiftSync - Backend API Draft & Security Design

Tài liệu này mô tả kiến trúc phân chia module, danh sách REST API dự kiến và luồng bảo mật của hệ thống ShiftSync.

## 1. Package Structure (Modular Architecture)

Hệ thống áp dụng kiến trúc **Modular Monolith**.


```
com.shiftsync
├── shared/                          # 📦 SHARED MODULE - Dùng chung
│   ├── config/                      # SecurityConfig, RedisConfig, CorsConfig
│   ├── security/                    # JwtTokenProvider, JwtAuthFilter
│   ├── exception/                   # GlobalExceptionHandler, BusinessException
│   ├── dto/                         # ApiResponse, PageResponse, BaseRequest
│   ── utils/                       # DateUtils, GeoUtils (Haversine)
│
├── auth/                            # 🔐 MODULE: AUTHENTICATION
│   ├── controller/                  # AuthController
│   ├── service/                     # AuthService
│   ├── repository/                  # UserRepository
│   └── entity/                      # User
│
├── store/                           # 🏪 MODULE: STORE & CONFIG
│   ├── controller/                  # StoreController
│   ├── service/                     # StoreService, StoreConfigService
│   ├── repository/                  # StoreRepository, StoreConfigRepository
│   └── entity/                      # Store, StoreConfig
│
├── employee/                        # 👥 MODULE: EMPLOYEE & EMPLOYMENT
│   ├── controller/                  # EmployeeController
│   ├── service/                     # EmployeeService, EmploymentService
│   ├── repository/                  # EmployeeRepository, EmploymentRepository
│   └── entity/                      # Employee, Employment
│
├── skill/                           # 🎓 MODULE: SKILL MANAGEMENT
│   ├── controller/                  # SkillController
│   ├── service/                     # SkillService
│   ├── repository/                  # SkillRepository, EmployeeSkillRepository
│   └── entity/                      # Skill, EmployeeSkill
│
├── availability/                    # 📅 MODULE: AVAILABILITY & LEAVE
│   ├── controller/                  # AvailabilityController, LeaveController
│   ├── service/                     # AvailabilityService, LeaveService
│   ├── repository/                  # AvailabilityRepository, LeaveRequestRepository
│   └── entity/                      # Availability, LeaveRequest
│
├── shift/                           #  MODULE: SHIFT MANAGEMENT
│   ├── controller/                  # ShiftController
│   ├── service/                     # ShiftService, ShiftTemplateService
│   ├── repository/                  # ShiftRepository, ShiftRequirementRepository
│   └── entity/                      # Shift, ShiftTemplate, ShiftRequirement
│
├── scheduling/                      #  MODULE: AUTO SCHEDULING (CORE)
│   ├── controller/                  # SchedulingController
│   ├── service/                     # SchedulingService
│   ├── algorithm/                   # HardFilter, SoftScorer, SchedulingContext
│   ├── repository/                  # SchedulingRunRepository, ShiftAssignmentRepository
│   └── entity/                      # ShiftAssignment, SchedulingRun
│
├── marketplace/                     # 🛒 MODULE: MARKETPLACE & SWAP
│   ├── controller/                  # MarketplaceController, SwapController
│   ├── service/                     # MarketplaceService, SwapService
│   ├── repository/                  # OpenShiftRepository, SwapRequestRepository
│   └── entity/                      # SwapRequest
│
├── attendance/                      # 📍 MODULE: ATTENDANCE
│   ├── controller/                  # AttendanceController
│   ├── service/                     # AttendanceService, AdjustmentService
│   ├── repository/                  # AttendanceRepository, AdjustmentRepository
│   ── entity/                      # Attendance, AttendanceAdjustmentRequest
│
├── payroll/                         # 💰 MODULE: PAYROLL
│   ├── controller/                  # PayrollController
│   ├── service/                     # PayrollService, PayrollPeriodService
│   ├── repository/                  # PayrollRepository, PayrollPeriodRepository
│   └── entity/                      # Payroll, PayrollPeriod
│
├── notification/                    # 🔔 MODULE: NOTIFICATION
│   ├── service/                     # NotificationService, FcmService
│   ├── repository/                  # NotificationRepository
│   └── entity/                      # Notification
│
└── dashboard/                       #  MODULE: DASHBOARD
    ├── controller/                  # DashboardController
    └── service/                     # DashboardService
```

## 2. REST API List

### Module 1. Authentication

**Quy ước chung**

- Base URL: `/api/v1`
- Format response: bọc trong `ApiResponse<T>` (chuẩn hoá `success`, `data`, `message`, `errorCode`)
- Auth: Bearer JWT trong header `Authorization: Bearer <access_token>`, trừ các endpoint public được đánh dấu 🔓
- Phân quyền theo role: `OWNER`, `MANAGER`, `EMPLOYEE` (ghi trong cột "Role")
- Pagination: query param `page`, `size`, `sort` cho các API list, trả về `PageResponse<T>`

---

## 1. Module: Authentication (`/api/v1/auth`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 1 | POST | `/api/v1/auth/register` 🔓 | Đăng ký tài khoản mới (Owner tạo tổ chức, hoặc Employee được invite) | Public |
| 2 | POST | `/api/v1/auth/login` 🔓 | Đăng nhập, trả về access token + refresh token | Public |
| 3 | POST | `/api/v1/auth/refresh` 🔓 | Cấp lại access token mới từ refresh token hợp lệ | Public (yêu cầu refresh token) |
| 4 | POST | `/api/v1/auth/logout` | Thu hồi refresh token hiện tại (đăng xuất 1 thiết bị) | Authenticated |
| 5 | POST | `/api/v1/auth/logout-all` | Thu hồi toàn bộ refresh token của user (đăng xuất mọi thiết bị) | Authenticated |
| 6 | GET | `/api/v1/auth/me` | Lấy thông tin user hiện tại từ access token | Authenticated |
| 7 | POST | `/api/v1/auth/change-password` | Đổi mật khẩu (yêu cầu mật khẩu cũ) | Authenticated |
| 8 | POST | `/api/v1/auth/forgot-password` 🔓 | Gửi email/OTP khôi phục mật khẩu | Public |
| 9 | POST | `/api/v1/auth/reset-password` 🔓 | Đặt lại mật khẩu bằng token khôi phục | Public |

## 2. Module: Store & Config (`/api/v1/stores`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 10 | POST | `/api/v1/stores` | Tạo cửa hàng/chi nhánh mới | Owner |
| 11 | GET | `/api/v1/stores` | Danh sách cửa hàng thuộc tổ chức | Owner, Manager |
| 12 | GET | `/api/v1/stores/{storeId}` | Chi tiết một cửa hàng | Owner, Manager |
| 13 | PUT | `/api/v1/stores/{storeId}` | Cập nhật thông tin cửa hàng (địa chỉ, giờ mở cửa, geofence) | Owner, Manager |
| 14 | DELETE | `/api/v1/stores/{storeId}` | Xoá/ngưng hoạt động cửa hàng | Owner |
| 15 | GET | `/api/v1/stores/{storeId}/config` | Lấy cấu hình xếp lịch của cửa hàng (rule, ràng buộc) | Owner, Manager |
| 16 | PUT | `/api/v1/stores/{storeId}/config` | Cập nhật cấu hình (max giờ/tuần, min nghỉ giữa ca, trọng số...) | Owner, Manager |

## 3. Module: Employee & Employment (`/api/v1/employees`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 17 | POST | `/api/v1/employees` | Thêm nhân viên mới / gửi lời mời tham gia | Owner, Manager |
| 18 | GET | `/api/v1/employees` | Danh sách nhân viên (filter theo store, status) | Owner, Manager |
| 19 | GET | `/api/v1/employees/{employeeId}` | Chi tiết hồ sơ nhân viên | Owner, Manager, Employee (chính mình) |
| 20 | PUT | `/api/v1/employees/{employeeId}` | Cập nhật hồ sơ nhân viên | Owner, Manager |
| 21 | DELETE | `/api/v1/employees/{employeeId}` | Ngưng hợp tác / vô hiệu hoá nhân viên | Owner, Manager |
| 22 | POST | `/api/v1/employees/{employeeId}/employments` | Gán nhân viên vào cửa hàng (hợp đồng làm việc) | Owner, Manager |
| 23 | GET | `/api/v1/employees/{employeeId}/employments` | Danh sách các employment của nhân viên | Owner, Manager |

## 4. Module: Skill Management (`/api/v1/skills`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 24 | POST | `/api/v1/skills` | Tạo loại kỹ năng mới (VD: pha chế, thu ngân) | Owner, Manager |
| 25 | GET | `/api/v1/skills` | Danh sách kỹ năng của tổ chức | Owner, Manager |
| 26 | PUT | `/api/v1/skills/{skillId}` | Cập nhật kỹ năng | Owner, Manager |
| 27 | DELETE | `/api/v1/skills/{skillId}` | Xoá kỹ năng | Owner, Manager |
| 28 | POST | `/api/v1/employees/{employeeId}/skills` | Gán kỹ năng + mức độ thành thạo cho nhân viên | Owner, Manager |
| 29 | DELETE | `/api/v1/employees/{employeeId}/skills/{skillId}` | Gỡ kỹ năng khỏi nhân viên | Owner, Manager |

## 5. Module: Availability & Leave (`/api/v1/availability`, `/api/v1/leaves`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 30 | POST | `/api/v1/employees/{employeeId}/availability` | Khai báo khung giờ rảnh trong tuần | Employee, Manager |
| 31 | GET | `/api/v1/employees/{employeeId}/availability` | Xem khung giờ rảnh của nhân viên | Owner, Manager, Employee (chính mình) |
| 32 | PUT | `/api/v1/availability/{availabilityId}` | Cập nhật khung giờ rảnh | Employee, Manager |
| 33 | POST | `/api/v1/leaves` | Tạo đơn xin nghỉ phép | Employee |
| 34 | GET | `/api/v1/leaves` | Danh sách đơn nghỉ phép (filter theo store, status) | Owner, Manager |
| 35 | PUT | `/api/v1/leaves/{leaveId}/approve` | Duyệt đơn nghỉ phép | Owner, Manager |
| 36 | PUT | `/api/v1/leaves/{leaveId}/reject` | Từ chối đơn nghỉ phép | Owner, Manager |

## 6. Module: Shift Management (`/api/v1/shifts`, `/api/v1/shift-templates`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 37 | POST | `/api/v1/shift-templates` | Tạo mẫu ca làm việc (giờ bắt đầu/kết thúc, vị trí) | Owner, Manager |
| 38 | GET | `/api/v1/shift-templates` | Danh sách mẫu ca | Owner, Manager |
| 39 | POST | `/api/v1/stores/{storeId}/shift-requirements` | Khai báo nhu cầu nhân sự theo ca (số lượng, kỹ năng yêu cầu) | Owner, Manager |
| 40 | GET | `/api/v1/stores/{storeId}/shift-requirements` | Xem nhu cầu nhân sự theo khoảng thời gian | Owner, Manager |
| 41 | GET | `/api/v1/shifts` | Danh sách ca làm việc thực tế (đã publish) | Owner, Manager, Employee |
| 42 | GET | `/api/v1/shifts/{shiftId}` | Chi tiết một ca làm việc | Owner, Manager, Employee |

## 7. Module: Auto Scheduling - Core (`/api/v1/scheduling`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 43 | POST | `/api/v1/scheduling/runs` | Khởi chạy thuật toán xếp lịch tự động (CSP + weighted scoring) cho 1 khoảng thời gian | Owner, Manager |
| 44 | GET | `/api/v1/scheduling/runs/{runId}` | Trạng thái & kết quả 1 lần chạy xếp lịch (đang chạy/hoàn tất/lỗi) | Owner, Manager |
| 45 | GET | `/api/v1/scheduling/runs/{runId}/assignments` | Danh sách phân công ca (draft) sinh ra từ run | Owner, Manager |
| 46 | PUT | `/api/v1/scheduling/assignments/{assignmentId}` | Chỉnh tay 1 phân công ca (override thuật toán) | Owner, Manager |
| 47 | POST | `/api/v1/scheduling/runs/{runId}/publish` | Công bố lịch (chuyển draft → chính thức, trigger notification) | Owner, Manager |

## 8. Module: Marketplace & Swap (`/api/v1/marketplace`, `/api/v1/swaps`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 48 | POST | `/api/v1/marketplace/open-shifts` | Đăng ca trống lên chợ ca (open shift marketplace) | Employee, Manager |
| 49 | GET | `/api/v1/marketplace/open-shifts` | Danh sách ca trống có thể nhận | Employee |
| 50 | POST | `/api/v1/marketplace/open-shifts/{id}/claim` | Nhận một ca trống | Employee |
| 51 | POST | `/api/v1/swaps` | Tạo yêu cầu đổi ca với nhân viên khác | Employee |
| 52 | PUT | `/api/v1/swaps/{swapId}/accept` | Đồng ý đổi ca (phía đối tác) | Employee |
| 53 | PUT | `/api/v1/swaps/{swapId}/approve` | Quản lý duyệt yêu cầu đổi ca | Owner, Manager |

## 9. Module: Attendance (`/api/v1/attendance`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 54 | POST | `/api/v1/attendance/check-in` | Chấm công vào ca (kèm GPS/geofence validate) | Employee |
| 55 | POST | `/api/v1/attendance/check-out` | Chấm công ra ca | Employee |
| 56 | GET | `/api/v1/attendance` | Lịch sử chấm công (filter theo nhân viên, khoảng ngày) | Owner, Manager, Employee (chính mình) |
| 57 | POST | `/api/v1/attendance/{attendanceId}/adjustments` | Gửi yêu cầu điều chỉnh giờ chấm công | Employee |
| 58 | PUT | `/api/v1/attendance/adjustments/{id}/approve` | Duyệt yêu cầu điều chỉnh | Owner, Manager |

## 10. Module: Payroll (`/api/v1/payroll`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 59 | POST | `/api/v1/payroll/periods` | Tạo kỳ lương mới | Owner, Manager |
| 60 | POST | `/api/v1/payroll/periods/{periodId}/calculate` | Tính lương tự động từ dữ liệu chấm công | Owner, Manager |
| 61 | GET | `/api/v1/payroll/periods/{periodId}` | Chi tiết kỳ lương và bảng lương từng nhân viên | Owner, Manager |
| 62 | GET | `/api/v1/employees/{employeeId}/payrolls` | Lịch sử lương của một nhân viên | Owner, Manager, Employee (chính mình) |

## 11. Module: Notification (`/api/v1/notifications`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 63 | GET | `/api/v1/notifications` | Danh sách thông báo của user hiện tại | Authenticated |
| 64 | PUT | `/api/v1/notifications/{id}/read` | Đánh dấu đã đọc | Authenticated |
| 65 | POST | `/api/v1/notifications/device-token` | Đăng ký FCM device token để nhận push notification | Authenticated |

## 12. Module: Dashboard (`/api/v1/dashboard`)

| # | Method | Path | Mô tả | Role |
|---|--------|------|-------|------|
| 66 | GET | `/api/v1/dashboard/overview` | Số liệu tổng quan (số ca chưa xếp, chi phí lương dự kiến, tỉ lệ phủ ca) | Owner, Manager |
| 67 | GET | `/api/v1/dashboard/coverage` | Biểu đồ độ phủ ca theo thời gian | Owner, Manager |

**Tổng cộng: 67 endpoints** trải trên 12 module — đáp ứng yêu cầu ≥20 endpoint.

---

## 13. Security Flow: JWT Issue - Verify - Refresh

### 13.1 Nguyên tắc thiết kế

- **Access Token**: JWT, thời hạn ngắn (15 phút), chứa `userId`, `role`, `storeIds` (claims), ký bằng thuật toán `HS256` (hoặc `RS256` nếu tách biệt auth service sau này).
- **Refresh Token**: chuỗi ngẫu nhiên (opaque token), thời hạn dài (7-30 ngày), lưu **hash** (không lưu plaintext) trong bảng `refresh_tokens` (PostgreSQL) kèm `deviceId`, `expiresAt`, `revokedAt` — hỗ trợ thu hồi từng thiết bị.
- **Redis**: dùng làm blacklist cho access token bị thu hồi sớm (VD: logout, đổi mật khẩu) — access token được kiểm tra thêm ở Redis trước khi coi là hợp lệ, tồn tại đến khi token hết hạn tự nhiên (TTL = thời gian còn lại của token).
- **Rotation**: mỗi lần refresh, refresh token cũ bị thu hồi (revoke) và cấp refresh token mới (refresh token rotation) để giảm rủi ro token bị đánh cắp và tái sử dụng.

### 13.2 Luồng Issue (Login)

```
Client                     AuthController              AuthService            DB / Redis
  |  POST /auth/login          |                            |                      |
  |  {email, password}         |                            |                      |
  |---------------------------->|                            |                      |
  |                             |  validate(email, pass)     |                      |
  |                             |---------------------------->|                      |
  |                             |                            |  SELECT user WHERE   |
  |                             |                            |  email = ?           |
  |                             |                            |--------------------->|
  |                             |                            |<---------------------|
  |                             |                            | verify BCrypt(pass)  |
  |                             |                            |                      |
  |                             |                            | generate AccessToken |
  |                             |                            | (JWT, exp=15m)       |
  |                             |                            |                      |
  |                             |                            | generate RefreshToken|
  |                             |                            | (random 256-bit)     |
  |                             |                            | hash + INSERT        |
  |                             |                            | refresh_tokens       |
  |                             |                            |--------------------->|
  |                             |<----------------------------|                      |
  |  200 OK                    |                            |                      |
  |  {accessToken, refreshToken}|                           |                      |
  |<----------------------------|                            |                      |
```

### 13.3 Luồng Verify (mỗi request cần auth)

```
Client                JwtAuthFilter                      Redis                  SecurityContext
  |  Request + Header           |                            |                        |
  |  Authorization: Bearer <AT> |                            |                        |
  |----------------------------->|                            |                        |
  |                              | 1. Parse & verify chữ ký    |                        |
  |                              |    JWT (HS256), check exp   |                        |
  |                              |                            |                        |
  |                              | 2. Kiểm tra blacklist       |                        |
  |                              |    GET blacklist:{jti}      |                        |
  |                              |----------------------------->|                        |
  |                              |<-----------------------------|                        |
  |                              | 3. Nếu hợp lệ & không bị     |                        |
  |                              |    blacklist:                |                        |
  |                              |    set Authentication        |                        |
  |                              |------------------------------------------------------>|
  |                              | 4. Nếu invalid/expired:      |                        |
  |                              |    trả 401 Unauthorized      |                        |
  |<------------------------------|                            |                        |
  |  Request tiếp tục vào Controller (nếu hợp lệ)               |                        |
```

### 13.4 Luồng Refresh (cấp lại Access Token)

```
Client                   AuthController               AuthService              DB
  |  POST /auth/refresh        |                            |                    |
  |  {refreshToken}            |                            |                    |
  |---------------------------->|                            |                    |
  |                             |  refresh(token)            |                    |
  |                             |---------------------------->|                    |
  |                             |                            | hash(token)        |
  |                             |                            | SELECT WHERE       |
  |                             |                            | hash=? AND         |
  |                             |                            | revokedAt IS NULL  |
  |                             |                            | AND expiresAt>now  |
  |                             |                            |------------------->|
  |                             |                            |<--------------------|
  |                             |                            | nếu KHÔNG tìm thấy  |
  |                             |                            | hoặc hết hạn:       |
  |                             |                            | -> 401, yêu cầu     |
  |                             |                            |    đăng nhập lại    |
  |                             |                            |                     |
  |                             |                            | nếu hợp lệ:         |
  |                             |                            | 1. REVOKE token cũ  |
  |                             |                            |    (rotation)       |
  |                             |                            |------------------->|
  |                             |                            | 2. Generate mới:    |
  |                             |                            |    AccessToken +    |
  |                             |                            |    RefreshToken     |
  |                             |                            | 3. INSERT refresh   |
  |                             |                            |    token mới        |
  |                             |                            |------------------->|
  |                             |<----------------------------|                    |
  |  200 OK                    |                            |                    |
  |  {accessToken, refreshToken}|                           |                    |
  |<----------------------------|                            |                    |
```

### 13.5 Luồng Revoke (Logout / Đổi mật khẩu)

```
Client                AuthController           AuthService         Redis          DB
  |  POST /auth/logout      |                       |                |             |
  |------------------------->|                       |                |             |
  |                          | logout(accessToken,   |                |             |
  |                          |        refreshToken)  |                |             |
  |                          |----------------------->|                |             |
  |                          |                       | 1. Thêm jti của |             |
  |                          |                       |    accessToken  |             |
  |                          |                       |    vào blacklist|             |
  |                          |                       |    (TTL = exp   |             |
  |                          |                       |    còn lại)     |             |
  |                          |                       |--------------->|             |
  |                          |                       | 2. Revoke       |             |
  |                          |                       |    refreshToken |             |
  |                          |                       |    trong DB     |             |
  |                          |                       |--------------------------->|  |
  |                          |<-----------------------|                |             |
  |  204 No Content         |                       |                |             |
  |<--------------------------|                       |                |             |
```

### 13.6 Điểm bảo mật bổ sung

- **Password hashing**: BCrypt (cost factor ≥ 10), không bao giờ log hoặc trả plaintext password.
- **Refresh token theo thiết bị**: mỗi lần login trên thiết bị mới tạo 1 bản ghi `refresh_tokens` riêng — cho phép `logout-all` (revoke toàn bộ) hoặc quản lý phiên đăng nhập theo thiết bị.
- **Chống refresh token reuse**: nếu 1 refresh token đã bị revoke nhưng vẫn được dùng để gọi `/auth/refresh` → nghi ngờ bị đánh cắp, hệ thống tự động revoke toàn bộ token của user và yêu cầu đăng nhập lại.
- **CORS & CSRF**: token truyền qua header `Authorization`, không dùng cookie cho access token → giảm rủi ro CSRF; cấu hình CORS whitelist domain frontend cụ thể (không dùng `*`).
- **Rate limiting**: giới hạn số lần gọi `/auth/login` và `/auth/refresh` theo IP/email (VD: Redis-based sliding window) để chống brute-force.
- **RBAC**: `JwtAuthFilter` set `Authentication` với `GrantedAuthority` từ claim `role`; các endpoint dùng `@PreAuthorize("hasRole('MANAGER')")` hoặc method-level check quyền theo `storeId` (đa cửa hàng).