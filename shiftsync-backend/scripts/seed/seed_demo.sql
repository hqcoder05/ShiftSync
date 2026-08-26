-- ShiftSync V21 Seed Data for Demo/Thesis Defense
-- Run this AFTER all Flyway migrations are completed successfully.

-- 1. Create a Demo Store
INSERT INTO store (id, name, address, created_at, updated_at, version, deleted)
VALUES ('11111111-1111-1111-1111-111111111111', 'ShiftSync Flagship Store', '123 Nguyen Hue, D1, HCMC', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- 2. Create Store Configuration
INSERT INTO store_configuration (id, store_id, min_rest_hours, max_weekly_hours, max_consecutive_days, max_shift_duration_hours, availability_deadline_hours, created_at, updated_at, version, deleted)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 8, 48, 6, 12, 24, NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- 3. Create Contract Types (FR-29)
INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate, created_at, updated_at, version, deleted)
VALUES 
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 48, 1.5, 30.0, NOW(), NOW(), 0, false),
('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'PART_TIME', 24, 1.5, 20.0, NOW(), NOW(), 0, false),
('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'SEASONAL', 40, 1.5, 25.0, NOW(), NOW(), 0, false),
('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'INTERN', 20, 1.5, 15.0, NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- 4. Create Staff (Password for all is 'password123', hashed via bcrypt)
INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version, deleted)
VALUES 
('33333333-3333-3333-3333-333333333333', 'admin@shiftsync.com', '$2a$10$M2wBgpIXX.JBt2c/PR4yBeKPRXa.jgYkiw6/WpWgn67nayoxFm7x6', 'System Admin', '0901234567', 'ADMIN', NOW(), NOW(), 0, false),
('44444444-4444-4444-4444-444444444444', 'manager@shiftsync.com', '$2a$10$M2wBgpIXX.JBt2c/PR4yBeKPRXa.jgYkiw6/WpWgn67nayoxFm7x6', 'Store Manager', '0901234568', 'MANAGER', NOW(), NOW(), 0, false),
('55555555-5555-5555-5555-555555555555', 'staff1@shiftsync.com', '$2a$10$M2wBgpIXX.JBt2c/PR4yBeKPRXa.jgYkiw6/WpWgn67nayoxFm7x6', 'Barista John', '0901234569', 'STAFF', NOW(), NOW(), 0, false),
('66666666-6666-6666-6666-666666666666', 'staff2@shiftsync.com', '$2a$10$M2wBgpIXX.JBt2c/PR4yBeKPRXa.jgYkiw6/WpWgn67nayoxFm7x6', 'Cashier Jane', '0901234570', 'STAFF', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- 5. Create Employment (Assign staff to store with a contract type)
INSERT INTO employment (id, store_id, staff_id, contract_type_id, status, hourly_rate, joined_date, created_at, updated_at, version, deleted)
VALUES 
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'ACTIVE', 35.0, CURRENT_DATE, NOW(), NOW(), 0, false),
('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'c2222222-2222-2222-2222-222222222222', 'ACTIVE', 20.0, CURRENT_DATE, NOW(), NOW(), 0, false),
('e3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'c4444444-4444-4444-4444-444444444444', 'ACTIVE', 15.0, CURRENT_DATE, NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- 6. Create Demo Shifts
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, is_active, created_at, updated_at, version, deleted)
VALUES 
('s1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '1 day', '08:00:00', '16:00:00', 'PUBLISHED', false, true, NOW(), NOW(), 0, false),
('s2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '1 day', '16:00:00', '23:00:00', 'PUBLISHED', true, true, NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- 7. Assign Staff 1 to Shift 1
INSERT INTO shift_assignment (id, shift_id, staff_id, created_at, updated_at, version, deleted)
VALUES 
('a1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 8. Create a Second Store for Workforce Sharing Demo
-- ==========================================
INSERT INTO store (id, name, address, created_at, updated_at, version, deleted)
VALUES ('77777777-7777-7777-7777-777777777777', 'ShiftSync Branch 2', '456 Le Loi, D1, HCMC', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO store_configuration (id, store_id, min_rest_hours, max_weekly_hours, max_consecutive_days, max_shift_duration_hours, availability_deadline_hours, created_at, updated_at, version, deleted)
VALUES ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 8, 48, 6, 12, 24, NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version, deleted)
VALUES 
('99999999-9999-9999-9999-999999999999', 'manager2@shiftsync.com', '$2a$10$M2wBgpIXX.JBt2c/PR4yBeKPRXa.jgYkiw6/WpWgn67nayoxFm7x6', 'Store 2 Manager', '0901234571', 'MANAGER', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate, created_at, updated_at, version, deleted)
VALUES 
('c5555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'FULL_TIME', 48, 1.5, 30.0, NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO employment (id, store_id, staff_id, contract_type_id, status, hourly_rate, joined_date, created_at, updated_at, version, deleted)
VALUES 
('e4444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999', 'c5555555-5555-5555-5555-555555555555', 'ACTIVE', 35.0, CURRENT_DATE, NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

