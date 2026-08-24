-- 1. T?o Store
INSERT INTO store (id, name, address, created_at) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Store A', '123 Main St', NOW());

-- 2. T?o Store Configuration
INSERT INTO store_configuration (id, store_id, min_rest_hours, max_hour_per_week, availability_deadline_hours)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 8, 40, 24);

-- 3. T?o 2 Staff (S?a thành bcrypt valid hash ho?c dummy, DB không validate ? t?ng SQL)
INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version)
VALUES ('33333333-3333-3333-3333-333333333333', 'staff1@test.com', 'hash', 'Staff 1', '0123456789', 'STAFF', NOW(), NOW(), 0);

INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version)
VALUES ('44444444-4444-4444-4444-444444444444', 'staff2@test.com', 'hash', 'Staff 2', '0987654321', 'STAFF', NOW(), NOW(), 0);

-- 4. T?o Employment
INSERT INTO employment (id, staff_id, store_id, employment_type, hourly_rate, status, joined_date)
VALUES ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20.0, 'ACTIVE', '2023-01-01');

INSERT INTO employment (id, staff_id, store_id, employment_type, hourly_rate, status, joined_date)
VALUES ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20.0, 'SUSPENDED', '2023-01-01');

-- 5. T?o Skill
INSERT INTO skill (id, store_id, name, description)
VALUES ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Cashier', 'Cashier Role');

-- 6. T?o Shift (Gi? s? 2026-08-24 là Th? 2)
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, availability_deadline, status, is_open)
VALUES ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '2026-08-24', '08:00:00', '12:00:00', '2026-08-23 23:59:59Z', 'PUBLISHED', true);

-- 7. T?o Shift Skill Requirement (Max slots = 1 Cashier)
INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count)
VALUES ('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 1);

-- 8. T?o Availability cho Staff 1 (Th? 2 = 1 trong Java, nhung trong Availability dang dùng convention có th? là 1=Monday)
-- Note: EXTRACT(DOW) in Postgres: 0=Sunday, 1=Monday. So 1 is Monday.
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 1, '08:00:00', '18:00:00');
