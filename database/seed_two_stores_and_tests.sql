-- ============================================================================
-- SHIFTSYNC TEST DATASET: 2 NEW STORES & SPECIALIZED MANUAL TEST ACCOUNTS
-- Store 1: ShiftSync Pham Van Dong (854 Pham Van Dong, Hiep Binh Chanh, Thu Duc)
-- Store 2: ShiftSync Landmark 81 (208 Nguyen Huu Canh, Binh Thanh)
-- Anchor Date: 2026-09-25 (Current Live Date)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. IDEMPOTENT CLEANUP (XOA SACH VA RESET TOAN BO DATA CU CUA 2 STORE NAY)
-- ============================================================================

-- Clean tokens & preferences
DELETE FROM user_device_tokens WHERE user_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

DELETE FROM notification_preference WHERE staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

DELETE FROM notification WHERE staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

-- Clean swap requests
DELETE FROM shift_swap_request WHERE from_shift_id IN (
    SELECT id FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
) OR to_shift_id IN (
    SELECT id FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
) OR from_staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

-- Clean open shift claims
DELETE FROM open_shift_claim WHERE shift_id IN (
    SELECT id FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
) OR staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

-- Clean workforce requests
DELETE FROM workforce_proposal WHERE workforce_request_id IN (
    SELECT id FROM workforce_request WHERE requesting_store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
);

DELETE FROM workforce_request WHERE requesting_store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
   OR target_store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

-- Clean attendance & adjustment requests
DELETE FROM attendance_adjustment_request WHERE shift_id IN (
    SELECT id FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
);

DELETE FROM attendance WHERE shift_assignment_id IN (
    SELECT id FROM shift_assignment WHERE shift_id IN (
        SELECT id FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
    )
);

-- Clean shift assignments & requirements
DELETE FROM shift_assignment WHERE shift_id IN (
    SELECT id FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
);

DELETE FROM shift_skill_requirement WHERE shift_id IN (
    SELECT id FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
);

-- Clean shifts
DELETE FROM shift WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

-- Clean leave requests & blackout dates
DELETE FROM blackout_date WHERE staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
) OR leave_request_id IN (
    SELECT id FROM leave_request WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
);

DELETE FROM leave_request WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
   OR staff_id IN (
       SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
           OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
   );

DELETE FROM leave_balance WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

-- Clean availability
DELETE FROM availability WHERE staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

-- Clean staff skills & employments
DELETE FROM staff_skill WHERE staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

DELETE FROM employment WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
   OR staff_id IN (
       SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
           OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
   );

-- Clean workstations & zones
DELETE FROM workstations WHERE zone_id IN (
    SELECT id FROM store_zones WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
);

DELETE FROM store_zones WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

-- Clean skills & contract types
DELETE FROM skill WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
DELETE FROM contract_type WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

-- Clean store configurations
DELETE FROM store_configuration WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
DELETE FROM scheduler_configuration WHERE store_id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

-- Clean audit logs, device tokens, notification preferences, payroll
DELETE FROM audit_log WHERE actor_staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

DELETE FROM notification_preference WHERE staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

DELETE FROM user_device_tokens WHERE user_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

DELETE FROM payroll WHERE staff_id IN (
    SELECT id FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
        OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%'
);

-- Clean staff
DELETE FROM staff WHERE email LIKE 'manager.pvd%' OR email LIKE 'manager.lm81%' 
    OR email LIKE 'pvd.%' OR email LIKE 'lm81.%' OR email LIKE 'test.%';

-- Clean stores
DELETE FROM store WHERE id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');


-- ============================================================================
-- 2. TAO 2 CUA HANG MOI (STORES)
-- ============================================================================

INSERT INTO store (id, name, address, latitude, longitude, open_time, close_time, category, format, created_at, deleted) VALUES
('20000000-0000-0000-0000-000000000001', 'ShiftSync Pham Van Dong Store', '854 Pham Van Dong, Hiep Binh Chanh, TP. Thu Duc, TP. Ho Chi Minh', 10.8220000, 106.6257000, '06:00:00', '23:00:00', 'FOOD_BEVERAGE', 'Coffee Shop', '2026-01-01 00:00:00+07', false),
('20000000-0000-0000-0000-000000000002', 'ShiftSync Landmark 81 Store', '208 Nguyen Huu Canh, Phuong 22, Binh Thanh, TP. Ho Chi Minh', 10.7950000, 106.7218000, '07:00:00', '23:00:00', 'FOOD_BEVERAGE', 'Coffee Shop', '2026-01-01 00:00:00+07', false);

-- Configurations
INSERT INTO store_configuration (id, store_id, max_hour_per_week, min_rest_hours, geofence_radius_m, availability_deadline_hours, allowed_check_in_minutes, allowed_check_out_minutes, late_grace_minutes, early_leave_grace_minutes, shift_reminder_hours) VALUES
('20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 48, 8, 15000, 24, 720, 720, 15, 30, 2),
('20000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', 48, 8, 15000, 24, 720, 720, 15, 30, 2);

INSERT INTO scheduler_configuration (id, store_id, fairness_weight, skill_weight, hour_weight, rest_time_weight, availability_weight) VALUES
('20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000001', 0.100, 0.300, 0.200, 0.100, 0.300),
('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 0.100, 0.300, 0.200, 0.100, 0.300);

-- Zones
INSERT INTO store_zones (id, store_id, name, x_coord, y_coord, z_coord, capacity, code, zone_type, color, description, width_dim, length_dim, height_dim) VALUES
('20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000001', 'Khu Pha Che Barista', 4.0, 3.0, 0.0, 4, 'Z-PVD-BAR', 'COUNTER', '#3B82F6', 'Khu may pha ca phe espresso Pham Van Dong', 3.0, 2.0, 1.2),
('20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000001', 'Quay Thu Ngan POS', 8.0, 3.0, 0.0, 3, 'Z-PVD-POS', 'COUNTER', '#10B981', 'Quay thu ngan va order Pham Van Dong', 2.5, 2.0, 1.2),
('20000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000001', 'Khu Ban Khach', 14.0, 8.0, 0.0, 8, 'Z-PVD-DINE', 'SEATING', '#F59E0B', 'Khu ban ghe khach dung tai cho PVD', 8.0, 6.0, 3.0),

('20000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000002', 'Khu Pha Che Barista LM81', 4.0, 3.0, 0.0, 4, 'Z-LM-BAR', 'COUNTER', '#6366F1', 'Khu pha che specialty Landmark 81', 3.0, 2.0, 1.2),
('20000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000002', 'Quay Thu Ngan POS LM81', 8.0, 3.0, 0.0, 3, 'Z-LM-POS', 'COUNTER', '#EC4899', 'Quay thu ngan POS Landmark 81', 2.5, 2.0, 1.2),
('20000000-0000-0000-0000-000000000036', '20000000-0000-0000-0000-000000000002', 'Khu Phuc Vu Lounge', 14.0, 8.0, 0.0, 8, 'Z-LM-LOUNGE', 'SEATING', '#8B5CF6', 'Khu vuc tiep khach Lounge Landmark 81', 8.0, 6.0, 3.0);

-- Workstations
INSERT INTO workstations (id, store_id, zone_id, name, code, workstation_type, x_coord, y_coord, z_coord, capacity, is_active) VALUES
('20000000-0000-0000-0000-000000000041', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000031', 'May Pha Espresso PVD-01', 'WS-PVD-ESP1', 'BARISTA_BAR', 4.0, 2.5, 0.9, 2, true),
('20000000-0000-0000-0000-000000000042', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000032', 'May POS Thu Ngan PVD-01', 'WS-PVD-POS1', 'CASHIER_STATION', 8.0, 2.5, 0.9, 2, true),
('20000000-0000-0000-0000-000000000043', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000034', 'May Pha Espresso LM81-01', 'WS-LM-ESP1', 'BARISTA_BAR', 4.0, 2.5, 0.9, 2, true),
('20000000-0000-0000-0000-000000000044', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000035', 'May POS Thu Ngan LM81-01', 'WS-LM-POS1', 'CASHIER_STATION', 8.0, 2.5, 0.9, 2, true);

-- Contract Types
INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate) VALUES
('20000000-0000-0000-0000-000000000051', '20000000-0000-0000-0000-000000000001', 'Toan Thoi Gian (Full-Time)', 40, 1.50, 30.00),
('20000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000001', 'Ban Thoi Gian (Part-Time)', 25, 1.25, 24.00),
('20000000-0000-0000-0000-000000000053', '20000000-0000-0000-0000-000000000002', 'Toan Thoi Gian (Full-Time)', 40, 1.50, 32.00),
('20000000-0000-0000-0000-000000000054', '20000000-0000-0000-0000-000000000002', 'Ban Thoi Gian (Part-Time)', 25, 1.25, 25.00);

-- Skills
INSERT INTO skill (id, store_id, name, description) VALUES
('20000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000001', 'Barista', 'Pha che ca phe va thuc uong cao cap tai Pham Van Dong'),
('20000000-0000-0000-0000-000000000062', '20000000-0000-0000-0000-000000000001', 'Cashier', 'Thu ngan, doi soat hoa don va nhan order tai quay'),
('20000000-0000-0000-0000-000000000063', '20000000-0000-0000-0000-000000000001', 'Waiter', 'Phuc vu ban, cham soc khach hang va sap xep cho ngoi'),

('20000000-0000-0000-0000-000000000064', '20000000-0000-0000-0000-000000000002', 'Barista', 'Pha che ca phe phong cach Specialty tai Landmark 81'),
('20000000-0000-0000-0000-000000000065', '20000000-0000-0000-0000-000000000002', 'Cashier', 'Thu ngan va thanh toan the cao cap tai Landmark 81'),
('20000000-0000-0000-0000-000000000066', '20000000-0000-0000-0000-000000000002', 'Waiter', 'Phuc vu khach hang phong cach Lounge Landmark 81');


-- ============================================================================
-- 3. TAO TAI KHOAN NHAN SU (STAFF)
-- Mat khau chung: password123
-- ============================================================================

INSERT INTO staff (id, full_name, email, phone, password_hash, system_role, created_at, updated_at, version, deleted, avatar_id) VALUES
-- 3.1 Quan ly 2 chi nhanh
('21000000-0000-0000-0000-000000000001', 'Tran Quan Ly PVD', 'manager.pvd@shiftsync.com', '0908000001', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'MANAGER', now(), now(), 0, false, 'dilan'),
('21000000-0000-0000-0000-000000000002', 'Le Quan Ly Landmark', 'manager.lm81@shiftsync.com', '0908000002', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'MANAGER', now(), now(), 0, false, 'ken'),

-- 3.2 Nhan vien chi nhanh Pham Van Dong (PVD)
('21000000-0000-0000-0000-000000000011', 'Nguyen Van An (PVD)', 'pvd.staff01@shiftsync.com', '0908000011', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'aria'),
('21000000-0000-0000-0000-000000000012', 'Tran Thi Bich (PVD)', 'pvd.staff02@shiftsync.com', '0908000012', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'victor'),
('21000000-0000-0000-0000-000000000013', 'Le Hoang Cuong (PVD)', 'pvd.staff03@shiftsync.com', '0908000013', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'leo'),
('21000000-0000-0000-0000-000000000014', 'Pham Minh Duc (PVD)', 'pvd.staff04@shiftsync.com', '0908000014', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'felix'),
('21000000-0000-0000-0000-000000000015', 'Vu Thu Ha (PVD)', 'pvd.staff05@shiftsync.com', '0908000015', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'sarah'),

-- 3.3 Nhan vien chi nhanh Landmark 81 (LM81)
('21000000-0000-0000-0000-000000000021', 'Dang Quoc Hung (LM81)', 'lm81.staff01@shiftsync.com', '0908000021', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'dilan'),
('21000000-0000-0000-0000-000000000022', 'Bui Mai Linh (LM81)', 'lm81.staff02@shiftsync.com', '0908000022', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'aria'),
('21000000-0000-0000-0000-000000000023', 'Do Tuan Nam (LM81)', 'lm81.staff03@shiftsync.com', '0908000023', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'victor'),
('21000000-0000-0000-0000-000000000024', 'Hoang Kim Ngan (LM81)', 'lm81.staff04@shiftsync.com', '0908000024', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'sarah'),
('21000000-0000-0000-0000-000000000025', 'Ngo Gia Phuc (LM81)', 'lm81.staff05@shiftsync.com', '0908000025', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'leo'),

-- 3.4 TAI KHOAN CHUYEN DUNG TEST THU CONG (MANUAL TESTERS)
('21000000-0000-0000-0000-000000000031', 'Test Checkin PVD', 'test.checkin@shiftsync.com', '0909000001', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'felix'),
('21000000-0000-0000-0000-000000000032', 'Test Dang Ky Lich', 'test.dangky@shiftsync.com', '0909000002', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'sarah'),
('21000000-0000-0000-0000-000000000033', 'Test Xin Nghi Phep', 'test.xinnghi@shiftsync.com', '0909000003', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'aria'),
('21000000-0000-0000-0000-000000000034', 'Test Doi Ca 1', 'test.doica1@shiftsync.com', '0909000004', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'dilan'),
('21000000-0000-0000-0000-000000000035', 'Test Doi Ca 2', 'test.doica2@shiftsync.com', '0909000005', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF', now(), now(), 0, false, 'ken');


-- ============================================================================
-- 4. HOP DONG & PHAN BO NHAN SU VAO CHI NHANH (EMPLOYMENT)
-- ============================================================================

INSERT INTO employment (id, staff_id, store_id, hourly_rate, status, joined_date, left_date, contract_type_id) VALUES
-- Quan ly
('22000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 40.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051'),
('22000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 40.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000053'),

-- Nhan vien PVD
('22000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 30.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051'),
('22000000-0000-0000-0000-000000000012', '21000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', 28.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051'),
('22000000-0000-0000-0000-000000000013', '21000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000001', 24.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000052'),
('22000000-0000-0000-0000-000000000014', '21000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000001', 30.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051'),
('22000000-0000-0000-0000-000000000015', '21000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000001', 25.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000052'),

-- Nhan vien LM81
('22000000-0000-0000-0000-000000000021', '21000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000002', 32.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000053'),
('22000000-0000-0000-0000-000000000022', '21000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 30.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000053'),
('22000000-0000-0000-0000-000000000023', '21000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000002', 25.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000054'),
('22000000-0000-0000-0000-000000000024', '21000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000002', 32.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000053'),
('22000000-0000-0000-0000-000000000025', '21000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000002', 26.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000054'),

-- Tai khoan manual test (deu gan tai Store PVD de tien di chuyen / trai nghiem)
('22000000-0000-0000-0000-000000000031', '21000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000001', 30.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051'),
('22000000-0000-0000-0000-000000000032', '21000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000001', 25.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000052'),
('22000000-0000-0000-0000-000000000033', '21000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000001', 30.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051'),
('22000000-0000-0000-0000-000000000034', '21000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000001', 30.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051'),
('22000000-0000-0000-0000-000000000035', '21000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000001', 30.00, 'ACTIVE', '2026-01-01', NULL, '20000000-0000-0000-0000-000000000051');

-- Ky nang nhan vien (Staff Skills)
INSERT INTO staff_skill (id, staff_id, skill_id, level, expiration_date) VALUES
-- PVD Staff
('23000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000061', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000012', '21000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000062', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000013', '21000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000063', 'ADVANCED', NULL),
('23000000-0000-0000-0000-000000000016', '21000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000061', 'INTERMEDIATE', NULL),
('23000000-0000-0000-0000-000000000017', '21000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000062', 'INTERMEDIATE', NULL),
('23000000-0000-0000-0000-000000000014', '21000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000061', 'ADVANCED', NULL),
('23000000-0000-0000-0000-000000000015', '21000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000062', 'ADVANCED', NULL),

-- LM81 Staff
('23000000-0000-0000-0000-000000000021', '21000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000064', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000022', '21000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000065', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000023', '21000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000066', 'ADVANCED', NULL),
('23000000-0000-0000-0000-000000000024', '21000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000064', 'ADVANCED', NULL),
('23000000-0000-0000-0000-000000000025', '21000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000065', 'ADVANCED', NULL),

-- Manual Test Staff (co day du skill Barista & Cashier de test moi vai tro)
('23000000-0000-0000-0000-000000000031', '21000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000061', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000032', '21000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000061', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000033', '21000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000061', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000034', '21000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000061', 'EXPERT', NULL),
('23000000-0000-0000-0000-000000000035', '21000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000061', 'EXPERT', NULL);

-- Quy phep nam (Leave Balance) - Khoi tao 12 ngay phep cho tat ca
INSERT INTO leave_balance (id, staff_id, store_id, year, annual_entitlement, carry_over_days, used_days, pending_days, updated_at, version)
SELECT 
    gen_random_uuid(),
    s.id,
    e.store_id,
    2026,
    12,
    0,
    0,
    0,
    now(),
    0
FROM staff s
JOIN employment e ON s.id = e.staff_id
WHERE s.email LIKE 'manager.pvd%' OR s.email LIKE 'manager.lm81%' 
   OR s.email LIKE 'pvd.%' OR s.email LIKE 'lm81.%' OR s.email LIKE 'test.%';

-- Lich ranh (Availability) tu Thu Hai den Chu Nhat (0..6) cho nhan vien PVD va LM81 (06:30 - 22:30)
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
SELECT 
    gen_random_uuid(),
    s.id,
    d.day,
    '06:30:00'::time,
    '22:30:00'::time
FROM staff s
CROSS JOIN (VALUES (0::smallint), (1::smallint), (2::smallint), (3::smallint), (4::smallint), (5::smallint), (6::smallint)) AS d(day)
WHERE s.email LIKE 'pvd.%' OR s.email LIKE 'lm81.%';

-- Lich ranh cho tai khoan manual test co ca lam viec cu the
-- test.checkin (Thu Sau = 5)
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
VALUES (gen_random_uuid(), '21000000-0000-0000-0000-000000000031', 5, '07:00:00', '23:00:00');

-- test.doica1 (Thu Bay = 6)
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
VALUES (gen_random_uuid(), '21000000-0000-0000-0000-000000000034', 6, '06:30:00', '16:00:00');

-- test.doica2 (Thu Bay = 6)
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
VALUES (gen_random_uuid(), '21000000-0000-0000-0000-000000000035', 6, '14:00:00', '23:00:00');

-- test.xinnghi (Thu Hai = 1)
INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time)
VALUES (gen_random_uuid(), '21000000-0000-0000-0000-000000000033', 1, '07:00:00', '17:00:00');
-- LUU Y: test.dangky@shiftsync.com co tinh KHONG INSERT availability de nguoi dung tu test dang ky ranh tren Mobile!


-- ============================================================================
-- 5. CA LAM VIEC (SHIFTS & SHIFT ASSIGNMENTS)
-- ============================================================================

-- 5.1 Ca hom nay (2026-09-25) danh cho test.checkin@shiftsync.com tai Store PVD (854 Pham Van Dong)
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-09-25', '14:00:00', '22:00:00', 'PUBLISHED', '2026-09-24 12:00:00+07', false, 0, 'Ca chieu hom nay (14:00 - 22:00) tai 854 Pham Van Dong');

INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count, zone_id, workstation_id) VALUES
('25000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),
('25000000-0000-0000-0000-000000000003', '24000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000063', 1, '20000000-0000-0000-0000-000000000033', NULL);

INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, zone_id, required_skill_id, workstation_id) VALUES
('26000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000031', 'MANUAL', now(), false, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000041');

-- 5.2 Hai ca ngay mai (2026-09-26) danh cho test.doica1 va test.doica2 de test thu cong doi ca
-- Ca sang (07:00 - 15:00) giao cho test.doica1
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '2026-09-26', '07:00:00', '15:00:00', 'PUBLISHED', '2026-09-25 12:00:00+07', false, 0, 'Ca sang T7 PVD - Test Doi Ca 1');

INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, zone_id, required_skill_id, workstation_id) VALUES
('26000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000034', 'MANUAL', now(), false, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000041');

-- Ca chieu (14:30 - 22:30) giao cho test.doica2
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '2026-09-26', '14:30:00', '22:30:00', 'PUBLISHED', '2026-09-25 12:00:00+07', false, 0, 'Ca chieu T7 PVD - Test Doi Ca 2');

INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, zone_id, required_skill_id, workstation_id) VALUES
('26000000-0000-0000-0000-000000000003', '24000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000035', 'MANUAL', now(), false, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000041');

-- 5.3 Ca ngay 2026-09-28 danh cho test.xinnghi de test thu cong xin nghi phep
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '2026-09-28', '08:00:00', '16:00:00', 'PUBLISHED', '2026-09-27 12:00:00+07', false, 0, 'Ca lam T2 PVD - Test Xin Nghi Phep');

INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, zone_id, required_skill_id, workstation_id) VALUES
('26000000-0000-0000-0000-000000000004', '24000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000033', 'MANUAL', now(), false, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000041');


-- ============================================================================
-- 6. MARKETPLACE TEST DATA (CA MO, MUON NHAN SU, YEU CAU DOI CA CHO DUYET)
-- ============================================================================

-- 6.1 Ca mo (Open Shift) tai Pham Van Dong ngay 2026-09-26 (de test.dangky nhan ca)
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', '2026-09-26', '10:00:00', '18:00:00', 'PUBLISHED', '2026-09-26 09:00:00+07', true, 0, 'Ca mo Marketplace tai PVD - Dang tuyen Barista');

INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count, zone_id, workstation_id) VALUES
('25000000-0000-0000-0000-000000000011', '24000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041');

-- 6.2 Ca mo (Open Shift) tai Landmark 81 ngay 2026-09-27
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', '2026-09-27', '09:00:00', '17:00:00', 'PUBLISHED', '2026-09-26 18:00:00+07', true, 0, 'Ca mo Marketplace tai Landmark 81 - Tuyen Barista');

INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count, zone_id, workstation_id) VALUES
('25000000-0000-0000-0000-000000000012', '24000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000064', 1, '20000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000043');

-- 6.3 Yeu cau muon nhan su lien chi nhanh (Workforce Sharing):
-- Store PVD thieu nguoi ngay 2026-09-27 -> Gui yeu cau muon 1 Barista toi Landmark 81
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000001', '2026-09-27', '08:00:00', '16:00:00', 'PUBLISHED', '2026-09-26 12:00:00+07', false, 0, 'Ca can muon nhan su tu Landmark 81');

INSERT INTO workforce_request (id, requesting_store_id, target_store_id, shift_id, status, created_by, created_at, updated_at) VALUES
('27000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000013', 'PENDING', '21000000-0000-0000-0000-000000000001', now(), now());

-- 6.4 Yeu cau doi ca mau san sang de Quan ly duyet ngay tren Web Marketplace
-- Hai ca ngay 2026-09-29 tai PVD:
-- Ca A: 07:00 - 15:00 giao cho pvd.staff01
-- Ca B: 14:30 - 22:30 giao cho pvd.staff02
INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
('24000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000001', '2026-09-29', '07:00:00', '15:00:00', 'PUBLISHED', '2026-09-28 12:00:00+07', false, 0, 'Ca sang 29/09 PVD - Nguyen Van An'),
('24000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000001', '2026-09-29', '14:30:00', '22:30:00', 'PUBLISHED', '2026-09-28 12:00:00+07', false, 0, 'Ca chieu 29/09 PVD - Tran Thi Bich');

INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, zone_id, required_skill_id, workstation_id) VALUES
('26000000-0000-0000-0000-000000000021', '24000000-0000-0000-0000-000000000021', '21000000-0000-0000-0000-000000000011', 'MANUAL', now(), false, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000041'),
('26000000-0000-0000-0000-000000000022', '24000000-0000-0000-0000-000000000022', '21000000-0000-0000-0000-000000000012', 'MANUAL', now(), false, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000062', '20000000-0000-0000-0000-000000000042');

-- Yeu cau doi ca: Nguyen Van An gui Tran Thi Bich, Tran Thi Bich DA DONG Y -> Cho Quan ly duyet
-- Va Yeu cau doi ca mau theo Kich ban 4: test.doica1 gui test.doica2 (CHUA DONG Y, employee_accepted = false) -> Nhan vien B can phan hoi, Quan ly CHUA duoc phep duyet
INSERT INTO shift_swap_request (id, from_shift_id, from_staff_id, to_staff_id, to_shift_id, status, employee_accepted) VALUES
('28000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000021', '21000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000012', '24000000-0000-0000-0000-000000000022', 'PENDING', true),
('28000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000034', '21000000-0000-0000-0000-000000000035', '24000000-0000-0000-0000-000000000003', 'PENDING', false);

-- Thong bao mau cho quan ly PVD ve yeu cau doi ca va cho Nhan vien B (test.doica2)
INSERT INTO notification (id, staff_id, type, title, message, is_read, created_at) VALUES
('29000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'SHIFT_SWAP_REQUESTED', 'Yeu cau doi ca cho duyet', 'Nguyen Van An va Tran Thi Bich da dong y doi ca ngay 29/09. Vui long phe duyet tren Marketplace.', false, now()),
('29000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'WORKFORCE_REQUESTED', 'Yeu cau muon nhan su moi', 'Chi nhanh Pham Van Dong de nghi ho tro 1 nhan su Barista cho ngay 27/09.', false, now()),
('29000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000035', 'SHIFT_SWAP_REQUESTED', 'Yeu cau doi ca moi', 'Nhan vien Doi ca 1 de nghi doi ca lam ngay 26/09 voi ban. Vui long kiem tra va xac nhan.', false, now());


-- ============================================================================
-- 7. CA LAM VIEC DRAFT DE TEST THUAT TOAN XEP LICH TU DONG (AUTO-SCHEDULE)
-- Tuan: 2026-09-30 (Thu Tu) den 2026-10-04 (Chu Nhat) tai Store Pham Van Dong
-- Cac ca nay chua duoc gan nhan vien (shift_assignment trong), dang o trang thai DRAFT.
-- ============================================================================

INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version, note) VALUES
-- Thu Tu 2026-09-30
('24000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000001', '2026-09-30', '07:00:00', '15:00:00', 'DRAFT', '2026-09-29 12:00:00+07', false, 0, 'Ca nhap Sang PVD - Cho Auto Schedule'),
('24000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000001', '2026-09-30', '14:30:00', '22:30:00', 'DRAFT', '2026-09-29 12:00:00+07', false, 0, 'Ca nhap Chieu PVD - Cho Auto Schedule'),

-- Thu Nam 2026-10-01
('24000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000001', '2026-10-01', '07:00:00', '15:00:00', 'DRAFT', '2026-09-30 12:00:00+07', false, 0, 'Ca nhap Sang PVD - Cho Auto Schedule'),
('24000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000001', '2026-10-01', '14:30:00', '22:30:00', 'DRAFT', '2026-09-30 12:00:00+07', false, 0, 'Ca nhap Chieu PVD - Cho Auto Schedule'),

-- Thu Sau 2026-10-02
('24000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000001', '2026-10-02', '07:00:00', '15:00:00', 'DRAFT', '2026-10-01 12:00:00+07', false, 0, 'Ca nhap Sang PVD - Cho Auto Schedule'),
('24000000-0000-0000-0000-000000000036', '20000000-0000-0000-0000-000000000001', '2026-10-02', '14:30:00', '22:30:00', 'DRAFT', '2026-10-01 12:00:00+07', false, 0, 'Ca nhap Chieu PVD - Cho Auto Schedule'),

-- Thu Bay 2026-10-03
('24000000-0000-0000-0000-000000000037', '20000000-0000-0000-0000-000000000001', '2026-10-03', '07:00:00', '15:00:00', 'DRAFT', '2026-10-02 12:00:00+07', false, 0, 'Ca nhap Sang PVD - Cho Auto Schedule'),
('24000000-0000-0000-0000-000000000038', '20000000-0000-0000-0000-000000000001', '2026-10-03', '14:30:00', '22:30:00', 'DRAFT', '2026-10-02 12:00:00+07', false, 0, 'Ca nhap Chieu PVD - Cho Auto Schedule'),

-- Chu Nhat 2026-10-04
('24000000-0000-0000-0000-000000000039', '20000000-0000-0000-0000-000000000001', '2026-10-04', '07:00:00', '15:00:00', 'DRAFT', '2026-10-03 12:00:00+07', false, 0, 'Ca nhap Sang PVD - Cho Auto Schedule'),
('24000000-0000-0000-0000-000000000040', '20000000-0000-0000-0000-000000000001', '2026-10-04', '14:30:00', '22:30:00', 'DRAFT', '2026-10-03 12:00:00+07', false, 0, 'Ca nhap Chieu PVD - Cho Auto Schedule');

-- Yeu cau ky nang cho cac ca DRAFT (Moi ca can 1 Barista + 1 Cashier)
INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count, zone_id, workstation_id) VALUES
-- 2026-09-30
('25000000-0000-0000-0000-000000000031', '24000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000032', '24000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),
('25000000-0000-0000-0000-000000000033', '24000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000034', '24000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),

-- 2026-10-01
('25000000-0000-0000-0000-000000000035', '24000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000036', '24000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),
('25000000-0000-0000-0000-000000000037', '24000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000038', '24000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),

-- 2026-10-02
('25000000-0000-0000-0000-000000000039', '24000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000040', '24000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),
('25000000-0000-0000-0000-000000000041', '24000000-0000-0000-0000-000000000036', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000042', '24000000-0000-0000-0000-000000000036', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),

-- 2026-10-03
('25000000-0000-0000-0000-000000000043', '24000000-0000-0000-0000-000000000037', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000044', '24000000-0000-0000-0000-000000000037', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),
('25000000-0000-0000-0000-000000000045', '24000000-0000-0000-0000-000000000038', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000046', '24000000-0000-0000-0000-000000000038', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),

-- 2026-10-04
('25000000-0000-0000-0000-000000000047', '24000000-0000-0000-0000-000000000039', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000048', '24000000-0000-0000-0000-000000000039', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042'),
('25000000-0000-0000-0000-000000000049', '24000000-0000-0000-0000-000000000040', '20000000-0000-0000-0000-000000000061', 1, '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000041'),
('25000000-0000-0000-0000-000000000050', '24000000-0000-0000-0000-000000000040', '20000000-0000-0000-0000-000000000062', 1, '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000042');

COMMIT;
