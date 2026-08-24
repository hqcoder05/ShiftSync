DO $$
DECLARE
    v_store_id UUID := '11111111-1111-1111-1111-111111111111';
    v_skill_id UUID;
    v_staff1_id UUID;
    v_staff2_id UUID;
    v_shift_past_1 UUID := gen_random_uuid();
    v_shift_past_2 UUID := gen_random_uuid();
    v_shift_open UUID := gen_random_uuid();
    v_shift_future UUID := gen_random_uuid();
    v_assign1 UUID := gen_random_uuid();
    v_assign2 UUID := gen_random_uuid();
    v_assign3 UUID := gen_random_uuid();
    v_period_id UUID := gen_random_uuid();
BEGIN
    -- Cleanup August 2026 data
    DELETE FROM payroll WHERE payroll_period_id IN (SELECT id FROM payroll_period WHERE start_date >= '2026-08-01' AND end_date <= '2026-08-31');
    DELETE FROM payroll_period WHERE start_date >= '2026-08-01' AND end_date <= '2026-08-31';
    DELETE FROM shift_swap_request WHERE from_shift_id IN (SELECT id FROM shift WHERE shift_date >= '2026-08-01' AND shift_date <= '2026-08-31');
    DELETE FROM attendance WHERE shift_assignment_id IN (SELECT id FROM shift_assignment WHERE shift_id IN (SELECT id FROM shift WHERE shift_date >= '2026-08-01' AND shift_date <= '2026-08-31'));
    DELETE FROM shift_assignment WHERE shift_id IN (SELECT id FROM shift WHERE shift_date >= '2026-08-01' AND shift_date <= '2026-08-31');
    DELETE FROM shift_skill_requirement WHERE shift_id IN (SELECT id FROM shift WHERE shift_date >= '2026-08-01' AND shift_date <= '2026-08-31');
    DELETE FROM shift WHERE shift_date >= '2026-08-01' AND shift_date <= '2026-08-31';

    -- Get dependencies
    SELECT id INTO v_skill_id FROM skill LIMIT 1;
    SELECT id INTO v_staff1_id FROM staff LIMIT 1;
    SELECT id INTO v_staff2_id FROM staff OFFSET 1 LIMIT 1;

    -- Update max_hour_per_week to 40 for clean math
    UPDATE store_configuration SET max_hour_per_week = 40 WHERE store_id = v_store_id;

    -- 1. Create Shifts
    -- Past Shift 1: Date '2026-08-10', 08:00 to 12:00 (ended in the past)
    INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline)
    VALUES (v_shift_past_1, v_store_id, '2026-08-10', '08:00:00', '12:00:00', 'PUBLISHED', false, '2026-08-01 00:00:00+00');
    
    -- Past Shift 2: Date '2026-08-11', 13:00 to 17:00 (ended in the past)
    INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline)
    VALUES (v_shift_past_2, v_store_id, '2026-08-11', '13:00:00', '17:00:00', 'PUBLISHED', false, '2026-08-01 00:00:00+00');

    -- Open Shift (Future but in August)
    INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline)
    VALUES (v_shift_open, v_store_id, '2026-08-20', '08:00:00', '12:00:00', 'PUBLISHED', true, '2026-08-15 00:00:00+00');

    -- Future Shift (in August)
    INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline)
    VALUES (v_shift_future, v_store_id, '2026-08-25', '08:00:00', '12:00:00', 'PUBLISHED', false, '2026-08-20 00:00:00+00');

    -- 2. Create Skill Requirements (Total required = 2 + 1 + 1 = 4)
    INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES (gen_random_uuid(), v_shift_past_1, v_skill_id, 2);
    INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES (gen_random_uuid(), v_shift_past_2, v_skill_id, 1);
    INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES (gen_random_uuid(), v_shift_future, v_skill_id, 1);

    -- 3. Create Assignments (Total assigned = 3) -> Coverage = 3 / 4 = 75%
    INSERT INTO shift_assignment (id, shift_id, staff_id) VALUES (v_assign1, v_shift_past_1, v_staff1_id);
    INSERT INTO shift_assignment (id, shift_id, staff_id) VALUES (v_assign2, v_shift_past_1, v_staff2_id);
    INSERT INTO shift_assignment (id, shift_id, staff_id) VALUES (v_assign3, v_shift_past_2, v_staff1_id);

    -- 4. Create Attendances
    -- assign1 has LATE attendance.
    INSERT INTO attendance (id, shift_assignment_id, check_in_time, status) VALUES (gen_random_uuid(), v_assign1, '2026-08-10 08:15:00+00', 'LATE');
    -- assign2 has PRESENT attendance.
    INSERT INTO attendance (id, shift_assignment_id, check_in_time, status) VALUES (gen_random_uuid(), v_assign2, '2026-08-10 07:55:00+00', 'PRESENT');
    -- assign3 has NO attendance, and shift_past_2 is ended -> ABSENT = 1.
    
    -- Metrics so far: 
    -- Total Assignments = 3
    -- Late count = 1 -> Late Rate = 33.33%
    -- Absent count = 1 -> Absent Rate = 33.33%

    -- 5. Create Swap Requests (Swap count = 2)
    INSERT INTO shift_swap_request (id, from_shift_id, from_staff_id, to_staff_id, status) VALUES (gen_random_uuid(), v_shift_past_1, v_staff1_id, v_staff2_id, 'PENDING');
    INSERT INTO shift_swap_request (id, from_shift_id, from_staff_id, to_staff_id, status) VALUES (gen_random_uuid(), v_shift_past_2, v_staff1_id, v_staff2_id, 'APPROVED');

    -- 6. Create Payroll (Labor Cost, Working Hour, Overtime)
    INSERT INTO payroll_period (id, store_id, start_date, end_date, status) VALUES (v_period_id, v_store_id, '2026-08-01', '2026-08-31', 'CONFIRMED');
    
    INSERT INTO payroll (id, payroll_period_id, staff_id, total_hours, ot_hours, base_amount, ot_amount, total_amount, holiday_hours, holiday_amount) 
    VALUES (gen_random_uuid(), v_period_id, v_staff1_id, 120.5, 10.5, 2000.0, 315.0, 2315.0, 0, 0);

    INSERT INTO payroll (id, payroll_period_id, staff_id, total_hours, ot_hours, base_amount, ot_amount, total_amount, holiday_hours, holiday_amount) 
    VALUES (gen_random_uuid(), v_period_id, v_staff2_id, 80.0, 0.0, 1500.0, 0.0, 1500.0, 0, 0);

    -- Payroll Metrics:
    -- Working Hours = 120.5 + 80.0 = 200.5
    -- Overtime = 10.5 + 0.0 = 10.5
    -- Labor Cost = 2315.0 + 1500.0 = 3815.0

    -- Staff Utilization:
    -- Total Active Staff = 5
    -- MaxHourPerWeek = 40
    -- Days in August = 31 (so Weeks = 31 / 7.0 = 4.42857)
    -- Max possible hours = 5 * 40 * 4.428571428571429 = 885.7142857...
    -- Actual Working Hours = 200.5
    -- Utilization = (200.5 / 885.71428) * 100 = 22.64%

END $$;
