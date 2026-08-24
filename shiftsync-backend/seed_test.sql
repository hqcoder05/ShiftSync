-- CLEAN UP
TRUNCATE TABLE shift_assignment CASCADE;
TRUNCATE TABLE shift_skill_requirement CASCADE;
TRUNCATE TABLE shift CASCADE;
TRUNCATE TABLE availability CASCADE;
TRUNCATE TABLE staff_skill CASCADE;
TRUNCATE TABLE employment CASCADE;
TRUNCATE TABLE skill CASCADE;
TRUNCATE TABLE staff CASCADE;
TRUNCATE TABLE store_configuration CASCADE;
TRUNCATE TABLE scheduler_configuration CASCADE;
TRUNCATE TABLE store CASCADE;

-- STORE
INSERT INTO store (id, name, address, created_at) VALUES ('11111111-1111-1111-1111-111111111111', 'Store Auto', 'Address', NOW());
INSERT INTO store_configuration (store_id, max_hour_per_week, min_rest_hours, availability_deadline_hours) VALUES ('11111111-1111-1111-1111-111111111111', 48, 8, 24);
INSERT INTO scheduler_configuration (store_id, fairness_weight, skill_weight, hour_weight, rest_time_weight, availability_weight)
VALUES ('11111111-1111-1111-1111-111111111111', 0.1, 0.3, 0.2, 0.1, 0.3);

-- SKILL
INSERT INTO skill (id, store_id, name, description) VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Barista', 'Barista');

-- STAFF
INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.com', '$z2PtiuOy.zWQxGGLMH19..UU5tnwXcGJoxs9EpsSwYfZZCkSh0hNC', 'Staff A', '0001', 'STAFF', NOW(), NOW(), 0),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.com', '$z2PtiuOy.zWQxGGLMH19..UU5tnwXcGJoxs9EpsSwYfZZCkSh0hNC', 'Staff B', '0002', 'STAFF', NOW(), NOW(), 0),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.com', '$z2PtiuOy.zWQxGGLMH19..UU5tnwXcGJoxs9EpsSwYfZZCkSh0hNC', 'Staff C', '0003', 'STAFF', NOW(), NOW(), 0),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.com', '$z2PtiuOy.zWQxGGLMH19..UU5tnwXcGJoxs9EpsSwYfZZCkSh0hNC', 'Staff D', '0004', 'STAFF', NOW(), NOW(), 0),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'manager@shiftsync.com', '$2a$10$z2PtiuOy.zWQxGGLMH19..UU5tnwXcGJoxs9EpsSwYfZZCkSh0hNC', 'Manager', '0005', 'MANAGER', NOW(), NOW(), 0);

-- EMPLOYMENT
INSERT INTO employment (id, staff_id, store_id, employment_type, hourly_rate, status, joined_date) VALUES 
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20, 'ACTIVE', '2023-01-01'),
(gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20, 'ACTIVE', '2023-01-01'),
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20, 'ACTIVE', '2023-01-01'),
(gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20, 'ACTIVE', '2023-01-01'),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20, 'ACTIVE', '2023-01-01');

-- STAFF SKILL
INSERT INTO staff_skill (id, staff_id, skill_id, level) VALUES
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'EXPERT'),
(gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'BEGINNER'),
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'EXPERT'),
(gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'EXPERT');

-- AVAILABILITY (Sunday = 0)
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time) VALUES
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, '00:00:00', '23:59:59'),
(gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0, '00:00:00', '23:59:59'),
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', 0, '00:00:00', '23:59:59'),
(gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', 0, '00:00:00', '23:59:59');

-- TARGET SHIFT (2026-08-30 Sunday, 08:00 - 16:00)
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open)
VALUES ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '2026-08-30', '08:00:00', '16:00:00', 'DRAFT', '2026-08-29 00:00:00', false);
INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count)
VALUES (gen_random_uuid(), '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 1);

-- STAFF A (35h: 5 shifts * 7h)
-- We insert 5 shifts on 25, 26, 27, 28, 29 (10:00 to 17:00)
-- Continue generating shifts
DO 
DECLARE
    staffA UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    staffB UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    staffC UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    staffD UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    storeId UUID := '11111111-1111-1111-1111-111111111111';
    sId UUID;
BEGIN
    -- STAFF A (35h, 8 shifts)
    FOR i IN 1..8 LOOP
        sId := gen_random_uuid();
        INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open)
        VALUES (sId, storeId, '2026-08-' || (10+i), '10:00:00', '14:22:30', 'PUBLISHED', NOW(), false);
        INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at) VALUES (gen_random_uuid(), sId, staffA, 'MANUAL', NOW());
    END LOOP;
    
    -- STAFF B (10h, 2 shifts)
    FOR i IN 1..2 LOOP
        sId := gen_random_uuid();
        INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open)
        VALUES (sId, storeId, '2026-08-' || (10+i), '10:00:00', '15:00:00', 'PUBLISHED', NOW(), false);
        INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at) VALUES (gen_random_uuid(), sId, staffB, 'MANUAL', NOW());
    END LOOP;

    -- STAFF C (35h, 8 shifts, last shift ends 2026-08-30 00:00 -> 8h gap)
    FOR i IN 1..7 LOOP
        sId := gen_random_uuid();
        INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open)
        VALUES (sId, storeId, '2026-08-' || (10+i), '10:00:00', '14:22:30', 'PUBLISHED', NOW(), false);
        INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at) VALUES (gen_random_uuid(), sId, staffC, 'MANUAL', NOW());
    END LOOP;
    sId := gen_random_uuid();
    INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open)
    VALUES (sId, storeId, '2026-08-29', '19:37:30', '23:59:59', 'PUBLISHED', NOW(), false);
    INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at) VALUES (gen_random_uuid(), sId, staffC, 'MANUAL', NOW());

    -- STAFF D (35h, 8 shifts, last shift ends 2026-08-29 08:00 -> 24h gap)
    FOR i IN 1..7 LOOP
        sId := gen_random_uuid();
        INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open)
        VALUES (sId, storeId, '2026-08-' || (10+i), '10:00:00', '14:22:30', 'PUBLISHED', NOW(), false);
        INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at) VALUES (gen_random_uuid(), sId, staffD, 'MANUAL', NOW());
    END LOOP;
    sId := gen_random_uuid();
    INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open)
    VALUES (sId, storeId, '2026-08-29', '03:37:30', '08:00:00', 'PUBLISHED', NOW(), false);
    INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at) VALUES (gen_random_uuid(), sId, staffD, 'MANUAL', NOW());

END \$\$;
