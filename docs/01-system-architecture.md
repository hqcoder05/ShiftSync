# System Architecture

## Luồng request

```text
Browser/Expo
  -> Axios (Authorization: Bearer JWT)
  -> Spring Security/JwtAuthFilter
  -> Controller
  -> Domain Service (@Transactional khi cần)
  -> Spring Data Repository
  -> PostgreSQL
```

Realtime dùng WebSocket config (`WebSocketConfig`) và notification stream dùng SSE tại `NotificationController`. Redis được cấu hình qua `RedisConfig`; Firebase được khởi tạo bởi `FirebaseConfig`.

## Boundary

Client không gọi repository/database. Service là nơi kiểm tra role, store isolation, trạng thái và tính hợp lệ. Entity không được dùng như API contract một cách ngầm định; DTO tại từng package là contract công khai.

## Module map

`auth` xác thực; `employment` liên kết staff-store-contract; `store` dashboard/config/template; `shift` ca và assignment; `quota` demand/headcount; `availability` availability/blackout; `leave`; `workforce`; `marketplace`; `attendance`; `payroll`; `layout`; `notification`; `request`; `audit`.
