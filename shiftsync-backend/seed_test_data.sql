-- Seed Data for ShiftSync Assignment Testing
-- LUU : Ch?y file ny sau khi d ch?y xong ton b? Flyway migrations.

-- 1. T?o Store
INSERT INTO store (id, name, address, created_at, updated_at) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Store A', '123 Main St', NOW(), NOW());

-- 2. T?o Store Configuration
INSERT INTO store_configuration (id, store_id, min_rest_hours, max_weekly_hours, max_consecutive_days, max_shift_duration_hours, availability_deadline_hours, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 8, 40, 5, 8, 24, NOW(), NOW());

-- 3. T?o 2 Staff
-- Staff 1 (ACTIVE)
INSERT INTO staff (id, email, password_hash, full_name, phone_number, system_role, is_active, created_at, updated_at)
VALUES ('33333333-3333-3333-3333-333333333333', 'staff1@test.com', 'hash', 'Staff 1', '0123456789', 'STAFF', true, NOW(), NOW());

-- Staff 2 (SUSPENDED)
INSERT INTO staff (id, email, password_hash, full_name, phone_number, system_role, is_active, created_at, updated_at)
VALUES ('44444444-4444-4444-4444-444444444444', 'staff2@test.com', 'hash', 'Staff 2', '0987654321', 'STAFF', true, NOW(), NOW());

-- 4. T?o Employment cho 2 Staff
INSERT INTO employment (id, user_id, store_id, contract_type_id, status, hire_date, max_weekly_hours, created_at, updated_at)
VALUES ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', (SELECT id FROM contract_type WHERE name='FULL_TIME' LIMIT 1), 'ACTIVE', '2023-01-01', 40, NOW(), NOW());

INSERT INTO employment (id, user_id, store_id, contract_type_id, status, hire_date, max_weekly_hours, created_at, updated_at)
VALUES ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', (SELECT id FROM contract_type WHERE name='FULL_TIME' LIMIT 1), 'SUSPENDED', '2023-01-01', 40, NOW(), NOW());

-- 5. T?o Skill
INSERT INTO skill (id, name, category, created_at, updated_at)
VALUES ('77777777-7777-7777-7777-777777777777', 'Cashier', 'ROLE', NOW(), NOW());

-- 6. T?o Shift (Gi? s? vo m?t ngy Th? 2, v d? 2026-08-24)
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, availability_deadline, status, is_open, created_at, updated_at)
VALUES ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '2026-08-24', '08:00:00', '12:00:00', '2026-08-23 23:59:59Z', 'PUBLISHED', true, NOW(), NOW());

-- 7. T?o Shift Skill Requirement (Max slots = 1 Cashier)
INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count, created_at, updated_at)
VALUES ('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 1, NOW(), NOW());

-- 8. T?o Availability cho Staff 1 (Th? 2)
INSERT INTO availability (id, user_id, day_of_week, start_time, end_time, created_at, updated_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 1, '08:00:00', '18:00:00', NOW(), NOW());
