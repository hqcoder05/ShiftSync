import os

def generate_sql():
    sql_lines = []
    
    # Header
    sql_lines.append("-- ============================================================================")
    sql_lines.append("-- SHIFTSYNC MASTER SEED DATASET (CLEAN SCHEDULE FOR TESTING AUTO-SCHEDULING)")
    sql_lines.append("-- Target: 1 Store (ShiftSync Flagship Store) with EXACTLY 20 Active Employees")
    sql_lines.append("-- Shifts for Current Week (2026-09-07 to 2026-09-13) are DRAFT with Requirements")
    sql_lines.append("-- ZERO pre-assigned shifts (shift_assignment is EMPTY)")
    sql_lines.append("-- ============================================================================")
    sql_lines.append("BEGIN;")
    sql_lines.append("")

    # 1. Truncate Tables
    sql_lines.append("-- 1. TRUNCATE ALL APPLICATION TABLES (Preserve flyway_schema_history)")
    sql_lines.append("""TRUNCATE TABLE
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
""")

    # 2. Stores
    sql_lines.append("-- 2. STORES")
    sql_lines.append("""INSERT INTO store (id, name, address, latitude, longitude, open_time, close_time, created_at, deleted)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'ShiftSync Flagship Store', '123 Le Loi, Ben Nghe, District 1, Ho Chi Minh City', 10.7768890, 106.7008060, '06:00:00', '23:00:00', NOW(), false),
    ('77777777-7777-7777-7777-777777777777', 'ShiftSync Riverside Store', '456 Ton Duc Thang, Ben Nghe, District 1, Ho Chi Minh City', 10.7712340, 106.7056780, '07:00:00', '22:00:00', NOW(), false);
""")

    # 3. Store Configuration & Scheduler Configuration
    sql_lines.append("-- 3. CONFIGURATIONS")
    sql_lines.append("""INSERT INTO store_configuration (id, store_id, max_hour_per_week, min_rest_hours, geofence_radius_m, availability_deadline_hours, allowed_check_in_minutes, allowed_check_out_minutes, late_grace_minutes, early_leave_grace_minutes, shift_reminder_hours)
VALUES
    ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 48, 8, 100, 24, 30, 60, 5, 5, 2),
    ('c0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 48, 8, 100, 24, 30, 60, 5, 5, 2);

INSERT INTO scheduler_configuration (id, store_id, fairness_weight, skill_weight, hour_weight, rest_time_weight, availability_weight)
VALUES
    ('c0000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 0.100, 0.300, 0.200, 0.100, 0.300),
    ('c0000000-0000-0000-0000-000000000012', '77777777-7777-7777-7777-777777777777', 0.100, 0.300, 0.200, 0.100, 0.300);
""")

    # 4. Contract Types
    sql_lines.append("-- 4. CONTRACT TYPES")
    sql_lines.append("""INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate)
VALUES
    ('c7000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Full-Time', 40, 1.50, 30.00),
    ('c7000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Part-Time', 25, 1.25, 22.00),
    ('c7000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Seasonal', 35, 1.30, 25.00),
    ('c7000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Intern', 20, 1.00, 15.00),
    ('c7000000-0000-0000-0000-000000000005', '77777777-7777-7777-7777-777777777777', 'Store 2 Standard', 40, 1.50, 28.00);
""")

    # 5. Skills
    sql_lines.append("-- 5. SKILLS")
    sql_lines.append("""INSERT INTO skill (id, store_id, name, description)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Barista', 'Mastery of espresso machines and beverage crafting'),
    ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cashier', 'Point of Sale operations and cash reconciliation'),
    ('b0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Waiter', 'Customer service and floor order management'),
    ('b0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Kitchen', 'Food preparation, hygiene, and kitchen equipment handling'),
    ('b0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Shift Leader', 'Operational supervision, opening/closing, and conflict resolution'),
    ('b0000000-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777', 'Barista', 'Barista for Riverside store');
""")

    # 6. Staff Accounts (Admin, Manager Alice, Manager Bob, Chris Store 2, 20 Employees, and Quoc Accounts)
    sql_lines.append("-- 6. STAFF ACCOUNTS")
    sql_lines.append("""INSERT INTO staff (id, full_name, email, phone, password_hash, system_role, created_at, updated_at, version, deleted)
VALUES
    ('99999999-9999-9999-9999-999999999999', 'System Administrator', 'admin@shiftsync.com', '+84900000000', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'ADMIN'::system_role_enum, NOW(), NOW(), 0, false),
    ('88888888-8888-8888-8888-888888888888', 'Store Manager Alice', 'manager@shiftsync.com', '+84911111111', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'MANAGER'::system_role_enum, NOW(), NOW(), 0, false),
    ('88888888-8888-8888-8888-888888888889', 'Store Manager Bob', 'manager.store2@shiftsync.com', '+84922222222', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'MANAGER'::system_role_enum, NOW(), NOW(), 0, false),
    ('70000000-0000-0000-0000-000000000001', 'Riverside Staff Chris', 'chris.store2@shiftsync.com', '+84933333333', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false),
    ('99999999-9999-9999-9999-999999999998', 'Quoc Admin', 'quocadmin@shiftsync.com', '+84988000001', '$2a$10$8lJXUc5cNKvV5nHGoWJB6uvPChkL3JO5xnNJgcFbFdBejoUhG9RBO', 'ADMIN'::system_role_enum, NOW(), NOW(), 0, false),
    ('88888888-8888-8888-8888-888888888898', 'Quoc Manager', 'quocmanager@shiftsync.com', '+84988000002', '$2a$10$8lJXUc5cNKvV5nHGoWJB6uvPChkL3JO5xnNJgcFbFdBejoUhG9RBO', 'MANAGER'::system_role_enum, NOW(), NOW(), 0, false),
    ('10000000-0000-0000-0000-000000000099', 'Quoc Staff', 'quocstaff@shiftsync.com', '+84988000003', '$2a$10$8lJXUc5cNKvV5nHGoWJB6uvPChkL3JO5xnNJgcFbFdBejoUhG9RBO', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false);
""")

    # 20 Active Employees
    emp_inserts = []
    for i in range(1, 21):
        num_str = f"{i:02d}"
        staff_id = f"10000000-0000-0000-0000-0000000000{num_str}"
        name = f"Employee {num_str}"
        email = f"emp{num_str}@shiftsync.com"
        phone = f"+849010000{num_str}"
        emp_inserts.append(f"    ('{staff_id}', '{name}', '{email}', '{phone}', '$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu', 'STAFF'::system_role_enum, NOW(), NOW(), 0, false)")

    sql_lines.append("INSERT INTO staff (id, full_name, email, phone, password_hash, system_role, created_at, updated_at, version, deleted) VALUES\n" + ",\n".join(emp_inserts) + ";\n")

    # 7. Employments
    sql_lines.append("-- 7. EMPLOYMENTS")
    sql_lines.append("""INSERT INTO employment (id, staff_id, store_id, hourly_rate, status, joined_date, left_date, contract_type_id)
VALUES
    ('e8888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 50.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000001'),
    ('e8888888-8888-8888-8888-888888888889', '88888888-8888-8888-8888-888888888889', '77777777-7777-7777-7777-777777777777', 50.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000005'),
    ('e7000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 28.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000005'),
    ('e8888888-8888-8888-8888-888888888898', '88888888-8888-8888-8888-888888888898', '11111111-1111-1111-1111-111111111111', 50.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000001'),
    ('e1000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000099', '11111111-1111-1111-1111-111111111111', 30.00, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, 'c7000000-0000-0000-0000-000000000001');
""")

    emp_configs = [
        (1, "c7000000-0000-0000-0000-000000000001", 35.00), # Full-Time Lead
        (2, "c7000000-0000-0000-0000-000000000001", 32.00), # Full-Time Senior Barista
        (3, "c7000000-0000-0000-0000-000000000001", 30.00), # Full-Time Barista
        (4, "c7000000-0000-0000-0000-000000000001", 30.00), # Full-Time Cashier
        (5, "c7000000-0000-0000-0000-000000000001", 30.00), # Full-Time Kitchen Head
        (6, "c7000000-0000-0000-0000-000000000002", 22.00), # Part-Time Morning Barista
        (7, "c7000000-0000-0000-0000-000000000002", 22.00), # Part-Time Morning Cashier
        (8, "c7000000-0000-0000-0000-000000000002", 20.00), # Part-Time Evening Waiter
        (9, "c7000000-0000-0000-0000-000000000002", 20.00), # Part-Time Evening Waiter
        (10, "c7000000-0000-0000-0000-000000000002", 24.00), # Part-Time Evening Dual-Skill
        (11, "c7000000-0000-0000-0000-000000000003", 26.00), # Seasonal Kitchen
        (12, "c7000000-0000-0000-0000-000000000003", 25.00), # Seasonal Waiter
        (13, "c7000000-0000-0000-0000-000000000003", 25.00), # Seasonal Cashier
        (14, "c7000000-0000-0000-0000-000000000003", 27.00), # Seasonal Barista
        (15, "c7000000-0000-0000-0000-000000000004", 16.00), # Intern Waiter Trainee
        (16, "c7000000-0000-0000-0000-000000000004", 15.00), # Intern Kitchen Trainee
        (17, "c7000000-0000-0000-0000-000000000001", 32.00), # Full-Time Triple-Skill Senior
        (18, "c7000000-0000-0000-0000-000000000001", 34.00), # Full-Time Lead & Kitchen
        (19, "c7000000-0000-0000-0000-000000000002", 21.00), # Part-Time Weekend Only
        (20, "c7000000-0000-0000-0000-000000000001", 38.00), # Full-Time All-Rounder (All 5 Skills EXPERT)
    ]

    emp_rows = []
    for i, ct_id, rate in emp_configs:
        num_str = f"{i:02d}"
        emp_id = f"e0000000-0000-0000-0000-0000000000{num_str}"
        staff_id = f"10000000-0000-0000-0000-0000000000{num_str}"
        emp_rows.append(f"    ('{emp_id}', '{staff_id}', '11111111-1111-1111-1111-111111111111', {rate:.2f}, 'ACTIVE'::employment_status_enum, '2025-01-01', NULL, '{ct_id}')")

    sql_lines.append("INSERT INTO employment (id, staff_id, store_id, hourly_rate, status, joined_date, left_date, contract_type_id) VALUES\n" + ",\n".join(emp_rows) + ";\n")

    # 8. Staff Skills
    sk1 = 'b0000000-0000-0000-0000-000000000001' # Barista
    sk2 = 'b0000000-0000-0000-0000-000000000002' # Cashier
    sk3 = 'b0000000-0000-0000-0000-000000000003' # Waiter
    sk4 = 'b0000000-0000-0000-0000-000000000004' # Kitchen
    sk5 = 'b0000000-0000-0000-0000-000000000005' # Shift Leader
    sk6 = 'b0000000-0000-0000-0000-000000000006' # Barista Store 2

    staff_skills_data = [
        ('70000000-0000-0000-0000-000000000001', sk6, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000001', sk5, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000001', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000001', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000002', sk1, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000002', sk2, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000003', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000003', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000004', sk2, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000004', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000005', sk4, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000005', sk5, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000006', sk1, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000006', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000007', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000007', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000008', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000008', sk2, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000009', sk3, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000010', sk1, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000010', sk2, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000011', sk4, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000012', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000013', sk2, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000014', sk1, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000015', sk3, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000016', sk4, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000016', sk3, 'INTERMEDIATE'),
        ('10000000-0000-0000-0000-000000000017', sk1, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000017', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000017', sk3, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000018', sk5, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000018', sk4, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000019', sk1, 'BEGINNER'),
        ('10000000-0000-0000-0000-000000000020', sk1, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000020', sk2, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000020', sk3, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000020', sk4, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000020', sk5, 'EXPERT'),
        # Quoc Staff (Store 1 Multi-Skill Staff)
        ('10000000-0000-0000-0000-000000000099', sk1, 'EXPERT'),
        ('10000000-0000-0000-0000-000000000099', sk2, 'ADVANCED'),
        ('10000000-0000-0000-0000-000000000099', sk3, 'ADVANCED'),
    ]

    sk_rows = []
    for idx, (s_id, sk_id, lvl) in enumerate(staff_skills_data, 1):
        sk_pk = f"55000000-0000-0000-0000-{idx:012d}"
        sk_rows.append(f"    ('{sk_pk}', '{s_id}', '{sk_id}', '{lvl}'::skill_level_enum, '2027-12-31')")

    sql_lines.append("-- 8. STAFF SKILLS")
    sql_lines.append("INSERT INTO staff_skill (id, staff_id, skill_id, level, expiration_date) VALUES\n" + ",\n".join(sk_rows) + ";\n")

    # 9. Availability (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
    # Morning shift: 06:30:00 to 15:30:00 (Covers 07:00 - 15:00)
    # Afternoon shift: 14:00:00 to 23:00:00 (Covers 14:30 - 22:30)
    m_slot = ('06:30:00', '15:30:00')
    a_slot = ('14:00:00', '23:00:00')

    staff_avail_map = {
        # Emp 01 (Lead): Mon, Tue, Fri afternoon (24h)
        '10000000-0000-0000-0000-000000000001': [(1, a_slot), (2, a_slot), (5, a_slot)],
        # Emp 02 (Barista): Tue, Thu morning, Sat afternoon (24h)
        '10000000-0000-0000-0000-000000000002': [(2, m_slot), (4, m_slot), (6, a_slot)],
        # Emp 03 (Waiter/Barista): Wed morning, Fri morning, Sun afternoon (24h)
        '10000000-0000-0000-0000-000000000003': [(3, m_slot), (5, m_slot), (0, a_slot)],
        # Emp 04 (Cashier): Mon, Fri morning (16h)
        '10000000-0000-0000-0000-000000000004': [(1, m_slot), (5, m_slot)],
        # Emp 05 (Kitchen): Wed, Fri, Sun afternoon (24h) - (Leave on Mon-Tue 07-08/09)
        '10000000-0000-0000-0000-000000000005': [(3, a_slot), (5, a_slot), (0, a_slot)],
        # Emp 06 (Part-time Barista): Mon, Wed morning (16h)
        '10000000-0000-0000-0000-000000000006': [(1, m_slot), (3, m_slot)],
        # Emp 07 (Part-time Cashier): Tue, Thu, Sun morning (24h)
        '10000000-0000-0000-0000-000000000007': [(2, m_slot), (4, m_slot), (0, m_slot)],
        # Emp 08 (Part-time Waiter): Fri, Sun morning (16h)
        '10000000-0000-0000-0000-000000000008': [(5, m_slot), (0, m_slot)],
        # Emp 09 (Part-time Waiter): Sat morning (8h)
        '10000000-0000-0000-0000-000000000009': [(6, m_slot)],
        # Emp 10 (Part-time Barista): Mon, Thu afternoon (16h)
        '10000000-0000-0000-0000-000000000010': [(1, a_slot), (4, a_slot)],
        # Emp 11 (Seasonal Kitchen): Mon, Thu afternoon (16h)
        '10000000-0000-0000-0000-000000000011': [(1, a_slot), (4, a_slot)],
        # Emp 12 (Seasonal Waiter): Sat morning (8h)
        '10000000-0000-0000-0000-000000000012': [(6, m_slot)],
        # Emp 13 (Seasonal Cashier): Wed, Sat morning (16h)
        '10000000-0000-0000-0000-000000000013': [(3, m_slot), (6, m_slot)],
        # Emp 14 (Seasonal Barista): Tue, Fri, Sun afternoon (24h)
        '10000000-0000-0000-0000-000000000014': [(2, a_slot), (5, a_slot), (0, a_slot)],
        # Emp 15 (Intern Waiter): Tue, Thu morning (16h)
        '10000000-0000-0000-0000-000000000015': [(2, m_slot), (4, m_slot)],
        # Emp 16 (Intern Waiter): Mon, Sun morning (16h)
        '10000000-0000-0000-0000-000000000016': [(1, m_slot), (0, m_slot)],
        # Emp 17 (Full-time Barista): Wed, Sat afternoon (16h)
        '10000000-0000-0000-0000-000000000017': [(3, a_slot), (6, a_slot)],
        # Emp 18 (Full-time Lead/Kitchen): Tue, Sat afternoon (Kitchen), Wed, Thu afternoon (Lead) (32h)
        '10000000-0000-0000-0000-000000000018': [(2, a_slot), (3, a_slot), (4, a_slot), (6, a_slot)],
        # Emp 19 (Weekend Barista): Sat, Sun morning (16h)
        '10000000-0000-0000-0000-000000000019': [(6, m_slot), (0, m_slot)],
        # Emp 20 (All-Rounder Lead): Sat, Sun afternoon (16h)
        '10000000-0000-0000-0000-000000000020': [(6, a_slot), (0, a_slot)],
        # Quoc Staff (Barista): Sat, Sun morning (16h)
        '10000000-0000-0000-0000-000000000099': [(6, m_slot), (0, m_slot)],
        # Chris Store 2
        '70000000-0000-0000-0000-000000000001': [(d, ('07:00:00', '22:00:00')) for d in range(7)],
    }

    avail_rows = []
    av_idx = 1
    for s_id, slot_list in staff_avail_map.items():
        for day, (start_t, end_t) in slot_list:
            av_pk = f"a0000000-0000-0000-0000-{av_idx:012d}"
            avail_rows.append(f"    ('{av_pk}', '{s_id}', {day}, '{start_t}', '{end_t}')")
            av_idx += 1

    sql_lines.append("-- 9. AVAILABILITY")
    sql_lines.append("INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time) VALUES\n" + ",\n".join(avail_rows) + ";\n")

    # 10. Store Layout & Zones
    sql_lines.append("-- 10. STORE LAYOUTS & ZONES (WITH Z-AXIS ELEVATION)")
    sql_lines.append("""INSERT INTO store_layouts (id, store_id, length, width, height)
VALUES
    ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 24.0, 16.0, 6.0),
    ('d0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 20.0, 15.0, 5.0);

INSERT INTO store_zones (id, store_id, name, x_coord, y_coord, z_coord, capacity)
VALUES
    ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Barista Counter', 4.0, 3.0, 0.0, 4),
    ('d1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'POS & Cashier', 8.0, 3.0, 0.0, 3),
    ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Dining Hall Ground', 14.0, 8.0, 0.0, 8),
    ('d1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Mezzanine Balcony', 14.0, 8.0, 3.5, 6),
    ('d1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Kitchen & Bakery', 4.0, 12.0, 0.0, 4);
""")

    # 11. Shift Templates
    sql_lines.append("-- 11. SHIFT TEMPLATES")
    sql_lines.append("""INSERT INTO shift_template (id, store_id, name, start_time, end_time, is_active)
VALUES
    ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Morning Shift', '07:00:00', '15:00:00', true),
    ('f0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Afternoon Shift', '14:30:00', '22:30:00', true),
    ('f0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Night Shift', '18:00:00', '23:00:00', true),
    ('f0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Weekend Peak Shift', '10:00:00', '18:00:00', true);
""")

    # 12. Shifts for Current Week (2026-09-07 Monday to 2026-09-13 Sunday)
    # ALL SHIFTS ARE 'DRAFT' SO USER CAN TEST AUTO SCHEDULING!
    # Morning: 07:00 - 15:00
    # Afternoon: 14:30 - 22:30
    days_of_week = [
        ('2026-09-07', 'Monday'),
        ('2026-09-08', 'Tuesday'),
        ('2026-09-09', 'Wednesday'),
        ('2026-09-10', 'Thursday'),
        ('2026-09-11', 'Friday'),
        ('2026-09-12', 'Saturday'),
        ('2026-09-13', 'Sunday'),
    ]

    shifts = []
    requirements_data = []
    shift_idx = 1
    req_idx = 1

    for s_date, day_name in days_of_week:
        # Morning Shift (Template 1)
        sh_m_id = f"f1000000-0000-0000-0000-{shift_idx:012d}"
        shift_idx += 1
        shifts.append((sh_m_id, 'f0000000-0000-0000-0000-000000000001', s_date, '07:00:00', '15:00:00', 'DRAFT', False))

        # Afternoon Shift (Template 2)
        sh_a_id = f"f1000000-0000-0000-0000-{shift_idx:012d}"
        shift_idx += 1
        shifts.append((sh_a_id, 'f0000000-0000-0000-0000-000000000002', s_date, '14:30:00', '22:30:00', 'DRAFT', False))

        # Requirements:
        # Morning: 1 Barista, 1 Cashier, 1 Waiter (on weekends 2 Barista, 2 Waiter)
        if day_name in ['Saturday', 'Sunday']:
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_m_id, sk1, 2))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_m_id, sk2, 1))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_m_id, sk3, 2))
            req_idx += 1
        else:
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_m_id, sk1, 1))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_m_id, sk2, 1))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_m_id, sk3, 1))
            req_idx += 1

        # Afternoon: 1 Barista, 1 Kitchen, 1 Shift Leader (on weekends 2 Barista)
        if day_name in ['Saturday', 'Sunday']:
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_a_id, sk1, 2))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_a_id, sk4, 1))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_a_id, sk5, 1))
            req_idx += 1
        else:
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_a_id, sk1, 1))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_a_id, sk4, 1))
            req_idx += 1
            requirements_data.append((f"f2000000-0000-0000-0000-{req_idx:012d}", sh_a_id, sk5, 1))
            req_idx += 1

    shift_rows = []
    for s_id, t_id, s_date, s_start, s_end, status, is_open in shifts:
        open_str = "true" if is_open else "false"
        shift_rows.append(f"    ('{s_id}', '11111111-1111-1111-1111-111111111111', '{t_id}', '{s_date}', '{s_start}', '{s_end}', '{status}'::shift_status_enum, '{s_date} 00:00:00+07', {open_str}, 0)")

    sql_lines.append("-- 12. SHIFTS (ALL 14 CURRENT WEEK SHIFTS ARE DRAFT)")
    sql_lines.append("INSERT INTO shift (id, store_id, shift_template_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version) VALUES\n" + ",\n".join(shift_rows) + ";\n")

    # 13. Shift Skill Requirements
    req_rows = []
    for r_id, s_id, sk_id, count in requirements_data:
        req_rows.append(f"    ('{r_id}', '{s_id}', '{sk_id}', {count})")

    sql_lines.append("-- 13. SHIFT SKILL REQUIREMENTS")
    sql_lines.append("INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES\n" + ",\n".join(req_rows) + ";\n")

    # 14. NO PRE-ASSIGNMENTS! (shift_assignment is intentionally empty so user can run auto scheduling)
    sql_lines.append("-- 14. SHIFT ASSIGNMENTS (EMPTY - UNASSIGNED FOR USER TESTING)")
    sql_lines.append("-- No pre-registered shift assignments.")
    sql_lines.append("")

    # 15. Attendance (Empty)
    sql_lines.append("-- 15. ATTENDANCE (EMPTY)")
    sql_lines.append("")

    # 16. Attendance Adjustment Requests (Empty)
    sql_lines.append("-- 16. ATTENDANCE ADJUSTMENT REQUESTS (EMPTY)")
    sql_lines.append("")

    # 17. Leave Requests & Blackout Dates
    sql_lines.append("-- 17. LEAVE REQUESTS & BLACKOUT DATES")
    sql_lines.append("""INSERT INTO leave_request (id, staff_id, leave_type, start_date, end_date, status, reason, approved_by, store_id, created_at, approved_at)
VALUES
    ('b1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'ANNUAL'::leave_type_enum, '2026-09-10', '2026-09-12', 'APPROVED'::approval_status_enum, 'Family vacation trip', '88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '2026-09-01 10:00:00+07', '2026-09-02 09:00:00+07'),
    ('b1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', 'SICK'::leave_type_enum, '2026-09-11', '2026-09-12', 'PENDING'::approval_status_enum, 'Dental minor surgery recovery', NULL, '11111111-1111-1111-1111-111111111111', '2026-09-06 14:00:00+07', NULL),
    ('b1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000013', 'EMERGENCY'::leave_type_enum, '2026-09-05', '2026-09-05', 'REJECTED'::approval_status_enum, 'Personal errand during weekend peak hours', '88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '2026-09-04 18:00:00+07', '2026-09-04 20:00:00+07');

INSERT INTO blackout_date (id, staff_id, date, reason, leave_request_id)
VALUES
    ('b2000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', '2026-09-10', 'Approved Annual Leave', 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', '2026-09-11', 'Approved Annual Leave', 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008', '2026-09-12', 'Approved Annual Leave', 'b1000000-0000-0000-0000-000000000001');
""")

    # 18. Marketplace (Empty)
    sql_lines.append("-- 18. MARKETPLACE (EMPTY)")
    sql_lines.append("")

    # 19. Payroll Period & Payroll
    sql_lines.append("-- 19. PAYROLL PERIOD & PAYROLL RECORDS")
    sql_lines.append("""INSERT INTO payroll_period (id, store_id, start_date, end_date, status)
VALUES
    ('e1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-08-01', '2026-08-31', 'PAID'::payroll_period_status_enum);
""")

    payroll_rows = []
    for i, ct_id, rate in emp_configs:
        num_str = f"{i:02d}"
        s_id = f"10000000-0000-0000-0000-0000000000{num_str}"
        pr_id = f"e2000000-0000-0000-0000-0000000000{num_str}"
        if "c7000000-0000-0000-0000-000000000001" in ct_id:
            hours = 160.0
            ot = 8.0
            base = hours * rate
            ot_amt = ot * rate * 1.5
            tot = base + ot_amt
        elif "c7000000-0000-0000-0000-000000000002" in ct_id:
            hours = 80.0
            ot = 0.0
            base = hours * rate
            ot_amt = 0.0
            tot = base
        elif "c7000000-0000-0000-0000-000000000003" in ct_id:
            hours = 120.0
            ot = 4.0
            base = hours * rate
            ot_amt = ot * rate * 1.3
            tot = base + ot_amt
        else:
            hours = 60.0
            ot = 0.0
            base = hours * rate
            ot_amt = 0.0
            tot = base

        payroll_rows.append(f"    ('{pr_id}', 'e1000000-0000-0000-0000-000000000001', '{s_id}', {hours:.2f}, {ot:.2f}, 0.00, {base:.2f}, {ot_amt:.2f}, 0.00, {tot:.2f}, NOW(), false)")

    # Manager Alice
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000088', 'e1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 160.00, 0.00, 0.00, 8000.00, 0.00, 0.00, 8000.00, NOW(), false)")
    # Quoc Manager & Quoc Staff (August Payroll)
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000098', 'e1000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888898', 160.00, 0.00, 0.00, 8000.00, 0.00, 0.00, 8000.00, NOW(), false)")
    payroll_rows.append("    ('e2000000-0000-0000-0000-000000000099', 'e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000099', 160.00, 8.00, 0.00, 4800.00, 360.00, 0.00, 5160.00, NOW(), false)")

    sql_lines.append("INSERT INTO payroll (id, payroll_period_id, staff_id, total_hours, ot_hours, holiday_hours, base_amount, ot_amount, holiday_amount, total_amount, generated_at, deleted) VALUES\n" + ",\n".join(payroll_rows) + ";\n")

    # 20. Notifications & Preferences
    sql_lines.append("-- 20. NOTIFICATIONS & NOTIFICATION PREFERENCES")
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
        + ['88888888-8888-8888-8888-888888888888', '70000000-0000-0000-0000-000000000001']
        + ['99999999-9999-9999-9999-999999999998', '88888888-8888-8888-8888-888888888898', '10000000-0000-0000-0000-000000000099']
    )
    for st_id in all_staff_ids:
        for n_type in notif_types:
            np_id = f"f5000000-0000-0000-0000-{pref_idx:012d}"
            pref_idx += 1
            pref_rows.append(f"    ('{np_id}', '{st_id}', '{n_type}', true, NOW(), NOW())")

    sql_lines.append("INSERT INTO notification_preference (id, staff_id, notification_type, enabled, created_at, updated_at) VALUES\n" + ",\n".join(pref_rows) + ";\n")

    sql_lines.append("""INSERT INTO notification (id, staff_id, type, title, message, is_read, created_at)
VALUES
    ('f4000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'SCHEDULE_PUBLISHED', 'Hệ thống sẵn sàng', 'Ca làm việc tuần này đang ở trạng thái DRAFT chờ bạn kiểm thử tự động xếp ca AI.', false, NOW());
""")

    # 21. Public Holidays
    sql_lines.append("-- 21. PUBLIC HOLIDAYS")
    sql_lines.append("""INSERT INTO holiday (id, holiday_date, name, rate_multiplier)
VALUES
    ('f8000000-0000-0000-0000-000000000001', '2026-01-01', 'New Year''s Day', 2.00),
    ('f8000000-0000-0000-0000-000000000002', '2026-04-30', 'Reunification Day', 3.00),
    ('f8000000-0000-0000-0000-000000000003', '2026-05-01', 'International Labor Day', 3.00),
    ('f8000000-0000-0000-0000-000000000004', '2026-09-02', 'Vietnam National Day', 3.00);
""")

    # 22. Approved Leave Requests & Blackout Dates (Testing Scenario D)
    sql_lines.append("-- 22. APPROVED LEAVE REQUESTS & BLACKOUT DATES (Scenario D)")
    sql_lines.append("""INSERT INTO leave_request (id, staff_id, store_id, leave_type, start_date, end_date, status, reason, approved_by, created_at, approved_at)
VALUES
    ('f7000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'ANNUAL'::leave_type_enum, '2026-09-07', '2026-09-08', 'APPROVED'::approval_status_enum, 'Personal vacation', '88888888-8888-8888-8888-888888888888', NOW(), NOW());

INSERT INTO blackout_date (id, staff_id, date, reason, leave_request_id)
VALUES
    ('b1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '2026-09-07', 'Approved Leave: Personal vacation', 'f7000000-0000-0000-0000-000000000001'),
    ('b1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '2026-09-08', 'Approved Leave: Personal vacation', 'f7000000-0000-0000-0000-000000000001');
""")

    sql_lines.append("COMMIT;")
    sql_lines.append("-- ============================================================================")
    sql_lines.append("-- END OF SHIFTSYNC MASTER SEED DATASET")
    sql_lines.append("-- ============================================================================")

    output_path = os.path.join(os.path.dirname(__file__), "seed_master_dataset.sql")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"Successfully generated clean seed SQL at: {output_path}")

if __name__ == "__main__":
    generate_sql()
