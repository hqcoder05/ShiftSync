-- ATT_E2E local-only fixture. Run after Flyway migrations.
-- Password for both accounts: password123
-- This creates no attendance row and does not change production rules.
BEGIN;

INSERT INTO store (id, name, address, latitude, longitude, open_time, close_time, category, format, deleted)
VALUES ('a7100000-0000-0000-0000-000000000001', 'ATT_E2E Test Store', 'Local device GPS test store',
        10.833931828902953, 106.72873397063299, '00:00:00', '23:59:59', 'FOOD_BEVERAGE', 'E2E Test', false)
ON CONFLICT (id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, deleted = false;

INSERT INTO store_configuration
  (id, store_id, max_hour_per_week, min_rest_hours, geofence_radius_m,
   availability_deadline_hours, allowed_check_in_minutes, allowed_check_out_minutes,
   late_grace_minutes, early_leave_grace_minutes, shift_reminder_hours)
VALUES
  ('a7100000-0000-0000-0000-000000000a01', 'a7100000-0000-0000-0000-000000000001',
   48, 8, 100, 24, 1440, 1440, 5, 5, 2)
ON CONFLICT (store_id) DO UPDATE SET geofence_radius_m = 100;

INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate)
VALUES ('a7100000-0000-0000-0000-000000000201', 'a7100000-0000-0000-0000-000000000001',
        'ATT_E2E_TEST_CONTRACT', 48, 1.0, 20.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff (id, full_name, email, phone, password_hash, system_role, created_at, updated_at, version, deleted)
VALUES
  ('a7100000-0000-0000-0000-000000001001', 'ATT E2E Manager', 'attendance.manager@shiftsync.test',
   '0900001001', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'MANAGER', now(), now(), 0, false),
  ('a7100000-0000-0000-0000-000000001002', 'ATT E2E Staff', 'attendance.staff@shiftsync.test',
   '0900001002', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false)
ON CONFLICT (id) DO UPDATE SET deleted = false;

INSERT INTO employment (id, staff_id, store_id, hourly_rate, status, joined_date, contract_type_id)
VALUES
  ('a7100000-0000-0000-0000-000000004001', 'a7100000-0000-0000-0000-000000001001',
   'a7100000-0000-0000-0000-000000000001', 20.00, 'ACTIVE', CURRENT_DATE,
   'a7100000-0000-0000-0000-000000000201'),
  ('a7100000-0000-0000-0000-000000004002', 'a7100000-0000-0000-0000-000000001002',
   'a7100000-0000-0000-0000-000000000001', 20.00, 'ACTIVE', CURRENT_DATE,
   'a7100000-0000-0000-0000-000000000201')
ON CONFLICT (id) DO NOTHING;

INSERT INTO skill (id, store_id, name, description)
VALUES ('a7100000-0000-0000-0000-000000003001', 'a7100000-0000-0000-0000-000000000001',
        'ATT_E2E_Cashier', 'Local attendance E2E skill')
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff_skill (id, staff_id, skill_id, level, expiration_date)
VALUES ('a7100000-0000-0000-0000-000000005001', 'a7100000-0000-0000-0000-000000001002',
        'a7100000-0000-0000-0000-000000003001', 'EXPERT', NULL)
ON CONFLICT (staff_id, skill_id) DO UPDATE SET expiration_date = NULL, level = 'EXPERT';

INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
SELECT 'a7100000-0000-0000-0000-000000005002', 'a7100000-0000-0000-0000-000000001002',
       EXTRACT(DOW FROM CURRENT_DATE)::smallint, '00:00:00', '23:59:00'
WHERE NOT EXISTS (
  SELECT 1 FROM availability WHERE id = 'a7100000-0000-0000-0000-000000005002'
);

INSERT INTO shift_template (id, store_id, name, start_time, end_time, is_active)
VALUES ('a7100000-0000-0000-0000-000000009001', 'a7100000-0000-0000-0000-000000000001',
        'ATT_E2E Day Shift', '00:00:00', '23:00:00', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift (id, store_id, shift_template_id, shift_date, start_time, end_time,
                   status, availability_deadline, is_open, version, note)
VALUES ('a7100000-0000-0000-0000-000000006001', 'a7100000-0000-0000-0000-000000000001',
        'a7100000-0000-0000-0000-000000009001', CURRENT_DATE, '00:00:00', '23:00:00',
        'PUBLISHED', CURRENT_TIMESTAMP + INTERVAL '1 day', false, 0,
        'ATT_E2E — selfie and geofence test shift')
ON CONFLICT (id) DO UPDATE SET shift_date = CURRENT_DATE, status = 'PUBLISHED',
  availability_deadline = CURRENT_TIMESTAMP + INTERVAL '1 day', is_open = false;

INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count)
VALUES ('a7100000-0000-0000-0000-000000006002', 'a7100000-0000-0000-0000-000000006001',
        'a7100000-0000-0000-0000-000000003001', 1)
ON CONFLICT (shift_id, skill_id) DO NOTHING;

INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, required_skill_id)
VALUES ('a7100000-0000-0000-0000-000000007001', 'a7100000-0000-0000-0000-000000006001',
        'a7100000-0000-0000-0000-000000001002', 'MANUAL', now(), false,
        'a7100000-0000-0000-0000-000000003001')
ON CONFLICT (id) DO UPDATE SET deleted = false;

-- Deliberately no INSERT into attendance: the Mobile selfie flow must create it.
COMMIT;
