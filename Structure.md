# ShiftSync — Báo cáo kiến trúc và cấu trúc hệ thống

## 1. Mô hình triển khai

ShiftSync là hệ thống full-stack monorepo. Backend xử lý dữ liệu và business rule; Web phục vụ Manager/Admin; Mobile phục vụ Staff.

```text
Client Web ───────┐
                  ├── REST API / WebSocket ── ShiftSync Backend ── PostgreSQL
Client Mobile ────┘                              │
                                                 ├── Redis / Redisson
                                                 ├── Flyway migrations
                                                 └── Firebase notifications
```

## 2. Backend architecture

Backend sử dụng Spring Boot modular monolith. Mỗi domain được tổ chức theo Controller, Service, Repository, DTO và Entity; các thành phần dùng chung nằm trong `shared` và `config`.

```text
shiftsync-backend/src/main/java/com/shiftsync/
├── shared/         exception, response, security primitives
├── config/          application và scheduler configuration
├── auth/            authentication, JWT, user và role
├── store/           store, configuration và dashboard
├── employment/      employment và contract
├── skill/           skill, staff skill và requirement
├── availability/    weekly availability và blackout date
├── leave/           leave request, leave type và balance
├── shift/           shift, assignment, requirement và AutoSchedule
├── layout/          store layout, zone và spatial allocation
├── marketplace/     open shift và claim flow
├── workforce/       workforce sharing liên chi nhánh
├── attendance/      check-in/out và adjustment
├── payroll/         payroll period, calculation và payslip
├── notification/    notification và reminder
├── request/         staff request workflow
├── audit/           audit log
└── job/             background jobs
```

Luồng xử lý Backend:

```text
HTTP request → Controller → DTO validation và authentication
             → Service business rule → Repository
             → Entity/database → Response DTO
```

## 3. Các domain nghiệp vụ

### Authentication và authorization

JWT xác thực người dùng. Spring Security áp dụng RBAC cho ADMIN, MANAGER và STAFF, đồng thời kiểm tra ownership và store isolation.

### Workforce và scheduling

Employment, skill, availability, leave và shift cung cấp dữ liệu đầu vào cho AutoSchedule. Scheduler xử lý hard constraint, skill requirement, overlap, rest, giới hạn giờ và tạo assignment.

### Spatial allocation

Module layout quản lý store layout, zone và vị trí làm việc. Spatial allocation được thực hiện sau khi assignment hợp lệ.

### Marketplace và workforce sharing

Marketplace quản lý open shift và claim cạnh tranh. Workforce quản lý yêu cầu chia sẻ nhân sự giữa các chi nhánh.

### Attendance và payroll

Attendance lưu check-in/out, GPS, selfie và adjustment request. Payroll sử dụng dữ liệu chấm công, shift và payroll period để tạo payslip.

## 4. Database và tích hợp

- PostgreSQL là cơ sở dữ liệu chính.
- Flyway quản lý thứ tự migration và schema.
- JPA/Hibernate ánh xạ Entity và Repository.
- Redis/Redisson hỗ trợ cache và distributed lock.
- WebSocket và Firebase Admin hỗ trợ notification.

## 5. Web và Mobile

Web tổ chức trong `ShiftSync-Web/src` với `assets`, `components`, `layouts`, `pages`, `services` và `utils`.

Mobile tổ chức trong `ShiftSync-Mobile` với `assets`, `components`, `navigation`, `screens` và `services`.

Hai client gọi API và hiển thị trạng thái theo quyền người dùng; business calculation thuộc Backend.

## 6. Nguyên tắc kiến trúc

1. Backend là nguồn dữ liệu và business rule trung tâm.
2. Mọi truy cập dữ liệu phải qua authentication, authorization và store scope.
3. Business logic đặt trong Service, không đặt trong UI client.
4. Schema thay đổi phải đi qua Flyway migration.
5. Scheduler phải bảo toàn assignment thủ công và trạng thái nghiệp vụ hợp lệ.
6. Thay đổi domain quan trọng phải có test và regression test phù hợp.
