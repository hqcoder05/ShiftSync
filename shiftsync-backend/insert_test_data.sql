-- Insert dummy leave request
INSERT INTO leave_request (id, store_id, staff_id, start_date, end_date, reason, status, created_at, updated_at, version, deleted)
VALUES ('00000000-0000-0000-0000-000000000001', 'e07a68e8-97f2-4bd5-8f65-df0ddb2cf276', '90f57be2-04db-4b95-a50d-cb63162b1661', '2026-09-01', '2026-09-02', 'Vacation', 'PENDING', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Insert another leave request for reject
INSERT INTO leave_request (id, store_id, staff_id, start_date, end_date, reason, status, created_at, updated_at, version, deleted)
VALUES ('00000000-0000-0000-0000-000000000002', 'e07a68e8-97f2-4bd5-8f65-df0ddb2cf276', '90f57be2-04db-4b95-a50d-cb63162b1661', '2026-09-03', '2026-09-04', 'Sick', 'PENDING', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Insert shift swap request
INSERT INTO shift_swap_request (id, requestor_id, target_staff_id, requestor_shift_id, target_shift_id, reason, status, created_at, updated_at, version, deleted)
VALUES ('00000000-0000-0000-0000-000000000003', '90f57be2-04db-4b95-a50d-cb63162b1661', '90f57be2-04db-4b95-a50d-cb63162b1662', NULL, NULL, 'Swap', 'PENDING', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Insert attendance adjustment request
INSERT INTO attendance_adjustment_request (id, staff_id, shift_id, type, adjusted_time, reason, status, created_at, updated_at, version, deleted)
VALUES ('00000000-0000-0000-0000-000000000004', '90f57be2-04db-4b95-a50d-cb63162b1661', NULL, 'CHECK_IN', NOW(), 'Forgot', 'PENDING', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Insert shift for publish
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, created_at, updated_at, version, deleted)
VALUES ('00000000-0000-0000-0000-000000000005', 'e07a68e8-97f2-4bd5-8f65-df0ddb2cf276', '2026-09-10', '09:00:00', '17:00:00', 'DRAFT', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Insert dummy user to soft delete
INSERT INTO staff (id, email, password_hash, system_role, created_at, updated_at, version, deleted)
VALUES ('00000000-0000-0000-0000-000000000006', 'delete_me@example.com', 'hash', 'STAFF', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Insert dummy payroll period
INSERT INTO payroll_period (id, store_id, start_date, end_date, status, created_at, updated_at, version, deleted)
VALUES ('00000000-0000-0000-0000-000000000007', 'e07a68e8-97f2-4bd5-8f65-df0ddb2cf276', '2026-08-01', '2026-08-15', 'DRAFT', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

