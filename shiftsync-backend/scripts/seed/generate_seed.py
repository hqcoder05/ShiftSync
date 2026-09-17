import os
from datetime import datetime, timedelta

def generate_sql():
    sql = []
    sql.append('-- ============================================================================')
    sql.append('-- SHIFTSYNC MASTER PRODUCTION & DEMO SEED DATASET')
    sql.append('-- Generated for local run, demo, QA, and defense')
    sql.append('-- Anchor date: 2026-09-17 (Thursday)')
    sql.append('-- Current Week (2026-09-14 to 2026-09-20): Published, Assigned, Attended, 3D Zones')
    sql.append('-- Next Week (2026-09-21 to 2026-09-27): Draft Shifts for Auto-Scheduling')
    sql.append('-- ============================================================================')
    sql.append('BEGIN;')
    sql.append('')

    # 1. Truncate
    sql.append('-- 1. TRUNCATE ALL TABLES (Cascade)')
    sql.append('''TRUNCATE TABLE
    attendance_adjustment_request,
    attendance,
    shift_swap_request,
    open_shift_claim,
    shift_skill_requirement,
    shift_assignment,
    workforce_proposal,
    workforce_request,
    blackout_date,
    leave_request,
    shift,
    shift_template,
    workstations,
    store_zones,
    store_layouts,
    payroll,
    payroll_period,
    staff_skill,
    availability,
    notification,
    notification_preference,
    user_device_tokens,
    audit_log,
    staff_requests,
    employment,
    contract_type,
    skill,
    scheduler_configuration,
    store_configuration,
    staff,
    store,
    holiday
CASCADE;
''')

    # 2. Stores
    sql.append('-- 2. STORES (Flagship & Riverside)')
    sql.append('''INSERT INTO store (id, name, address, latitude, longitude, open_time, close_time, category, format, created_at, deleted)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'ShiftSync Flagship Store', '123 Le Loi, Ben Nghe, District 1, Ho Chi Minh City', 10.7768890, 106.7008060, '06:00:00', '23:00:00', 'FOOD_BEVERAGE', 'Coffee Shop', NOW(), false),
    ('77777777-7777-7777-7777-777777777777', 'ShiftSync Riverside Store', '456 Ton Duc Thang, Ben Nghe, District 1, Ho Chi Minh City', 10.7712340, 106.7056780, '07:00:00', '22:00:00', 'FOOD_BEVERAGE', 'Coffee Shop', NOW(), false);
''')

    # 3. Configurations
    sql.append('-- 3. CONFIGURATIONS')
    sql.append('''INSERT INTO store_configuration (id, store_id, max_hour_per_week, min_rest_hours, geofence_radius_m, availability_deadline_hours, allowed_check_in_minutes, allowed_check_out_minutes, late_grace_minutes, early_leave_grace_minutes, shift_reminder_hours)
VALUES
    ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 48, 8, 100, 24, 30, 60, 5, 5, 2),
    ('c0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 48, 8, 100, 24, 30, 60, 5, 5, 2);

INSERT INTO scheduler_configuration (id, store_id, fairness_weight, skill_weight, hour_weight, rest_time_weight, availability_weight)
VALUES
    ('c0000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 0.100, 0.300, 0.200, 0.100, 0.300),
    ('c0000000-0000-0000-0000-000000000012', '77777777-7777-7777-7777-777777777777', 0.100, 0.300, 0.200, 0.100, 0.300);
''')

    # 4. Contract Types
    sql.append('-- 4. CONTRACT TYPES')
    sql.append('''INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate)
VALUES
    ('c7000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Full-Time', 40, 1.50, 30.00),
    ('c7000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Part-Time', 25, 1.25, 22.00),
    ('c7000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Seasonal', 35, 1.30, 25.00),
    ('c7000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Intern', 20, 1.00, 15.00),
    ('c7000000-0000-0000-0000-000000000005', '77777777-7777-7777-7777-777777777777', 'Store 2 Standard', 40, 1.50, 28.00),
    ('c7000000-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777', 'Store 2 Part-Time', 25, 1.25, 20.00);
''')

    # 5. Skills
    sql.append('-- 5. SKILLS')
    sql.append('''INSERT INTO skill (id, store_id, name, description)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Barista', 'Mastery of espresso machines and beverage crafting'),
    ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cashier', 'Point of Sale operations and cash reconciliation'),
    ('b0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Waiter', 'Customer service and floor order management'),
    ('b0000000-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777', 'Barista', 'Barista for Riverside store'),
    ('b0000000-0000-0000-0000-000000000007', '77777777-7777-7777-7777-777777777777', 'Cashier', 'Cashier for Riverside store'),
    ('b0000000-0000-0000-0000-000000000008', '77777777-7777-7777-7777-777777777777', 'Waiter', 'Waiter for Riverside store');
''')

    # 6. Staff Accounts
    # password123 hash: $2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu
    sql.append('-- 6. STAFF ACCOUNTS')
    sql.append('''INSERT INTO staff (id, full_name, email, phone, password_hash, system_role, created_at, updated_at, version, deleted)
VALUES
    ('99999999-9999-9999-9999-999999999999', 'System Administrator', 'admin@shiftsync.com', '+84900000000', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'ADMIN'::system_role_enum, NOW(), NOW(), 0, false),
    ('88888888-8888-8888-8888-888888888888', 'Store Manager Alice', 'manager@shiftsync.com', '+84911111111', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'MANAGER'::system_role_enum, NOW(), NOW(), 0, false),
    ('88888888-8888-8888-8888-888888888889', 'Store Manager Bob', 'manager.store2@shiftsync.com', '+84922222222', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'MANAGER'::system_role_enum, NOW(), NOW(), 0, false),
    ('70000000-0000-0000-0000-000000000001', 'Riverside Staff Chris', 'chris.store2@shiftsync.com', '+84933333333', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false),
    ('70000000-0000-0000-0000-000000000002', 'Riverside Staff David', 'david.store2@shiftsync.com', '+84933333334', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false),
    ('70000000-0000-0000-0000-000000000003', 'Riverside Staff Emma', 'emma.store2@shiftsync.com', '+84933333335', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false),
    ('99999999-9999-9999-9999-999999999998', 'Quoc Admin', 'quocadmin@shiftsync.com', '+84988000001', '$2a$10$8lJXUc5cNKvV5nHGoWJB6uvPChkL3JO5xnNJgcFbFdBejoUhG9RBO', 'ADMIN'::system_role_enum, NOW(), NOW(), 0, false),
    ('88888888-8888-8888-8888-888888888898', 'Quoc Manager', 'quocmanager@shiftsync.com', '+84988000002', '$2a$10$8lJXUc5cNKvV5nHGoWJB6uvPChkL3JO5xnNJgcFbFdBejoUhG9RBO', 'MANAGER'::system_role_enum, NOW(), NOW(), 0, false),
    ('10000000-0000-0000-0000-000000000099', 'Quoc Staff', 'quocstaff@shiftsync.com', '+84988000003', '$2a$10$8lJXUc5cNKvV5nHGoWJB6uvPChkL3JO5xnNJgcFbFdBejoUhG9RBO', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false);
''')

    # 20 Store 1 Staff
    vn_names = [
        'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Phạm Minh Đức', 'Hoàng Thu Hà',
        'Vũ Đình Khang', 'Đặng Mai Linh', 'Bùi Quốc Nam', 'Ngô Phương Oanh', 'Dương Tiến Phát',
        'Hồ Thanh Quang', 'Lý Hải Sơn', 'Đỗ Trọng Tấn', 'Mai Kiều Uyên', 'Trịnh Hoài Vân',
        'Lương Bảo Xuân', 'Võ Quỳnh Yên', 'Phan Gia Bảo', 'Đoàn Tuấn Kiệt', 'Tô Thùy Trang'
    ]
    emp_inserts = []
    for i in range(1, 21):
        num_str = f"{i:02d}"
        staff_id = f"10000000-0000-0000-0000-0000000000{num_str}"
        name = vn_names[i - 1]
        email = f"emp{num_str}@shiftsync.com"
        phone = f"+849010000{num_str}"
        emp_inserts.append(f"    ('{staff_id}', '{name}', '{email}', '{phone}', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false)")

    sql.append("INSERT INTO staff (id, full_name, email, phone, password_hash, system_role, created_at, updated_at, version, deleted) VALUES\n" + ",\n".join(emp_inserts) + ";\n")

    # 7. Employments
    sql.append('-- 7. EMPLOYMENTS')
    sql.append('''INSERT INTO employment (id, staff_id, store_id, hourly_rate, status, joined_date, left_date, contract_type_id)
VALUES
    ('e8888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 50.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000001'),
    ('e8888888-8888-8888-8888-888888888889', '88888888-8888-8888-8888-888888888889', '77777777-7777-7777-7777-777777777777', 50.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000005'),
    ('e7000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 28.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000005'),
    ('e7000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 25.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000005'),
    ('e7000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777', 22.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000006'),
    ('e8888888-8888-8888-8888-888888888898', '88888888-8888-8888-8888-888888888898', '11111111-1111-1111-1111-111111111111', 50.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000001'),
    ('e1000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000099', '11111111-1111-1111-1111-111111111111', 30.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000001');
''')

    emp_configs = [
        (1, "c7000000-0000-0000-0000-000000000001", 35.00), # Full-Time Senior Specialist
        (2, "c7000000-0000-0000-0000-000000000001", 32.00), # Full-Time Senior Barista
        (3, "c7000000-0000-0000-0000-000000000001", 30.00), # Full-Time Barista
        (4, "c7000000-0000-0000-0000-000000000001", 30.00), # Full-Time Cashier
        (5, "c7000000-0000-0000-0000-000000000001", 30.00), # Full-Time Barista & Cashier
        (6, "c7000000-0000-0000-0000-000000000002", 22.00), # Part-Time Morning Barista
        (7, "c7000000-0000-0000-0000-000000000002", 22.00), # Part-Time Morning Cashier
        (8, "c7000000-0000-0000-0000-000000000002", 20.00), # Part-Time Evening Waiter
        (9, "c7000000-0000-0000-0000-000000000002", 20.00), # Part-Time Evening Waiter
        (10, "c7000000-0000-0000-0000-000000000002", 24.00), # Part-Time Evening Dual-Skill
        (11, "c7000000-0000-0000-0000-000000000003", 26.00), # Seasonal Cashier & Waiter
        (12, "c7000000-0000-0000-0000-000000000003", 25.00), # Seasonal Waiter
        (13, "c7000000-0000-0000-0000-000000000003", 25.00), # Seasonal Cashier
        (14, "c7000000-0000-0000-0000-000000000003", 27.00), # Seasonal Barista
        (15, "c7000000-0000-0000-0000-000000000004", 16.00), # Intern Waiter Trainee
        (16, "c7000000-0000-0000-0000-000000000004", 15.00), # Intern Waiter Trainee
        (17, "c7000000-0000-0000-0000-000000000001", 32.00), # Full-Time Triple-Skill Senior
        (18, "c7000000-0000-0000-0000-000000000001", 34.00), # Full-Time Senior Specialist
        (19, "c7000000-0000-0000-0000-000000000002", 21.00), # Part-Time Weekend Only
        (20, "c7000000-0000-0000-0000-000000000001", 38.00), # Full-Time All-Rounder
    ]

    emp_rows = []
    for i, ct_id, rate in emp_configs:
        num_str = f"{i:02d}"
        emp_id = f"e0000000-0000-0000-0000-0000000000{num_str}"
        staff_id = f"10000000-0000-0000-0000-0000000000{num_str}"
        emp_rows.append(f"    ('{emp_id}', '{staff_id}', '11111111-1111-1111-1111-111111111111', {rate:.2f}, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, '{ct_id}')")

    sql.append("INSERT INTO employment (id, staff_id, store_id, hourly_rate, status, joined_date, left_date, contract_type_id) VALUES\n" + ",\n".join(emp_rows) + ";\n")

    # 8. Staff Skills
    sk1 = 'b0000000-0000-0000-0000-000000000001' # Store 1 Barista
    sk2 = 'b0000000-0000-0000-0000-000000000002' # Store 1 Cashier
    sk3 = 'b0000000-0000-0000-0000-000000000003' # Store 1 Waiter
    sk6 = 'b0000000-0000-0000-0000-000000000006' # Store 2 Barista
    sk7 = 'b0000000-0000-0000-0000-000000000007' # Store 2 Cashier
    sk8 = 'b0000000-0000-0000-0000-000000000008' # Store 2 Waiter

    staff_skills_data = [
        # Store 2 staff
        ('70000000-0000-0000-0000-000000000001', sk6, 'ADVANCED'),
        ('70000000-0000-0000-0000-000000000001', sk7, 'INTERMEDIATE'),
        ('70000000-0000-0000-0000-000000000002', sk7, 'ADVANCED'),
        ('70000000-0000-0000-0000-000000000002', sk8, 'INTERMEDIATE'),
        ('70000000-0000-0000-0000-000000000003', sk8, 'ADVANCED'),
        # Store 1 staff
        ('10000000-0000-0000-0000-000000000001', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000001', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000001', sk3, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000002', sk1, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000002', sk2, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000003', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000003', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000004', sk2, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000004', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000005', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000005', sk2, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000006', sk1, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000006', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000007', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000007', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000008', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000008', sk2, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000009', sk3, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000010', sk1, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000010', sk2, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000011', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000011', sk3, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000012', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000013', sk2, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000014', sk1, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000015', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000016', sk2, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000016', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000017', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000017', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000017', sk3, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000018', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000018', sk3, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000019', sk1, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000020', sk1, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000020', sk2, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000020', sk3, 'EXPERT'),
        # Quoc Staff
        ('10000000-0000-0000-0000-000000000099', sk1, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000099', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000099', sk3, 'ADVANCED'),
    ]

    sk_rows = []
    for idx, (s_id, sk_id, lvl) in enumerate(staff_skills_data, 1):
        sk_pk = f"55000000-0000-0000-0000-{idx:012d}"
        sk_rows.append(f"    ('{sk_pk}', '{s_id}', '{sk_id}', '{lvl}'::skill_level_enum, '2027-12-31')")

    sql.append("-- 8. STAFF SKILLS")
    sql.append("INSERT INTO staff_skill (id, staff_id, skill_id, level, expiration_date) VALUES\n" + ",\n".join(sk_rows) + ";\n")

    # 9. Availability (0=Sun, 1=Mon, ..., 6=Sat)
    m_slot = ('06:30:00', '15:30:00')
    a_slot = ('14:00:00', '23:00:00')
    all_slot = ('06:00:00', '23:00:00')

    staff_avail_map = {
        '10000000-0000-0000-0000-000000000001': [(1, a_slot), (2, a_slot), (3, a_slot), (4, a_slot), (5, a_slot), (6, a_slot), (0, a_slot)],
        '10000000-0000-0000-0000-000000000002': [(1, m_slot), (2, m_slot), (3, m_slot), (4, m_slot), (5, m_slot), (6, a_slot)],
        '10000000-0000-0000-0000-000000000003': [(1, m_slot), (2, m_slot), (3, m_slot), (4, m_slot), (5, m_slot), (0, a_slot)],
        '10000000-0000-0000-0000-000000000004': [(1, m_slot), (2, m_slot), (3, m_slot), (4, m_slot), (5, m_slot)],
        '10000000-0000-0000-0000-000000000005': [(1, a_slot), (2, a_slot), (3, a_slot), (4, a_slot), (5, a_slot), (0, a_slot)],
        '10000000-0000-0000-0000-000000000006': [(1, m_slot), (2, m_slot), (3, m_slot), (4, m_slot)],
        '10000000-0000-0000-0000-000000000007': [(2, m_slot), (3, m_slot), (4, m_slot), (5, m_slot), (0, m_slot)],
        '10000000-0000-0000-0000-000000000008': [(1, m_slot), (2, m_slot), (3, m_slot), (4, m_slot), (5, m_slot), (0, m_slot)],
        '10000000-0000-0000-0000-000000000009': [(3, m_slot), (4, m_slot), (5, m_slot), (6, m_slot)],
        '10000000-0000-0000-0000-000000000010': [(1, a_slot), (2, a_slot), (3, a_slot), (4, a_slot)],
        '10000000-0000-0000-0000-000000000011': [(1, a_slot), (2, a_slot), (4, a_slot), (5, a_slot), (6, a_slot)],
        '10000000-0000-0000-0000-000000000012': [(2, m_slot), (3, m_slot), (4, m_slot), (5, m_slot), (6, m_slot)],
        '10000000-0000-0000-0000-000000000013': [(1, m_slot), (2, m_slot), (3, m_slot), (5, m_slot), (6, m_slot)],
        '10000000-0000-0000-0000-000000000014': [(1, a_slot), (2, a_slot), (3, a_slot), (5, a_slot), (0, a_slot)],
        '10000000-0000-0000-0000-000000000015': [(1, m_slot), (2, m_slot), (3, m_slot), (4, m_slot), (5, m_slot)],
        '10000000-0000-0000-0000-000000000016': [(1, m_slot), (2, m_slot), (4, m_slot), (5, m_slot), (0, m_slot)],
        '10000000-0000-0000-0000-000000000017': [(1, a_slot), (2, a_slot), (3, a_slot), (4, a_slot), (6, a_slot)],
        '10000000-0000-0000-0000-000000000018': [(1, a_slot), (2, a_slot), (3, a_slot), (4, a_slot), (5, a_slot), (6, a_slot)],
        '10000000-0000-0000-0000-000000000019': [(4, m_slot), (5, m_slot), (6, m_slot), (0, m_slot)],
        '10000000-0000-0000-0000-000000000020': [(1, all_slot), (2, all_slot), (3, all_slot), (4, all_slot), (5, all_slot), (6, all_slot), (0, all_slot)],
        '10000000-0000-0000-0000-000000000099': [(1, all_slot), (2, all_slot), (3, all_slot), (4, all_slot), (5, all_slot), (6, all_slot), (0, all_slot)],
        '70000000-0000-0000-0000-000000000001': [(d, all_slot) for d in range(7)],
        '70000000-0000-0000-0000-000000000002': [(d, all_slot) for d in range(7)],
        '70000000-0000-0000-0000-000000000003': [(d, all_slot) for d in range(7)],
    }

    avail_rows = []
    av_idx = 1
    for s_id, slot_list in staff_avail_map.items():
        for day, (start_t, end_t) in slot_list:
            av_pk = f"a0000000-0000-0000-0000-{av_idx:012d}"
            avail_rows.append(f"    ('{av_pk}', '{s_id}', {day}, '{start_t}', '{end_t}')")
            av_idx += 1

    sql.append("-- 9. AVAILABILITY")
    sql.append("INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time) VALUES\n" + ",\n".join(avail_rows) + ";\n")

    # 10. Store Layouts & Zones (with 3D coordinates)
    sql.append('-- 10. STORE LAYOUTS & ZONES')
    sql.append('''INSERT INTO store_layouts (id, store_id, length, width, height, version, is_active, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 24.0, 16.0, 6.0, 1, true, NOW(), NOW()),
    ('d0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 20.0, 15.0, 5.0, 1, true, NOW(), NOW());

INSERT INTO store_zones (id, store_id, name, x_coord, y_coord, z_coord, capacity, code, zone_type, color, description, width_dim, length_dim, height_dim)
VALUES
    ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Barista Counter', 4.0, 3.0, 0.0, 4, 'Z-BARISTA', 'COUNTER', '#0D9488', 'Espresso and manual brew bar', 3.0, 4.0, 2.8),
    ('d1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'POS & Cashier', 8.0, 3.0, 0.0, 3, 'Z-POS', 'COUNTER', '#0284C7', 'Point of sale order station', 3.0, 3.0, 2.8),
    ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Dining Hall Ground', 14.0, 8.0, 0.0, 8, 'Z-DINING', 'SEATING', '#EAB308', 'Main dining area ground floor', 8.0, 10.0, 3.0),
    ('d1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Mezzanine Balcony', 14.0, 8.0, 3.5, 6, 'Z-MEZZANINE', 'SEATING', '#8B5CF6', 'Upper floor balcony lounge', 6.0, 8.0, 2.8),
    ('d1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Outdoor Patio', 4.0, 12.0, 0.0, 4, 'Z-PATIO', 'SEATING', '#10B981', 'Garden open air tables', 4.0, 6.0, 3.0),
    ('d2000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'Riverside Main Counter', 4.0, 3.0, 0.0, 4, 'Z2-COUNTER', 'COUNTER', '#0D9488', 'Main counter Riverside', 3.0, 5.0, 2.8),
    ('d2000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'Riverside Seating', 12.0, 8.0, 0.0, 8, 'Z2-SEATING', 'SEATING', '#0284C7', 'River view dining area', 8.0, 8.0, 2.8);
''')

    # 11. Shift Templates
    sql.append('-- 11. SHIFT TEMPLATES')
    sql.append('''INSERT INTO shift_template (id, store_id, name, start_time, end_time, is_active)
VALUES
    ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Morning Shift', '07:00:00', '15:00:00', true),
    ('f0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Afternoon Shift', '14:30:00', '22:30:00', true),
    ('f0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Night Shift', '18:00:00', '23:00:00', true),
    ('f0000000-0000-0000-0000-000000000005', '77777777-7777-7777-7777-777777777777', 'Riverside Morning', '07:00:00', '15:00:00', true),
    ('f0000000-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777', 'Riverside Afternoon', '14:30:00', '22:30:00', true);
''')

    # 12. Shifts Generation
    # Current Week: 2026-09-14 (Mon) to 2026-09-20 (Sun)
    # Today is 2026-09-17 (Thu)
    # Next Week: 2026-09-21 (Mon) to 2026-09-27 (Sun)
    
    current_week_days = [
        ('2026-09-14', 'Monday', 'COMPLETED'),
        ('2026-09-15', 'Tuesday', 'COMPLETED'),
        ('2026-09-16', 'Wednesday', 'COMPLETED'),
        ('2026-09-17', 'Thursday', 'PUBLISHED'), # Today
        ('2026-09-18', 'Friday', 'PUBLISHED'),
        ('2026-09-19', 'Saturday', 'PUBLISHED'),
        ('2026-09-20', 'Sunday', 'PUBLISHED'),
    ]

    next_week_days = [
        ('2026-09-21', 'Monday', 'DRAFT'),
        ('2026-09-22', 'Tuesday', 'DRAFT'),
        ('2026-09-23', 'Wednesday', 'DRAFT'),
        ('2026-09-24', 'Thursday', 'DRAFT'),
        ('2026-09-25', 'Friday', 'DRAFT'),
        ('2026-09-26', 'Saturday', 'DRAFT'),
        ('2026-09-27', 'Sunday', 'DRAFT'),
    ]

    shifts = []
    requirements_data = []
    assignments_data = []
    attendance_data = []

    shift_counter = 1
    req_counter = 1
    asgn_counter = 1
    att_counter = 1

    # Zone UUIDs for Store 1
    z_barista = 'd1000000-0000-0000-0000-000000000001'
    z_pos = 'd1000000-0000-0000-0000-000000000002'
    z_dining = 'd1000000-0000-0000-0000-000000000003'
    z_mezzanine = 'd1000000-0000-0000-0000-000000000004'

    # Zone UUIDs for Store 2
    z2_counter = 'd2000000-0000-0000-0000-000000000001'
    z2_seating = 'd2000000-0000-0000-0000-000000000002'

    st1_assignments_plan = {
        '2026-09-14_M': [
            ('10000000-0000-0000-0000-000000000002', sk1, z_barista), # Emp 02 Barista
            ('10000000-0000-0000-0000-000000000004', sk2, z_pos),     # Emp 04 Cashier
            ('10000000-0000-0000-0000-000000000008', sk3, z_dining),  # Emp 08 Waiter
        ],
        '2026-09-14_A': [
            ('10000000-0000-0000-0000-000000000001', sk1, z_barista), # Emp 01
            ('10000000-0000-0000-0000-000000000005', sk2, z_pos),     # Emp 05
            ('10000000-0000-0000-0000-000000000010', sk1, z_mezzanine),# Emp 10
        ],
        '2026-09-15_M': [
            ('10000000-0000-0000-0000-000000000006', sk1, z_barista), # Emp 06
            ('10000000-0000-0000-0000-000000000007', sk2, z_pos),     # Emp 07
            ('10000000-0000-0000-0000-000000000003', sk3, z_dining),  # Emp 03
        ],
        '2026-09-15_A': [
            ('10000000-0000-0000-0000-000000000014', sk1, z_barista), # Emp 14
            ('10000000-0000-0000-0000-000000000011', sk2, z_pos),     # Emp 11
            ('10000000-0000-0000-0000-000000000018', sk3, z_dining),  # Emp 18
        ],
        '2026-09-16_M': [
            ('10000000-0000-0000-0000-000000000002', sk1, z_barista), # Emp 02
            ('10000000-0000-0000-0000-000000000013', sk2, z_pos),     # Emp 13
            ('10000000-0000-0000-0000-000000000015', sk3, z_dining),  # Emp 15
        ],
        '2026-09-16_A': [
            ('10000000-0000-0000-0000-000000000017', sk1, z_barista), # Emp 17
            ('10000000-0000-0000-0000-000000000004', sk2, z_pos),     # Emp 04
            ('10000000-0000-0000-0000-000000000009', sk3, z_dining),  # Emp 09
        ],
        # Today Thursday 2026-09-17
        '2026-09-17_M': [
            ('10000000-0000-0000-0000-000000000001', sk1, z_barista), # Emp 01 (checked in)
            ('10000000-0000-0000-0000-000000000007', sk2, z_pos),     # Emp 07 (checked in)
            ('10000000-0000-0000-0000-000000000016', sk3, z_dining),  # Emp 16 (checked in)
        ],
        '2026-09-17_A': [
            ('10000000-0000-0000-0000-000000000003', sk1, z_barista), # Emp 03 (upcoming)
            ('10000000-0000-0000-0000-000000000011', sk2, z_pos),     # Emp 11
            ('10000000-0000-0000-0000-000000000018', sk3, z_dining),  # Emp 18
        ],
        '2026-09-18_M': [
            ('10000000-0000-0000-0000-000000000002', sk1, z_barista),
            ('10000000-0000-0000-0000-000000000004', sk2, z_pos),
            ('10000000-0000-0000-0000-000000000012', sk3, z_dining),
        ],
        '2026-09-18_A': [
            ('10000000-0000-0000-0000-000000000005', sk1, z_barista),
            ('10000000-0000-0000-0000-000000000010', sk2, z_pos),
            ('10000000-0000-0000-0000-000000000014', sk1, z_mezzanine),
        ],
        '2026-09-19_M': [
            ('10000000-0000-0000-0000-000000000019', sk1, z_barista),
            ('10000000-0000-0000-0000-000000000013', sk2, z_pos),
            ('10000000-0000-0000-0000-000000000009', sk3, z_dining),
            ('10000000-0000-0000-0000-000000000099', sk1, z_mezzanine), # Quoc Staff
        ],
        '2026-09-19_A': [
            ('10000000-0000-0000-0000-000000000020', sk1, z_barista),
            ('10000000-0000-0000-0000-000000000017', sk2, z_pos),
            ('10000000-0000-0000-0000-000000000018', sk3, z_dining),
        ],
        '2026-09-20_M': [
            ('10000000-0000-0000-0000-000000000019', sk1, z_barista),
            ('10000000-0000-0000-0000-000000000007', sk2, z_pos),
            ('10000000-0000-0000-0000-000000000016', sk3, z_dining),
            ('10000000-0000-0000-0000-000000000099', sk1, z_mezzanine), # Quoc Staff
        ],
        '2026-09-20_A': [
            ('10000000-0000-0000-0000-000000000020', sk1, z_barista),
            ('10000000-0000-0000-0000-000000000001', sk2, z_pos),
            ('10000000-0000-0000-0000-000000000005', sk3, z_dining),
        ]
    }

    # Store 1 Current Week Shifts (2026-09-14 to 2026-09-20)
    for s_date, day_name, status in current_week_days:
        sh_m_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        shifts.append((sh_m_id, '11111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000001', s_date, '07:00:00', '15:00:00', status, False))
        
        sh_a_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        is_open = (s_date == '2026-09-20')
        shifts.append((sh_a_id, '11111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000002', s_date, '14:30:00', '22:30:00', status, is_open))

        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_m_id, sk1, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_m_id, sk2, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_m_id, sk3, 1))
        req_counter += 1

        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_a_id, sk1, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_a_id, sk2, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_a_id, sk3, 1))
        req_counter += 1

        m_key = f"{s_date}_M"
        if m_key in st1_assignments_plan:
            for st_id, sk_req, z_id in st1_assignments_plan[m_key]:
                asgn_id = f"a1000000-0000-0000-0000-{asgn_counter:012d}"
                asgn_counter += 1
                assignments_data.append((asgn_id, sh_m_id, st_id, 'AUTO', '2026-09-13 18:00:00+07', z_id, sk_req))
                
                if s_date in ['2026-09-14', '2026-09-15', '2026-09-16']:
                    att_id = f"e3000000-0000-0000-0000-{att_counter:012d}"
                    att_counter += 1
                    if s_date == '2026-09-14' and st_id == '10000000-0000-0000-0000-000000000004':
                        attendance_data.append((att_id, asgn_id, f"{s_date} 07:18:00+07", f"{s_date} 15:02:00+07", 'LATE'))
                    else:
                        attendance_data.append((att_id, asgn_id, f"{s_date} 06:54:00+07", f"{s_date} 15:05:00+07", 'PRESENT'))
                elif s_date == '2026-09-17': # Today morning: checked in
                    att_id = f"e3000000-0000-0000-0000-{att_counter:012d}"
                    att_counter += 1
                    attendance_data.append((att_id, asgn_id, f"{s_date} 06:52:00+07", "NULL", 'PRESENT'))

        a_key = f"{s_date}_A"
        if a_key in st1_assignments_plan:
            for st_id, sk_req, z_id in st1_assignments_plan[a_key]:
                asgn_id = f"a1000000-0000-0000-0000-{asgn_counter:012d}"
                asgn_counter += 1
                assignments_data.append((asgn_id, sh_a_id, st_id, 'AUTO', '2026-09-13 18:00:00+07', z_id, sk_req))
                
                if s_date in ['2026-09-14', '2026-09-15', '2026-09-16']:
                    att_id = f"e3000000-0000-0000-0000-{att_counter:012d}"
                    att_counter += 1
                    attendance_data.append((att_id, asgn_id, f"{s_date} 14:24:00+07", f"{s_date} 22:35:00+07", 'PRESENT'))

    # Store 2 Current Week Shifts (2026-09-14 to 2026-09-20)
    for s_date, day_name, status in current_week_days:
        sh2_m_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        shifts.append((sh2_m_id, '77777777-7777-7777-7777-777777777777', 'f0000000-0000-0000-0000-000000000005', s_date, '07:00:00', '15:00:00', status, False))
        
        sh2_a_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        shifts.append((sh2_a_id, '77777777-7777-7777-7777-777777777777', 'f0000000-0000-0000-0000-000000000006', s_date, '14:30:00', '22:30:00', status, False))

        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh2_m_id, sk6, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh2_m_id, sk7, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh2_a_id, sk6, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh2_a_id, sk8, 1))
        req_counter += 1

        # Store 2 assignments
        asgn_id1 = f"a1000000-0000-0000-0000-{asgn_counter:012d}"
        asgn_counter += 1
        assignments_data.append((asgn_id1, sh2_m_id, '70000000-0000-0000-0000-000000000001', 'AUTO', '2026-09-13 18:00:00+07', z2_counter, sk6))
        
        asgn_id2 = f"a1000000-0000-0000-0000-{asgn_counter:012d}"
        asgn_counter += 1
        assignments_data.append((asgn_id2, sh2_a_id, '70000000-0000-0000-0000-000000000002', 'AUTO', '2026-09-13 18:00:00+07', z2_seating, sk8))

        if s_date in ['2026-09-14', '2026-09-15', '2026-09-16']:
            att_id1 = f"e3000000-0000-0000-0000-{att_counter:012d}"
            att_counter += 1
            attendance_data.append((att_id1, asgn_id1, f"{s_date} 06:55:00+07", f"{s_date} 15:02:00+07", 'PRESENT'))
            att_id2 = f"e3000000-0000-0000-0000-{att_counter:012d}"
            att_counter += 1
            attendance_data.append((att_id2, asgn_id2, f"{s_date} 14:28:00+07", f"{s_date} 22:32:00+07", 'PRESENT'))

    # Store 1 Next Week Shifts (2026-09-21 to 2026-09-27) - ALL DRAFT, ZERO ASSIGNMENTS
    for s_date, day_name, status in next_week_days:
        sh_m_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        shifts.append((sh_m_id, '11111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000001', s_date, '07:00:00', '15:00:00', status, False))

        sh_a_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        shifts.append((sh_a_id, '11111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000002', s_date, '14:30:00', '22:30:00', status, False))

        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_m_id, sk1, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_m_id, sk2, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_m_id, sk3, 1))
        req_counter += 1

        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_a_id, sk1, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_a_id, sk2, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh_a_id, sk3, 1))
        req_counter += 1

    # Store 2 Next Week Shifts (2026-09-21 to 2026-09-27) - ALL DRAFT
    for s_date, day_name, status in next_week_days:
        sh2_m_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        shifts.append((sh2_m_id, '77777777-7777-7777-7777-777777777777', 'f0000000-0000-0000-0000-000000000005', s_date, '07:00:00', '15:00:00', status, False))

        sh2_a_id = f"f1000000-0000-0000-0000-{shift_counter:012d}"
        shift_counter += 1
        shifts.append((sh2_a_id, '77777777-7777-7777-7777-777777777777', 'f0000000-0000-0000-0000-000000000006', s_date, '14:30:00', '22:30:00', status, False))

        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh2_m_id, sk6, 1))
        req_counter += 1
        requirements_data.append((f"f2000000-0000-0000-0000-{req_counter:012d}", sh2_a_id, sk6, 1))
        req_counter += 1

    # Format Shift Inserts
    shift_rows = []
    for s_id, st_id, t_id, s_date, s_start, s_end, status, is_open in shifts:
        open_str = 'true' if is_open else 'false'
        shift_rows.append(f"    ('{s_id}', '{st_id}', '{t_id}', '{s_date}', '{s_start}', '{s_end}', '{status}'::shift_status_enum, '{s_date} 00:00:00+07', {open_str}, 0)")

    sql.append('-- 12. SHIFTS')
    sql.append("INSERT INTO shift (id, store_id, shift_template_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version) VALUES\n" + ",\n".join(shift_rows) + ";\n")

    # Format Requirement Inserts
    req_rows = []
    for r_id, s_id, sk_id, count in requirements_data:
        req_rows.append(f"    ('{r_id}', '{s_id}', '{sk_id}', {count})")

    sql.append('-- 13. SHIFT SKILL REQUIREMENTS')
    sql.append("INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES\n" + ",\n".join(req_rows) + ";\n")

    # Format Assignment Inserts
    asgn_rows = []
    for a_id, s_id, st_id, src, a_at, z_id, req_sk in assignments_data:
        asgn_rows.append(f"    ('{a_id}', '{s_id}', '{st_id}', '{src}'::assignment_source_enum, '{a_at}', false, '{z_id}', '{req_sk}')")

    sql.append('-- 14. SHIFT ASSIGNMENTS (WITH 3D SPATIAL ZONES & REQUIRED SKILLS)')
    sql.append("INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, zone_id, required_skill_id) VALUES\n" + ",\n".join(asgn_rows) + ";\n")

    # Format Attendance Inserts
    att_rows = []
    for at_id, asgn_id, cin_time, cout_time, status in attendance_data:
        cin_str = f"'{cin_time}'" if cin_time != "NULL" else "NULL"
        cout_str = f"'{cout_time}'" if cout_time != "NULL" else "NULL"
        status_str = f"'{status}'::attendance_status_enum" if status else "NULL"
        att_rows.append(f"    ('{at_id}', '{asgn_id}', {cin_str}, 10.7768900, 106.7008100, {cout_str}, 10.7768850, 106.7008050, {status_str}, false)")

    sql.append('-- 15. ATTENDANCE')
    sql.append("INSERT INTO attendance (id, shift_assignment_id, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, status, deleted) VALUES\n" + ",\n".join(att_rows) + ";\n")

    # 16. Attendance Adjustment Request
    sql.append('-- 16. ATTENDANCE ADJUSTMENT REQUESTS')
    sql.append('''INSERT INTO attendance_adjustment_request (id, attendance_id, staff_id, shift_id, requested_check_in, requested_check_out, reason, status, created_at)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', '2026-09-14 06:55:00+07', '2026-09-14 15:02:00+07', 'Kẹt xe do mưa lớn, có mặt thực tế 06:58 nhưng máy chấm công báo trễ', 'PENDING'::approval_status_enum, '2026-09-14 15:30:00+07');
''')

    # 17. Leave Requests & Blackout Dates
    sql.append('-- 17. LEAVE REQUESTS & BLACKOUT DATES')
    sql.append('''INSERT INTO leave_request (id, staff_id, store_id, leave_type, start_date, end_date, status, reason, approved_by, created_at, approved_at)
VALUES
    ('b1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'ANNUAL'::leave_type_enum, '2026-09-18', '2026-09-19', 'APPROVED'::approval_status_enum, 'Nghỉ phép việc gia đình', '88888888-8888-8888-8888-888888888888', '2026-09-10 09:00:00+07', '2026-09-11 10:00:00+07'),
    ('b1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'SICK'::leave_type_enum, '2026-09-21', '2026-09-22', 'PENDING'::approval_status_enum, 'Nghỉ khám sức khỏe định kỳ', NULL, '2026-09-16 14:00:00+07', NULL),
    ('b1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'EMERGENCY'::leave_type_enum, '2026-09-10', '2026-09-10', 'REJECTED'::approval_status_enum, 'Việc cá nhân đột xuất trùng giờ cao điểm', '88888888-8888-8888-8888-888888888888', '2026-09-09 18:00:00+07', '2026-09-09 20:00:00+07');

INSERT INTO blackout_date (id, staff_id, date, reason, leave_request_id)
VALUES
    ('b2000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', '2026-09-18', 'Approved Annual Leave', 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', '2026-09-19', 'Approved Annual Leave', 'b1000000-0000-0000-0000-000000000001');
''')

    # 18. Marketplace (Swap Requests & Open Shifts)
    sql.append('-- 18. MARKETPLACE (SHIFT SWAP & OPEN SHIFTS)')
    sql.append('''INSERT INTO shift_swap_request (id, from_shift_id, from_staff_id, to_shift_id, to_staff_id, status, employee_accepted)
VALUES
    ('c2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', 'PENDING'::swap_status_enum, true);

INSERT INTO open_shift_claim (id, shift_id, staff_id, status, claimed_at)
VALUES
    ('c3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000006', 'PENDING'::approval_status_enum, '2026-09-16 10:00:00+07');
''')

    # 19. Workforce Sharing (Inter-Store)
    sql.append('-- 19. INTER-STORE WORKFORCE SHARING')
    sql.append('''INSERT INTO workforce_request (id, requesting_store_id, target_store_id, shift_id, status, created_by, created_at, updated_at)
VALUES
    ('c4000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'f1000000-0000-0000-0000-000000000011', 'PROPOSAL_SENT'::workforce_request_status_enum, '88888888-8888-8888-8888-888888888888', NOW(), NOW());

INSERT INTO workforce_proposal (id, workforce_request_id, staff_id, status, proposed_by, created_at)
VALUES
    ('c5000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'PENDING'::workforce_proposal_status_enum, '88888888-8888-8888-8888-888888888889', NOW());
''')

    # 20. Payroll Periods & Records
    sql.append('-- 20. PAYROLL PERIODS & PAYROLL RECORDS')
    sql.append('''INSERT INTO payroll_period (id, store_id, start_date, end_date, status)
VALUES
    ('e1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-08-01', '2026-08-31', 'PAID'::payroll_period_status_enum),
    ('e1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '2026-09-01', '2026-09-30', 'DRAFT'::payroll_period_status_enum),
    ('e1000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777', '2026-08-01', '2026-08-31', 'PAID'::payroll_period_status_enum);
''')

    payroll_rows = []
    # August Payroll for 20 Store 1 Staff
    for i, ct_id, rate in emp_configs:
        num_str = f"{i:02d}"
        s_id = f"10000000-0000-0000-0000-0000000000{num_str}"
        pr_id = f"e2000000-0000-0000-0000-0000000000{num_str}"
        if "c7000000-0000-0000-0000-000000000001" in ct_id:
            hours, ot = 160.0, 8.0
            base = hours * rate
            ot_amt = ot * rate * 1.5
            tot = base + ot_amt
        elif "c7000000-0000-0000-0000-000000000002" in ct_id:
            hours, ot = 80.0, 0.0
            base = hours * rate
            ot_amt = 0.0
            tot = base
        elif "c7000000-0000-0000-0000-000000000003" in ct_id:
            hours, ot = 120.0, 4.0
            base = hours * rate
            ot_amt = ot * rate * 1.3
            tot = base + ot_amt
        else:
            hours, ot = 60.0, 0.0
            base = hours * rate
            ot_amt = 0.0
            tot = base

        payroll_rows.append(f"    ('{pr_id}', 'e1000000-0000-0000-0000-000000000001', '{s_id}', {hours:.2f}, {ot:.2f}, 0.00, {base:.2f}, {ot_amt:.2f}, 0.00, {tot:.2f}, NOW(), false)")

    # August Payroll for Managers & Quoc accounts & Store 2
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000088', 'e1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 160.00, 0.00, 0.00, 8000.00, 0.00, 0.00, 8000.00, NOW(), false)")
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000098', 'e1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888898', 160.00, 0.00, 0.00, 8000.00, 0.00, 0.00, 8000.00, NOW(), false)")
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000099', 'e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000099', 160.00, 8.00, 0.00, 4800.00, 360.00, 0.00, 5160.00, NOW(), false)")
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000071', 'e1000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 160.00, 0.00, 0.00, 4480.00, 0.00, 0.00, 4480.00, NOW(), false)")
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000072', 'e1000000-0000-0000-0000-000000000003', '88888888-8888-8888-8888-888888888889', 160.00, 0.00, 0.00, 8000.00, 0.00, 0.00, 8000.00, NOW(), false)")

    # September (Current) Payroll Draft rows for Emp 01, Emp 02, Quoc Staff
    payroll_rows.append("    ('e2000000-0000-0000-0001-000000000001', 'e1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 80.00, 4.00, 0.00, 2800.00, 210.00, 0.00, 3010.00, NOW(), false)")
    payroll_rows.append("    ('e2000000-0000-0000-0001-000000000002', 'e1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 80.00, 0.00, 0.00, 2560.00, 0.00, 0.00, 2560.00, NOW(), false)")
    payroll_rows.append("    ('e2000000-0000-0000-0001-000000000099', 'e1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000099', 80.00, 0.00, 0.00, 2400.00, 0.00, 0.00, 2400.00, NOW(), false)")

    sql.append("INSERT INTO payroll (id, payroll_period_id, staff_id, total_hours, ot_hours, holiday_hours, base_amount, ot_amount, holiday_amount, total_amount, generated_at, deleted) VALUES\n" + ",\n".join(payroll_rows) + ";\n")

    # 21. Notification Preferences & Sample Notifications
    sql.append('-- 21. NOTIFICATIONS & PREFERENCES')
    notif_types = [
        'SCHEDULE_PUBLISHED',
        'SHIFT_SWAP_UPDATED',
        'OPEN_SHIFT_AVAILABLE',
        'SHIFT_REMINDER',
        'PAYROLL_COMPLETED',
        'LEAVE_REQUEST_UPDATED',
        'ATTENDANCE_ADJUSTMENT_UPDATED',
        'WORKFORCE_REQUEST_UPDATED'
    ]

    pref_rows = []
    pref_idx = 1
    all_staff_ids = (
        [f"10000000-0000-0000-0000-0000000000{i:02d}" for i in range(1, 21)]
        + ['88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888889', '70000000-0000-0000-0000-000000000001']
        + ['99999999-9999-9999-9999-999999999998', '88888888-8888-8888-8888-888888888898', '10000000-0000-0000-0000-000000000099']
    )
    for st_id in all_staff_ids:
        for n_type in notif_types:
            np_id = f"f5000000-0000-0000-0000-{pref_idx:012d}"
            pref_idx += 1
            pref_rows.append(f"    ('{np_id}', '{st_id}', '{n_type}', true, NOW(), NOW())")

    sql.append("INSERT INTO notification_preference (id, staff_id, notification_type, enabled, created_at, updated_at) VALUES\n" + ",\n".join(pref_rows) + ";\n")

    sql.append('''INSERT INTO notification (id, staff_id, type, title, message, is_read, created_at)
VALUES
    ('f4000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'SCHEDULE_PUBLISHED', 'Lịch tuần hiện tại đã phát hành', 'Lịch làm việc tuần này (14/09 - 20/09) đã được xếp và phân bổ không gian 3D thành công.', false, NOW()),
    ('f4000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'SHIFT_REMINDER', 'Nhắc nhở ca làm việc', 'Bạn có ca làm việc chiều nay lúc 14:30 tại quầy Barista Counter.', false, NOW());
''')

    # 22. Public Holidays
    sql.append('-- 22. PUBLIC HOLIDAYS')
    sql.append('''INSERT INTO holiday (id, holiday_date, name, rate_multiplier)
VALUES
    ('f8000000-0000-0000-0000-000000000001', '2026-01-01', 'New Year''s Day', 2.00),
    ('f8000000-0000-0000-0000-000000000002', '2026-04-30', 'Reunification Day', 3.00),
    ('f8000000-0000-0000-0000-000000000003', '2026-05-01', 'International Labor Day', 3.00),
    ('f8000000-0000-0000-0000-000000000004', '2026-09-02', 'Vietnam National Day', 3.00);
''')

    sql.append('COMMIT;')
    sql.append('-- ============================================================================')
    sql.append('-- END OF SHIFTSYNC MASTER SEED DATASET')
    sql.append('-- ============================================================================')

    output_path = os.path.join(os.path.dirname(__file__), 'seed_master_dataset.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql))

    print(f'Successfully generated master seed dataset at: {output_path}')

if __name__ == '__main__':
    generate_sql()
