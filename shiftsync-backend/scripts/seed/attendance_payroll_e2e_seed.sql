-- Local/dev only. Extends the existing ATT_E2E fixture without inserting Attendance or Payroll rows.
-- Password for existing ATT_E2E accounts: password123
BEGIN;

-- Assignment metadata used to verify Attendance DTO/UI propagation.
INSERT INTO store_zones (id, store_id, name, x_coord, y_coord, z_coord, capacity, code, zone_type, color, description, width_dim, length_dim, height_dim)
VALUES ('a7100000-0000-0000-0000-000000008001', 'a7100000-0000-0000-0000-000000000001',
        'E2E Test Zone', 1, 1, 0, 1, 'ATT-E2E-ZONE', 'ZONE', '#38BDF8', 'Attendance/payroll E2E assignment metadata', 3, 3, 2.8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, store_id = EXCLUDED.store_id;

INSERT INTO workstations (id, store_id, zone_id, name, code, workstation_type, x_coord, y_coord, z_coord, capacity, is_active, created_at, updated_at)
VALUES ('a7100000-0000-0000-0000-000000008002', 'a7100000-0000-0000-0000-000000000001',
        'a7100000-0000-0000-0000-000000008001', 'E2E Counter 01', 'ATT-E2E-WS-01', 'COUNTER', 1, 1, 0, 1, true, now(), now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, zone_id = EXCLUDED.zone_id, is_active = true;

UPDATE shift_assignment
SET zone_id = 'a7100000-0000-0000-0000-000000008001', workstation_id = 'a7100000-0000-0000-0000-000000008002'
WHERE id = 'a7100000-0000-0000-0000-000000007001';

-- Make the staff available for every weekday used by the OT preparation shifts.
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
SELECT ('a7100000-0000-0000-0000-00000000510' || d)::uuid,
       'a7100000-0000-0000-0000-000000001002', d, '00:00:00', '23:59:00'
FROM generate_series(1, 6) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM availability a
  WHERE a.staff_id = 'a7100000-0000-0000-0000-000000001002' AND a.day_of_week = d
);

-- Five additional assigned 8-hour shifts in the current ISO week. Payroll OT is
-- produced only after the real Attendance API creates timestamps for these shifts;
-- this script deliberately does not insert Attendance or Payroll rows.
DO $$
DECLARE
  monday date := date_trunc('week', current_date)::date;
  i integer;
  v_shift_id uuid;
  v_assignment_id uuid;
  v_skill_id uuid := 'a7100000-0000-0000-0000-000000003001';
BEGIN
  FOR i IN 1..5 LOOP
    v_shift_id := ('a7100000-0000-0000-0000-00000000610' || i)::uuid;
    v_assignment_id := ('a7100000-0000-0000-0000-00000000710' || i)::uuid;
    INSERT INTO shift (id, store_id, shift_template_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note)
    VALUES (v_shift_id, 'a7100000-0000-0000-0000-000000000001', 'a7100000-0000-0000-0000-000000009001',
            monday + i, '08:00:00', '16:00:00', 'PUBLISHED', now() + interval '7 days', false, 0, 'ATT_E2E OT preparation shift')
    ON CONFLICT (id) DO UPDATE SET shift_date = EXCLUDED.shift_date, status = 'PUBLISHED', is_open = false;

    INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count)
    VALUES (('a7100000-0000-0000-0000-00000000620' || i)::uuid, v_shift_id, v_skill_id, 1)
    ON CONFLICT (shift_id, skill_id) DO NOTHING;

    INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, required_skill_id, zone_id, workstation_id)
    VALUES (v_assignment_id, v_shift_id, 'a7100000-0000-0000-0000-000000001002', 'MANUAL', now(), false, v_skill_id,
            'a7100000-0000-0000-0000-000000008001', 'a7100000-0000-0000-0000-000000008002')
    ON CONFLICT (id) DO UPDATE SET deleted = false, zone_id = EXCLUDED.zone_id, workstation_id = EXCLUDED.workstation_id;
  END LOOP;
END $$;

COMMIT;
