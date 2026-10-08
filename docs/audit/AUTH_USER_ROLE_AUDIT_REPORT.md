# 1. Scope
The audit covers the authentication and authorization mechanisms of the ShiftSync backend, focusing on:
- JWT generation, validation, and refresh logic
- User registration, login, and logout flows
- User lifecycle management (CRUD, soft-delete, role assignment)
- Role-Based Access Control (RBAC) and data isolation (cross-user, cross-store access)
- Exception handling and edge cases around concurrent access

# 2. Files/classes đã audit
- `com.shiftsync.shared.config.SecurityConfig`
- `com.shiftsync.shared.security.JwtAuthFilter`
- `com.shiftsync.shared.security.JwtTokenProvider`
- `com.shiftsync.shared.security.CustomUserDetails`
- `com.shiftsync.shared.security.CustomUserDetailsService`
- `com.shiftsync.shared.security.StoreAccessService`
- `com.shiftsync.auth.controller.AuthController`
- `com.shiftsync.auth.controller.UserController`
- `com.shiftsync.auth.service.AuthService`
- `com.shiftsync.auth.service.UserService`
- `com.shiftsync.auth.entity.User`
- `com.shiftsync.shared.exception.GlobalExceptionHandler`

# 3. Authentication flow thực tế
- **Login:** Thực hiện qua `AuthController.login`. `AuthenticationManager` gọi `CustomUserDetailsService` để fetch user (đã loại trừ deleted users nhờ `@SQLRestriction`). Nếu đúng, `JwtTokenProvider` cấp 1 JWT Access Token (stateless) và 1 Refresh Token (random UUID) lưu vào Redis (TTL 7 ngày).
- **Validation:** `JwtAuthFilter` kiểm tra header `Authorization`. Nếu hợp lệ, lấy email query DB qua `loadUserByUsername` để cấp SecurityContext. Filter chặn các token bị blacklist (logout) hoặc là QR Token. Nếu user bị soft-delete giữa chừng, filter không ném exception mà bỏ qua auth context -> Spring Security sẽ ném 401.
- **Refresh:** `AuthService.refresh` lấy email từ Redis dựa vào refresh token cũ, check user DB, xoá refresh token cũ (Token Rotation), cấp cặp token mới.
- **Logout:** Lưu access token vào Redis (như một blacklist) với TTL là thời gian sống còn lại của token. Xóa refresh token tương ứng.

# 4. Authorization flow thực tế
- SecurityConfig sử dụng `anyRequest().authenticated()`.
- RBAC được áp dụng ở Controller bằng `@PreAuthorize("hasRole('...')")`.
- Isolation theo Store: `UserService` có logic kiểm tra `targetStoreId` đối với MANAGER khi tạo mới user hoặc list user. Logic này đảm bảo MANAGER chỉ thao tác với Store mình quản lý. `StoreAccessService` cung cấp method check Store cho các domain khác.
- Tuy nhiên, sự uỷ quyền (Authorization) bị thiếu sót nghiêm trọng trong quá trình Cập nhật User (Update) và Lấy thông tin (Get).

# 5. User lifecycle
- **Create:** ADMIN/MANAGER có thể tạo user. MANAGER chỉ tạo được STAFF và gán vào Store họ quản lý. Registration public endpoint `/api/auth/register` tạo STAFF không thuộc Store nào (tiềm ẩn lỗi logic về sau nếu domain khác yêu cầu Employment).
- **Update:** Cho phép cập nhật profile, avatar, password. Không cho phép cập nhật Role (DTO không có trường `systemRole`).
- **Delete:** Chỉ ADMIN được xoá. Xoá là Soft Delete. `UserRepository` kiểm tra các ràng buộc (sole manager, active employments, future shifts) trước khi xoá.

# 6. Role/permission matrix
- `ADMIN`: Quản trị toàn hệ thống. Có quyền gọi tất cả CRUD user.
- `MANAGER`: Quản lý store. Được list staff, tạo staff thuộc store của mình.
- `STAFF`: Nhân viên. Không có quyền truy cập CRUD user (trừ `/me`).

# 7. Exception/status audit
- Các exception như `UsernameNotFoundException` hay `JwtException` bị nuốt trong `JwtAuthFilter` nhưng an toàn vì SecurityContext không được set, dẫn đến `401 Unauthorized` từ `AuthenticationEntryPoint`.
- Race condition tạo user trùng email được handle bằng `DataIntegrityViolationException` mapping ra 409 Conflict ở `GlobalExceptionHandler`.
- `BusinessException` được map đúng status.

# 8. Security boundary audit
- **Bypass/IDOR:** API PUT và GET User bị lỗi uỷ quyền ở service, cho phép MANAGER sửa thông tin ADMIN hoặc STAFF bất kỳ.
- **Data Leakage:** API GET không có `@PreAuthorize` làm rò rỉ profile.
- **Stale Sessions:** Việc đổi password không thu hồi token.

# 9. State transition audit
- Hệ thống không hỗ trợ đổi Role (chỉ có tạo mới).
- Soft delete vô hiệu hoá tài khoản ngay lập tức vì `JwtAuthFilter` query DB mỗi request.

# 10. Concurrency/race conditions
- Token rotation trong Refresh bị race condition vì thao tác Get và Delete không atomic.

# 11. Test scenarios chưa được kiểm chứng
- Đăng nhập nhiều thiết bị: Hoạt động bình thường nhưng khi đổi pass ở thiết bị A, thiết bị B vẫn giữ quyền.

# 12. Findings

### Finding 1
**ID:** AUTH-001
**Severity:** CRITICAL
**Category:** AUTHORIZATION / SECURITY
**File:** `UserController.java`, `UserService.java`
**Class:** `UserController`, `UserService`
**Method:** `updateUser`
**Line:** `UserController:130`, `UserService:252`
**Trigger:** MANAGER gọi `PUT /api/users/{admin_id}` với payload đổi mật khẩu hoặc email.
**Expected:** Hệ thống trả về 403 Forbidden do MANAGER không được phép chỉnh sửa ADMIN hoặc STAFF khác store.
**Actual:** Hệ thống cập nhật thành công mật khẩu/email của mục tiêu.
**Root cause:** `UserController` chỉ kiểm tra `@PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")`. `UserService` không có logic xác minh quyền sở hữu (`actorId` và `actorRole`) đối với `id` truyền vào.
**Evidence:** `UserService.updateUser` không nhận `actorDetails` nên không thể check quyền, dẫn đến Privilege Escalation (IDOR).
**Impact:** MANAGER có thể đổi mật khẩu của ADMIN và chiếm quyền toàn hệ thống.
**Recommended fix:** Truyền `actorDetails` vào `UserService.updateUser`. Kiểm tra nếu actor là MANAGER, chỉ cho phép cập nhật user thuộc Store của mình VÀ user đó có role là STAFF. Nếu không, ném `HttpStatus.FORBIDDEN`.
**Regression risk:** LOW. Chỉ thay đổi logic phân quyền nội bộ.

### Finding 2
**ID:** AUTH-002
**Severity:** MEDIUM
**Category:** AUTHORIZATION
**File:** `UserController.java`
**Class:** `UserController`
**Method:** `getUserById`
**Line:** `UserController:107`
**Trigger:** STAFF gửi `GET /api/users/{id_cua_manager_hoac_staff_khac}`.
**Expected:** Hệ thống trả về 403 Forbidden.
**Actual:** Hệ thống trả về 200 OK cùng với UserDTO (email, phone, systemRole).
**Root cause:** Thiếu annotation `@PreAuthorize`.
**Evidence:** Endpoint `getUserById` hoàn toàn trống `@PreAuthorize`, mọi authenticated user đều có thể gọi (BOLA/IDOR).
**Impact:** Rò rỉ thông tin cá nhân (PII) giữa các user.
**Recommended fix:** Thêm `@PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")` nếu API chỉ dành cho cấp quản lý.
**Regression risk:** LOW.

### Finding 3
**ID:** AUTH-003
**Severity:** HIGH
**Category:** SECURITY
**File:** `UserService.java`
**Class:** `UserService`
**Method:** `updateUser`
**Line:** `UserService:271`
**Trigger:** Đổi mật khẩu tài khoản đang có rủi ro bị lộ (bởi chính user hoặc Admin).
**Expected:** Đổi mật khẩu sẽ xoá toàn bộ refresh token trong Redis và có thể blacklist token hiện tại (revoke sessions).
**Actual:** Đổi mật khẩu chỉ hash lại mật khẩu mới ở DB, không xoá refresh tokens trong Redis.
**Root cause:** Code đổi mật khẩu trong `updateUser` không gọi RedisTemplate để clear token.
**Evidence:** Kẻ xấu nếu đã trộm được refresh token thì vẫn có thể dùng nó để xin access token mới (kể cả khi user đã đổi pass) cho đến khi nó hết hạn (7 ngày).
**Impact:** Xâm phạm tài khoản kéo dài bất chấp hành động phục hồi của user.
**Recommended fix:** Mỗi khi `request.getPassword()` được thay đổi, xoá mọi key `refresh_token:*` tương ứng với email đó.
**Regression risk:** LOW.

### Finding 4
**ID:** AUTH-004
**Severity:** MEDIUM
**Category:** CONCURRENCY
**File:** `AuthService.java`
**Class:** `AuthService`
**Method:** `refresh`
**Line:** `AuthService:88`
**Trigger:** 2 request refresh song song với cùng một refresh token.
**Expected:** 1 request thành công, 1 request thất bại (do cơ chế token rotation).
**Actual:** Cả 2 có thể cùng thành công và cùng trả ra token mới.
**Root cause:** Thao tác Get và Delete không atomic.
**Evidence:** Gọi `Object emailObj = redisTemplate.opsForValue().get(...)` sau đó mới gọi `redisTemplate.delete(...)`. Trong môi trường đa luồng, cả 2 thread đều get thành công trước khi có thread kịp delete.
**Impact:** Bypass cơ chế detect token reuse (vốn dĩ dùng để phát hiện refresh token bị đánh cắp).
**Recommended fix:** Sử dụng Lua script hoặc transaction trong Redis (`redisTemplate.execute(...)`) để đảm bảo Get và Delete là 1 thao tác atomic.
**Regression risk:** LOW.

### Finding 5
**ID:** AUTH-005
**Severity:** LOW
**Category:** SECURITY
**File:** `SecurityConfig.java`
**Class:** `SecurityConfig`
**Method:** `corsConfigurationSource`
**Line:** `SecurityConfig:59`
**Trigger:** N/A (Kiểm tra configuration).
**Expected:** CORS policy nên whitelist một danh sách domain cụ thể trên production.
**Actual:** `setAllowedOriginPatterns("*")` kết hợp với `setAllowCredentials(true)`.
**Root cause:** Mở cổng cho mọi nguồn để thuận tiện test trên mobile.
**Evidence:** Comment `// Cho phép mọi nguồn (phục vụ test trên điện thoại)`.
**Impact:** Tiềm ẩn rủi ro về CSRF hoặc CORS-based attack nếu cookie-based auth được sử dụng sau này (hiện tại dùng Bearer nên rủi ro thấp hơn).
**Recommended fix:** Thay "*" bằng domain chính xác hoặc cấu hình qua `application.yml` cho từng môi trường.
**Regression risk:** HIGH (Có thể làm crash mobile app nếu cấu hình sai origin name).

---

### Bảng tổng hợp

| ID | Severity | Category | Module | Status |
| -- | -------- | -------- | ------ | ------ |
| AUTH-001 | CRITICAL | AUTHORIZATION | UserController, UserService | NEW |
| AUTH-002 | MEDIUM | AUTHORIZATION | UserController | NEW |
| AUTH-003 | HIGH | SECURITY | UserService | NEW |
| AUTH-004 | MEDIUM | CONCURRENCY | AuthService | NEW |
| AUTH-005 | LOW | SECURITY | SecurityConfig | NEW |
