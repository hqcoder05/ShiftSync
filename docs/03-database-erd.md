# Database and ERD Notes

## Migration authority

Schema được tạo/nâng cấp bởi Flyway `V1__init_schema.sql` và `V2`–`V39` trong `shiftsync-backend/src/main/resources/db/migration`. Hibernate `ddl-auto=none`, vì vậy migration là nguồn tạo schema runtime.

## Các nhóm bảng

* Identity: users, employment, contract types, stores.
* Skills: skills, staff skills, shift skill requirements.
* Schedule: shifts, shift templates, shift assignments, swap requests.
* Availability/leave: availability, blackout dates, leave requests, leave balances, leave types.
* Spatial: store layouts, zones, workstations.
* Attendance/payroll: attendance, adjustments, payroll periods, payroll, holidays.
* Collaboration: workforce requests/proposals, staff requests, notifications, device tokens, audit logs.

## Migration đáng chú ý

`V4` mở shift, `V7` performance indexes, `V14` soft-delete flags, `V22` workforce sharing schema, `V24` attendance location/selfie, `V25` layout/shift version, `V28` assignment unique constraint, `V29` scheduler weights, `V31` generic spatial domain, `V32` link requirement to zones, `V34` scheduling identity, `V37` leave balance, `V38` leave types, `V39` position norm overrides.

## Ghi chú kiểm chứng

Column/FK cụ thể phải đọc đồng thời migration và entity tương ứng. Nếu cần ERD đồ họa, `docs/ERD.png` là tài liệu tham khảo; không dùng ảnh để suy ra quan hệ không có trong SQL.
