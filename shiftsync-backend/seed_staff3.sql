-- Create Staff 3 (ACTIVE)
INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version)
VALUES ('55555555-5555-5555-5555-555555555555', 'staff3@test.com', 'hash', 'Staff 3', '0987654322', 'STAFF', NOW(), NOW(), 0);

-- Create Employment for Staff 3
INSERT INTO employment (id, staff_id, store_id, contract_type_id, hourly_rate, status, joined_date)
VALUES ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', (SELECT id FROM contract_type WHERE name=(SELECT id FROM contract_type WHERE name='FULL_TIME' LIMIT 1) LIMIT 1), 20.0, 'ACTIVE', '2023-01-01');

-- Create Availability for Staff 3 (Th? 2)
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 1, '08:00:00', '18:00:00');

-- Ensure Staff 1 is assigned
INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at)
VALUES ('6ebd0230-a6f6-4991-8902-93120b3562d2', '88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'MANUAL', NOW()) ON CONFLICT DO NOTHING;
