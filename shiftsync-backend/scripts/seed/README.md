# ShiftSync Seed Data

Thu m?c này ch?a các file SQL dùng d? n?p d? li?u m?u (mock data) vào database ph?c v? cho vi?c test và demo ?ng d?ng.

## Cách s? d?ng

**Yêu c?u:** Database ph?i du?c kh?i t?o và ch?y d?y d? các file migration c?a Flyway tru?c khi n?p seed data.

### 1. Dùng psql
```bash
psql -U postgres -d shiftsync -f scripts/seed/seed_demo.sql
```

### 2. Dùng DataGrip / DBeaver / pgAdmin
1. M? k?t n?i d?n database `shiftsync`.
2. M? file `scripts/seed/seed_demo.sql`.
3. Ch?y toàn b? file (Execute All).

## D? li?u m?u cung c?p trong `seed_demo.sql`:
- **Store**: 1 c?a hàng (ShiftSync Flagship Store)
- **Contract Type**: 4 lo?i m?c d?nh (FULL_TIME, PART_TIME, SEASONAL, INTERN)
- **Tài kho?n**: (Password chung là `password123`)
  - `admin@shiftsync.com` (Admin)
  - `manager@shiftsync.com` (Manager)
  - `staff1@shiftsync.com` (Staff - Part-time)
  - `staff2@shiftsync.com` (Staff - Intern)
- **Ca làm vi?c**: 1 ca dã du?c x?p cho `staff1`, 1 ca dang m? (Open Shift).
