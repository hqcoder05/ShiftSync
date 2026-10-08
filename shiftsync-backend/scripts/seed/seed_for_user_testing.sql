-- Seed Data for End-to-End User Testing
-- Date: 2026-09-25

BEGIN;

-- 1. Ensure Store Configuration allows flexible check-in / check-out windows for testing
UPDATE store_configuration 
SET allowed_check_in_minutes = 360, 
    allowed_check_out_minutes = 360, 
    late_grace_minutes = 30
WHERE store_id = '11111111-1111-1111-1111-111111111111';

-- 2. Update Contract Types to ensure staff have adequate weekly hours
UPDATE contract_type SET max_weekly_hours = 48 WHERE id IN ('c7000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002');
UPDATE employment SET contract_type_id = 'c7000000-0000-0000-0000-000000000001' WHERE staff_id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004'
);

-- 3. Publish Today's Core Shifts (2026-09-25) & Assign key staff
UPDATE shift SET status = 'PUBLISHED' WHERE shift_date = '2026-09-25' AND store_id = '11111111-1111-1111-1111-111111111111';

-- Assign emp03 (Le Hoang Nam) to morning shift today (07:00 - 15:00) so check-in is ready right now!
DELETE FROM shift_assignment WHERE shift_id = 'f1000000-0000-0000-0000-000000000073' AND staff_id = '10000000-0000-0000-0000-000000000003';
INSERT INTO shift_assignment (id, shift_id, staff_id, source, deleted)
VALUES ('fa000001-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000073', '10000000-0000-0000-0000-000000000003', 'MANUAL', false);

-- Assign emp01 (Nguyen Minh Anh) to mid-day shift today (10:00 - 18:00)
DELETE FROM shift_assignment WHERE shift_id = 'f1000000-0000-0000-0000-000000000076' AND staff_id = '10000000-0000-0000-0000-000000000001';
INSERT INTO shift_assignment (id, shift_id, staff_id, source, deleted)
VALUES ('fa000001-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000076', '10000000-0000-0000-0000-000000000001', 'MANUAL', false);

-- 4. Create Open Shifts for Marketplace Testing (Chợ ca mở)
-- Open Shift 1: Today 2026-09-25 (11:30 - 19:30)
DELETE FROM shift WHERE store_id = '11111111-1111-1111-1111-111111111111' AND shift_date = '2026-09-25' AND start_time = '11:30:00';
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline, note)
VALUES ('fa000002-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-09-25', '11:30:00', '19:30:00', 'PUBLISHED', true, '2026-09-25 11:00:00+00', 'Ca mở gấp giờ trưa - Cần 1 Barista');

DELETE FROM shift_skill_requirement WHERE shift_id = 'fa000002-0000-0000-0000-000000000001';
INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count)
VALUES ('fa000003-0000-0000-0000-000000000001', 'fa000002-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1);

-- Open Shift 2: Tomorrow 2026-09-26 (08:30 - 16:30)
DELETE FROM shift WHERE store_id = '11111111-1111-1111-1111-111111111111' AND shift_date = '2026-09-26' AND start_time = '08:30:00';
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline, note)
VALUES ('fa000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '2026-09-26', '08:30:00', '16:30:00', 'PUBLISHED', true, '2026-09-26 08:00:00+00', 'Ca mở cuối tuần - Cần 1 Cashier');

DELETE FROM shift_skill_requirement WHERE shift_id = 'fa000002-0000-0000-0000-000000000002';
INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count)
VALUES ('fa000003-0000-0000-0000-000000000002', 'fa000002-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1);

-- 5. Create Shift Swap Scenario for Testing (Đổi ca)
-- Publish Saturday 2026-09-26 shifts
UPDATE shift SET status = 'PUBLISHED' WHERE shift_date = '2026-09-26' AND store_id = '11111111-1111-1111-1111-111111111111';

-- Assign emp02 (Tran Quoc Bao) to shift 07:00 - 15:00 on 2026-09-26
DELETE FROM shift_assignment WHERE shift_id = 'f1000000-0000-0000-0000-000000000077' AND staff_id = '10000000-0000-0000-0000-000000000002';
INSERT INTO shift_assignment (id, shift_id, staff_id, source, deleted)
VALUES ('fa000004-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000077', '10000000-0000-0000-0000-000000000002', 'AUTO', false);

-- Assign emp04 (Pham Gia Huy) to shift 14:30 - 22:30 on 2026-09-26
DELETE FROM shift_assignment WHERE shift_id = 'f1000000-0000-0000-0000-000000000078' AND staff_id = '10000000-0000-0000-0000-000000000004';
INSERT INTO shift_assignment (id, shift_id, staff_id, source, deleted)
VALUES ('fa000004-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000078', '10000000-0000-0000-0000-000000000004', 'AUTO', false);

-- Create Pending Shift Swap Request from emp02 to emp04
DELETE FROM shift_swap_request WHERE id = 'fa000005-0000-0000-0000-000000000001';
INSERT INTO shift_swap_request (id, from_shift_id, from_staff_id, to_shift_id, to_staff_id, status, employee_accepted)
VALUES (
    'fa000005-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000077',
    '10000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000078',
    '10000000-0000-0000-0000-000000000004',
    'PENDING',
    false
);

-- 6. Create Pending Leave Requests (Đơn xin nghỉ phép chờ Quản lý duyệt)
DELETE FROM leave_request WHERE id IN ('fa000006-0000-0000-0000-000000000001', 'fa000006-0000-0000-0000-000000000002');

INSERT INTO leave_request (id, store_id, staff_id, leave_type, start_date, end_date, reason, status, created_at)
VALUES 
(
    'fa000006-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000003', -- Le Hoang Nam
    'ANNUAL',
    '2026-09-28',
    '2026-09-29',
    'Gia đình có việc hiếu, xin phép nghỉ 2 ngày đầu tuần',
    'PENDING',
    NOW()
),
(
    'fa000006-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001', -- Nguyen Minh Anh
    'SICK',
    '2026-09-27',
    '2026-09-27',
    'Bị sốt cảm cúm cần đi khám bệnh và nghỉ ngơi',
    'PENDING',
    NOW()
);

-- 7. Create Pending Attendance Adjustment Request (Giải trình chấm công)
DELETE FROM attendance_adjustment_request WHERE id = 'fa000007-0000-0000-0000-000000000001';

INSERT INTO attendance_adjustment_request (id, staff_id, shift_id, requested_check_in, requested_check_out, reason, status, created_at)
VALUES (
    'fa000007-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003', -- Le Hoang Nam
    'f1000000-0000-0000-0000-000000000031', -- Friday 18/09
    '2026-09-18 07:00:00+00',
    '2026-09-18 15:05:00+00',
    'Điện thoại hết pin lúc hết ca nên không bấm check-out được, có camera giám sát xác nhận.',
    'PENDING',
    NOW()
);

-- 8. Add Generic Staff Requests for Mobile sync
DELETE FROM staff_requests WHERE id IN ('fa000008-0000-0000-0000-000000000001', 'fa000008-0000-0000-0000-000000000002');
INSERT INTO staff_requests (id, requester_name, avatar_key, request_type, type_category, recipient, start_date, end_date, shift_info, content, status, created_at)
VALUES 
(
    'fa000008-0000-0000-0000-000000000001',
    'Tran Quoc Bao',
    'victor',
    'Yêu cầu đổi ca',
    'swap',
    'Pham Gia Huy',
    '2026-09-26',
    '2026-09-26',
    'Thứ 7 (26/09) 07:00 - 15:00',
    'Đề xuất đổi ca Thứ 7 sáng lấy ca chiều của bạn Pham Gia Huy do bận học thêm',
    'Chờ duyệt',
    NOW()
),
(
    'fa000008-0000-0000-0000-000000000002',
    'Nguyen Minh Anh',
    'felix',
    'Yêu cầu xin vắng',
    'absence',
    'Quản lý cửa hàng Alice',
    '2026-09-27',
    '2026-09-27',
    'Chủ nhật (27/09) 07:00 - 15:00',
    'Xin phép vắng mặt đi thi chứng chỉ tiếng Anh',
    'Chờ duyệt',
    NOW()
);

COMMIT;
