DO $$
DECLARE
    v_staff_id UUID;
    v_shift_id UUID := gen_random_uuid();
    v_assignment_id UUID := gen_random_uuid();
    v_store_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Cleanup
    DELETE FROM attendance WHERE shift_assignment_id = v_assignment_id;
    DELETE FROM shift_assignment WHERE id = v_assignment_id;
    DELETE FROM shift WHERE id = v_shift_id;
    DELETE FROM holiday WHERE holiday_date = '2026-08-15';
    DELETE FROM payroll;
    DELETE FROM payroll_period;
    
    SELECT staff_id INTO v_staff_id FROM employment LIMIT 1;

    -- Create Holiday on 2026-08-15
    INSERT INTO holiday (id, holiday_date, name, rate_multiplier) 
    VALUES (gen_random_uuid(), '2026-08-15', 'Test Holiday', 2.0);

    -- Create Overnight Shift from 2026-08-15 22:00 to 2026-08-16 06:00
    INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline) 
    VALUES (v_shift_id, v_store_id, '2026-08-15', '22:00:00', '06:00:00', 'PUBLISHED', false, '2026-08-10');

    -- Create Assignment
    INSERT INTO shift_assignment (id, shift_id, staff_id) VALUES (v_assignment_id, v_shift_id, v_staff_id);

    -- Create Attendance covering 8 hours
    INSERT INTO attendance (id, shift_assignment_id, check_in_time, check_out_time, status) 
    VALUES (gen_random_uuid(), v_assignment_id, '2026-08-15 22:00:00+00', '2026-08-16 06:00:00+00', 'PRESENT');

END $$;
