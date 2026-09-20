# ShiftSync Seed Data

Thu m?c n�y ch?a c�c file SQL d�ng d? n?p d? li?u m?u (mock data) v�o database ph?c v? cho vi?c test v� demo ?ng d?ng.

## C�ch s? d?ng

**Y�u c?u:** Database ph?i du?c kh?i t?o v� ch?y d?y d? c�c file migration c?a Flyway tru?c khi n?p seed data.

### 1. D�ng psql
```bash
psql -U postgres -d shiftsync -f scripts/seed/seed_demo.sql
```

### 2. D�ng DataGrip / DBeaver / pgAdmin
1. M? k?t n?i d?n database `shiftsync`.
2. M? file `scripts/seed/seed_demo.sql`.
3. Ch?y to�n b? file (Execute All).

## D? li?u m?u cung c?p trong `seed_demo.sql`:
- **Store**: 1 c?a h�ng (ShiftSync Flagship Store)
- **Contract Type**: 4 lo?i m?c d?nh (FULL_TIME, PART_TIME, SEASONAL, INTERN)
- **T�i kho?n**: (Password chung l� `password123`)
  - `admin@shiftsync.com` (Admin)
  - `manager@shiftsync.com` (Manager)
  - `staff1@shiftsync.com` (Staff - Part-time)
  - `staff2@shiftsync.com` (Staff - Intern)
- **Ca l�m vi?c**: 1 ca d� du?c x?p cho `staff1`, 1 ca dang m? (Open Shift).
