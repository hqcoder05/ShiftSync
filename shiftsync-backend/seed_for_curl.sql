INSERT INTO store (id, name, address) VALUES ('11111111-1111-1111-1111-111111111111', 'Store 1', 'Address 1');

INSERT INTO store_configuration (id, store_id, min_rest_hours, max_weekly_hours) VALUES ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 8, 40);

-- staff (new_staff@test.com) - password is 'password123' (encoded)
INSERT INTO staff (id, email, password_hash, full_name, role) VALUES ('33333333-3333-3333-3333-333333333333', 'new_staff@test.com', '$2a$10$C.G./t8.6gK7HhPZ9Bw91.x5p.5D31D5c4a.a6Z6jP.D2a8n6pXKy', 'Staff 1', 'ROLE_STAFF');
-- manager (new_manager@test.com)
INSERT INTO staff (id, email, password_hash, full_name, role) VALUES ('44444444-4444-4444-4444-444444444444', 'new_manager@test.com', '$2a$10$C.G./t8.6gK7HhPZ9Bw91.x5p.5D31D5c4a.a6Z6jP.D2a8n6pXKy', 'Manager 1', 'ROLE_MANAGER');

INSERT INTO employment (id, staff_id, store_id, employment_type, hourly_rate, status) VALUES (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20.0, 'ACTIVE');
INSERT INTO employment (id, staff_id, store_id, employment_type, hourly_rate, status) VALUES (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 30.0, 'ACTIVE');

-- shift
INSERT INTO shift (id, store_id, name, shift_date, start_time, end_time, availability_deadline, status, is_open) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Morning Shift', '2026-08-25', '2026-08-25 09:00:00+00', '2026-08-25 17:00:00+00', '2026-08-24 00:00:00+00', 'PUBLISHED', false);

-- shift assignment
INSERT INTO shift_assignment (id, shift_id, staff_id, status) VALUES (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'AUTO');
