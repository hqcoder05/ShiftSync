# -*- coding: utf-8 -*-
"""
Generate comprehensive Master Seed Dataset for ShiftSync
Anchor Date: 2026-09-17 (Thursday)
- Historical Week W37: 2026-09-07 to 2026-09-13 (Completed shifts, attendance, historical analytics)
- Current Week W38: 2026-09-14 to 2026-09-20 (Published shifts, active attendance, leave, swaps, open shifts)
- Next Week W39: 2026-09-21 to 2026-09-27 (Draft shifts, auto-scheduler scenarios, 3D spatial allocation)
"""

PASSWORD_HASH = "$2a$10$cy6l1jtAuFvxzZXf9y918elm/yqSqp1ScTKTTxDnUbwlYGR7sdJhu"  # password123

STORE_1 = "11111111-1111-1111-1111-111111111111"
STORE_2 = "77777777-7777-7777-7777-777777777777"

ADMIN_ID = "99999999-9999-9999-9999-999999999999"
MGR_1_ID = "88888888-8888-8888-8888-888888888888"
MGR_2_ID = "88888888-8888-8888-8888-888888888889"

SK_BARISTA_1 = "b0000000-0000-0000-0000-000000000001"
SK_CASHIER_1 = "b0000000-0000-0000-0000-000000000002"
SK_WAITER_1  = "b0000000-0000-0000-0000-000000000003"
SK_BARISTA_2 = "b0000000-0000-0000-0000-000000000006"
SK_CASHIER_2 = "b0000000-0000-0000-0000-000000000007"
SK_WAITER_2  = "b0000000-0000-0000-0000-000000000008"

Z_BARISTA = "d1000000-0000-0000-0000-000000000001"
Z_POS     = "d1000000-0000-0000-0000-000000000002"
Z_DINING  = "d1000000-0000-0000-0000-000000000003"
Z_MEZZ    = "d1000000-0000-0000-0000-000000000004"
Z_PATIO   = "d1000000-0000-0000-0000-000000000005"
Z2_CTR    = "d2000000-0000-0000-0000-000000000001"
Z2_SEAT   = "d2000000-0000-0000-0000-000000000002"

def main():
    lines = []
    lines.append("-- ============================================================================")
    lines.append("-- SHIFTSYNC MASTER FUNCTIONAL TEST DATASET & PRODUCTION SEED")
    lines.append("-- Anchor date: 2026-09-17 (Thursday)")
    lines.append("-- Historical Week W37: 2026-09-07 to 2026-09-13")
    lines.append("-- Current Week W38:    2026-09-14 to 2026-09-20")
    lines.append("-- Next Week W39:       2026-09-21 to 2026-09-27")
    lines.append("-- ============================================================================")
    lines.append("BEGIN;\n")

    # 1. TRUNCATE ALL TABLES
    lines.append("-- 1. TRUNCATE ALL TABLES (Cascade)")
    lines.append("""TRUNCATE TABLE
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
CASCADE;\n""")

    # 2. STORES
    lines.append("-- 2. STORES")
    lines.append(f"""INSERT INTO store (id, name, address, latitude, longitude, open_time, close_time, category, format, created_at, deleted) VALUES
('{STORE_1}', 'ShiftSync Flagship Store', '123 Le Loi, Ben Nghe, District 1, Ho Chi Minh City', 10.7768890, 106.7008060, '06:00:00', '23:00:00', 'FOOD_BEVERAGE', 'Coffee Shop', '2026-01-01 00:00:00+00', false),
('{STORE_2}', 'ShiftSync Riverside Store', '456 Ton Duc Thang, Ben Nghe, District 1, Ho Chi Minh City', 10.7712340, 106.7056780, '07:00:00', '22:00:00', 'FOOD_BEVERAGE', 'Coffee Shop', '2026-01-01 00:00:00+00', false);\n""")

    # 3. STORE & SCHEDULER CONFIGURATIONS
    lines.append("-- 3. CONFIGURATIONS")
    lines.append(f"""INSERT INTO store_configuration (id, store_id, max_hour_per_week, min_rest_hours, geofence_radius_m, availability_deadline_hours, allowed_check_in_minutes, allowed_check_out_minutes, late_grace_minutes, early_leave_grace_minutes, shift_reminder_hours) VALUES
('c0000000-0000-0000-0000-000000000001', '{STORE_1}', 48, 8, 100, 24, 30, 60, 5, 5, 2),
('c0000000-0000-0000-0000-000000000002', '{STORE_2}', 48, 8, 100, 24, 30, 60, 5, 5, 2);

INSERT INTO scheduler_configuration (id, store_id, fairness_weight, skill_weight, hour_weight, rest_time_weight, availability_weight) VALUES
('c0000000-0000-0000-0000-000000000011', '{STORE_1}', 0.100, 0.300, 0.200, 0.100, 0.300),
('c0000000-0000-0000-0000-000000000012', '{STORE_2}', 0.100, 0.300, 0.200, 0.100, 0.300);\n""")

    # 4. CONTRACT TYPES
    lines.append("-- 4. CONTRACT TYPES")
    lines.append(f"""INSERT INTO contract_type (id, store_id, name, max_weekly_hours, ot_multiplier, default_hourly_rate) VALUES
('c7000000-0000-0000-0000-000000000001', '{STORE_1}', 'Full-Time', 40, 1.50, 30.00),
('c7000000-0000-0000-0000-000000000002', '{STORE_1}', 'Part-Time', 25, 1.25, 22.00),
('c7000000-0000-0000-0000-000000000003', '{STORE_1}', 'Seasonal', 35, 1.30, 25.00),
('c7000000-0000-0000-0000-000000000004', '{STORE_1}', 'Intern', 20, 1.00, 15.00),
('c7000000-0000-0000-0000-000000000005', '{STORE_2}', 'Store 2 Standard', 40, 1.50, 28.00),
('c7000000-0000-0000-0000-000000000006', '{STORE_2}', 'Store 2 Part-Time', 25, 1.25, 20.00);\n""")

    # 5. SKILLS
    lines.append("-- 5. SKILLS")
    lines.append(f"""INSERT INTO skill (id, store_id, name, description) VALUES
('{SK_BARISTA_1}', '{STORE_1}', 'Barista', 'Chuyen pha che ca phe chuyen nghiep va thuc uong dac biet'),
('{SK_CASHIER_1}', '{STORE_1}', 'Cashier', 'Thu ngan, quan ly hoa don, thanh toan POS va doi soat tien mat'),
('{SK_WAITER_1}', '{STORE_1}', 'Waiter', 'Phuc vu ban, cham soc khach hang tai cho va don dep khu vuc'),
('{SK_BARISTA_2}', '{STORE_2}', 'Barista', 'Pha che chuyen nghiep tai cua hang Riverside'),
('{SK_CASHIER_2}', '{STORE_2}', 'Cashier', 'Thu ngan tai cua hang Riverside'),
('{SK_WAITER_2}', '{STORE_2}', 'Waiter', 'Phuc vu tai cua hang Riverside');\n""")

    # 6. USERS (STAFF TABLE)
    lines.append("-- 6. USERS (STAFF)")
    staff_rows = [
        f"('{ADMIN_ID}', 'System Administrator', 'admin@shiftsync.com', '0901000001', '{PASSWORD_HASH}', 'ADMIN', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00', 0, false)",
        f"('{MGR_1_ID}', 'Store Manager Alice', 'manager@shiftsync.com', '0901000002', '{PASSWORD_HASH}', 'MANAGER', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00', 0, false)",
        f"('{MGR_2_ID}', 'Store Manager Bob', 'manager.store2@shiftsync.com', '0901000003', '{PASSWORD_HASH}', 'MANAGER', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00', 0, false)",
    ]

    vn_names = [
        ("Nguyen Van An", "emp01@shiftsync.com", "0902000001"),
        ("Tran Thi Bich", "emp02@shiftsync.com", "0902000002"),
        ("Le Hoang Cuong", "emp03@shiftsync.com", "0902000003"),
        ("Pham Minh Duc", "emp04@shiftsync.com", "0902000004"),
        ("Hoang Thu Ha", "emp05@shiftsync.com", "0902000005"),
        ("Vu Thanh Hai", "emp06@shiftsync.com", "0902000006"),
        ("Dang Ngoc Hien", "emp07@shiftsync.com", "0902000007"),
        ("Bui Quang Huy", "emp08@shiftsync.com", "0902000008"),
        ("Doan Thi Mai", "emp09@shiftsync.com", "0902000009"),
        ("Ngo Van Nam", "emp10@shiftsync.com", "0902000010"),
        ("Duong Gia Phuc", "emp11@shiftsync.com", "0902000011"),
        ("Ly Hong Quan", "emp12@shiftsync.com", "0902000012"),
        ("Mai Quoc Son", "emp13@shiftsync.com", "0902000013"),
        ("Dinh Bao Thang", "emp14@shiftsync.com", "0902000014"),
        ("Cao Van Thinh", "emp15@shiftsync.com", "0902000015"),
        ("Trinh Kim Tuan", "emp16@shiftsync.com", "0902000016"),
        ("Ha Xuan Vinh", "emp17@shiftsync.com", "0902000017"),
        ("Luu Huu Yen", "emp18@shiftsync.com", "0902000018"),
        ("Ta Tien Dat", "emp19@shiftsync.com", "0902000019"),
        ("Do Manh Tien", "emp20@shiftsync.com", "0902000020"),
    ]
    for idx, (name, email, phone) in enumerate(vn_names, start=1):
        s_id = f"10000000-0000-0000-0000-{idx:012d}"
        staff_rows.append(f"('{s_id}', '{name}', '{email}', '{phone}', '{PASSWORD_HASH}', 'STAFF', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00', 0, false)")

    # Intern emp99, Former emp21, Suspended emp22
    staff_rows.append(f"('10000000-0000-0000-0000-000000000099', 'Nguyen Van Intern', 'emp99@shiftsync.com', '0902000099', '{PASSWORD_HASH}', 'STAFF', '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', 0, false)")
    staff_rows.append(f"('10000000-0000-0000-0000-000000000021', 'Pham Thi Cuu (Former)', 'emp21@shiftsync.com', '0902000021', '{PASSWORD_HASH}', 'STAFF', '2025-01-01 00:00:00+00', '2026-07-31 00:00:00+00', 0, false)")
    staff_rows.append(f"('10000000-0000-0000-0000-000000000022', 'Tran Van Dinh (Suspended)', 'emp22@shiftsync.com', '0902000022', '{PASSWORD_HASH}', 'STAFF', '2026-02-01 00:00:00+00', '2026-09-01 00:00:00+00', 0, false)")

    # Store 2 staff (5 employees)
    s2_staff = [
        ("Riverside Staff Chris", "staff.store2.chris@shiftsync.com", "0903000001", 1),
        ("Riverside Staff David", "staff.store2.david@shiftsync.com", "0903000002", 2),
        ("Riverside Staff Emma", "staff.store2.emma@shiftsync.com", "0903000003", 3),
        ("Riverside Staff Frank", "staff.store2.frank@shiftsync.com", "0903000004", 4),
        ("Riverside Staff Grace", "staff.store2.grace@shiftsync.com", "0903000005", 5),
    ]
    for name, email, phone, num in s2_staff:
        s_id = f"70000000-0000-0000-0000-{num:012d}"
        staff_rows.append(f"('{s_id}', '{name}', '{email}', '{phone}', '{PASSWORD_HASH}', 'STAFF', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00', 0, false)")

    lines.append("INSERT INTO staff (id, full_name, email, phone, password_hash, system_role, created_at, updated_at, version, deleted) VALUES")
    lines.append(",\n".join(staff_rows) + ";\n")

    # 7. EMPLOYMENT
    lines.append("-- 7. EMPLOYMENT")
    emp_rows = [
        f"('e0000000-0000-0000-0000-000000000001', '{MGR_1_ID}', '{STORE_1}', 35.00, 'ACTIVE', '2026-01-01', NULL, 'c7000000-0000-0000-0000-000000000001')",
        f"('e0000000-0000-0000-0000-000000000002', '{MGR_2_ID}', '{STORE_2}', 32.00, 'ACTIVE', '2026-01-01', NULL, 'c7000000-0000-0000-0000-000000000005')",
    ]
    for i in range(1, 21):
        s_id = f"10000000-0000-0000-0000-{i:012d}"
        e_id = f"e0000000-0000-0000-0000-{i+2:012d}"
        c_id = f"c7000000-0000-0000-0000-00000000000{(i % 3) + 1}"
        rate = 22.00 + (i % 5) * 2.00
        emp_rows.append(f"('{e_id}', '{s_id}', '{STORE_1}', {rate:.2f}, 'ACTIVE', '2026-01-01', NULL, '{c_id}')")

    emp_rows.append(f"('e0000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000099', '{STORE_1}', 15.00, 'ACTIVE', '2026-06-01', NULL, 'c7000000-0000-0000-0000-000000000004')")
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000021', '{STORE_1}', 24.00, 'INACTIVE', '2025-01-15', '2026-07-31', 'c7000000-0000-0000-0000-000000000001')")
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000022', '{STORE_1}', 22.00, 'SUSPENDED', '2026-02-01', NULL, 'c7000000-0000-0000-0000-000000000002')")

    # Store 2 staff
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000026', '70000000-0000-0000-0000-000000000001', '{STORE_2}', 25.00, 'ACTIVE', '2026-01-01', NULL, 'c7000000-0000-0000-0000-000000000005')")
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000027', '70000000-0000-0000-0000-000000000002', '{STORE_2}', 22.00, 'ACTIVE', '2026-01-01', NULL, 'c7000000-0000-0000-0000-000000000006')")
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000028', '70000000-0000-0000-0000-000000000003', '{STORE_2}', 20.00, 'ACTIVE', '2026-01-01', NULL, 'c7000000-0000-0000-0000-000000000006')")
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000029', '70000000-0000-0000-0000-000000000004', '{STORE_1}', 22.00, 'INACTIVE', '2025-06-01', '2026-05-31', 'c7000000-0000-0000-0000-000000000002')")
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000030', '70000000-0000-0000-0000-000000000004', '{STORE_2}', 24.00, 'ACTIVE', '2026-06-01', NULL, 'c7000000-0000-0000-0000-000000000005')")
    emp_rows.append(f"('e0000000-0000-0000-0000-000000000031', '70000000-0000-0000-0000-000000000005', '{STORE_2}', 20.00, 'ACTIVE', '2026-09-15', NULL, 'c7000000-0000-0000-0000-000000000006')")

    lines.append("INSERT INTO employment (id, staff_id, store_id, hourly_rate, status, joined_date, left_date, contract_type_id) VALUES")
    lines.append(",\n".join(emp_rows) + ";\n")

    # 8. STAFF SKILLS (Valid UUID prefix a5...)
    lines.append("-- 8. STAFF SKILLS (Permanent, Temporary, Expiring Soon, Expired)")
    skill_rows = []
    # emp01: Barista (Permanent NULL), Cashier (Permanent NULL)
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{SK_BARISTA_1}', 'EXPERT', NULL)")
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '{SK_CASHIER_1}', 'ADVANCED', NULL)")
    # emp02: Cashier (Permanent), Waiter (Permanent)
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '{SK_CASHIER_1}', 'EXPERT', NULL)")
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '{SK_WAITER_1}', 'ADVANCED', NULL)")
    # emp03: Barista (Permanent), Waiter (Permanent)
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '{SK_BARISTA_1}', 'ADVANCED', NULL)")
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '{SK_WAITER_1}', 'EXPERT', NULL)")
    # emp04: Barista (Active Temporary 2027)
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000004', '{SK_BARISTA_1}', 'INTERMEDIATE', '2027-12-31')")
    # emp05: Cashier (Permanent), Barista (Expiring Soon 2026-09-20)
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000005', '{SK_CASHIER_1}', 'ADVANCED', NULL)")
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', '{SK_BARISTA_1}', 'BEGINNER', '2026-09-20')")
    # emp06: Waiter (Permanent), Barista (EXPIRED 2026-09-10 -> tests expired skill rejection!)
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000006', '{SK_WAITER_1}', 'ADVANCED', NULL)")
    skill_rows.append(f"('a5000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000006', '{SK_BARISTA_1}', 'BEGINNER', '2026-09-10')")

    s_counter = 12
    for i in range(7, 21):
        s_id = f"10000000-0000-0000-0000-{i:012d}"
        if i % 3 == 0:
            skills = [SK_BARISTA_1, SK_CASHIER_1]
        elif i % 3 == 1:
            skills = [SK_WAITER_1, SK_BARISTA_1]
        else:
            skills = [SK_CASHIER_1, SK_WAITER_1]
        for sk in skills:
            skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '{s_id}', '{sk}', 'INTERMEDIATE', '2027-12-31')")
            s_counter += 1

    # emp99 Intern
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '10000000-0000-0000-0000-000000000099', '{SK_CASHIER_1}', 'BEGINNER', '2027-12-31')")
    s_counter += 1
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '10000000-0000-0000-0000-000000000099', '{SK_WAITER_1}', 'BEGINNER', '2027-12-31')")
    s_counter += 1

    # Store 2 staff skills
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '70000000-0000-0000-0000-000000000001', '{SK_BARISTA_2}', 'EXPERT', NULL)")
    s_counter += 1
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '70000000-0000-0000-0000-000000000002', '{SK_CASHIER_2}', 'ADVANCED', NULL)")
    s_counter += 1
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '70000000-0000-0000-0000-000000000003', '{SK_WAITER_2}', 'ADVANCED', NULL)")
    s_counter += 1
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '70000000-0000-0000-0000-000000000004', '{SK_BARISTA_2}', 'INTERMEDIATE', '2027-12-31')")
    s_counter += 1
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '70000000-0000-0000-0000-000000000004', '{SK_WAITER_2}', 'INTERMEDIATE', '2027-12-31')")
    s_counter += 1
    skill_rows.append(f"('a5000000-0000-0000-0000-{s_counter:012d}', '70000000-0000-0000-0000-000000000005', '{SK_CASHIER_2}', 'BEGINNER', '2027-12-31')")

    lines.append("INSERT INTO staff_skill (id, staff_id, skill_id, level, expiration_date) VALUES")
    lines.append(",\n".join(skill_rows) + ";\n")

    # 9. AVAILABILITY
    lines.append("-- 9. AVAILABILITY (Realistic schedules across staff)")
    avail_rows = []
    a_counter = 1
    for day in range(7):
        avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '10000000-0000-0000-0000-000000000001', {day}, '14:00:00', '23:00:00')")
        a_counter += 1
    for day in range(1, 7):
        avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '10000000-0000-0000-0000-000000000002', {day}, '06:30:00', '23:00:00')")
        a_counter += 1
    for day in range(1, 7):
        avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '10000000-0000-0000-0000-000000000003', {day}, '06:30:00', '23:00:00')")
        a_counter += 1
    for day in range(1, 6):
        avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '10000000-0000-0000-0000-000000000004', {day}, '06:30:00', '15:30:00')")
        a_counter += 1
    for day in range(1, 7):
        avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '10000000-0000-0000-0000-000000000005', {day}, '14:00:00', '23:00:00')")
        a_counter += 1
    for day in [1, 2, 4, 6]:
        avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '10000000-0000-0000-0000-000000000006', {day}, '06:30:00', '15:30:00')")
        a_counter += 1
    for i in range(7, 21):
        s_id = f"10000000-0000-0000-0000-{i:012d}"
        time_range = ('06:30:00', '15:30:00') if i % 2 == 1 else ('14:00:00', '23:00:00')
        days = [1, 2, 3, 4, 5] if i % 3 != 0 else [1, 2, 4, 5, 6]
        for d in days:
            avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '{s_id}', {d}, '{time_range[0]}', '{time_range[1]}')")
            a_counter += 1
    for day in range(7):
        avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '10000000-0000-0000-0000-000000000099', {day}, '06:00:00', '23:00:00')")
        a_counter += 1

    # Store 2 staff (Chris, David, Emma, Frank)
    for s_idx in [1, 2, 3, 4]:
        s_id = f"70000000-0000-0000-0000-{s_idx:012d}"
        for day in range(7):
            avail_rows.append(f"('a0000000-0000-0000-0000-{a_counter:012d}', '{s_id}', {day}, '06:00:00', '23:00:00')")
            a_counter += 1

    lines.append("INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time) VALUES")
    lines.append(",\n".join(avail_rows) + ";\n")

    # 10. STORE LAYOUTS & ZONES (3D SPATIAL DOMAIN)
    lines.append("-- 10. STORE LAYOUTS & ZONES (3D Coordinates)")
    lines.append(f"""INSERT INTO store_layouts (id, store_id, length, width, height, version, is_active, created_at, updated_at) VALUES
('d0000000-0000-0000-0000-000000000001', '{STORE_1}', 25.0, 15.0, 5.0, 1, true, '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00'),
('d0000000-0000-0000-0000-000000000002', '{STORE_2}', 20.0, 12.0, 4.0, 1, true, '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00');

INSERT INTO store_zones (id, store_id, name, x_coord, y_coord, z_coord, capacity, code, zone_type, color, description, width_dim, length_dim, height_dim) VALUES
('{Z_BARISTA}', '{STORE_1}', 'Barista Counter', 4.0, 3.0, 0.0, 4, 'Z-BARISTA', 'COUNTER', '#FF5733', 'Khu vuc may pha cafe espresso va che bien do uong nong', 3.0, 2.0, 1.2),
('{Z_POS}', '{STORE_1}', 'POS & Cashier', 8.0, 3.0, 0.0, 3, 'Z-POS', 'COUNTER', '#33FF57', 'Khu vuc order, thanh toan va giao nhan hoa don', 2.5, 2.0, 1.2),
('{Z_DINING}', '{STORE_1}', 'Dining Hall Ground', 14.0, 8.0, 0.0, 8, 'Z-DINING', 'SEATING', '#3357FF', 'Sanh ngoi chinh tang tret danh cho khach dung tai cho', 8.0, 6.0, 3.0),
('{Z_MEZZ}', '{STORE_1}', 'Mezzanine Balcony', 14.0, 8.0, 3.5, 6, 'Z-MEZZANINE', 'SEATING', '#F3FF33', 'Gac lung view cao, khong gian yen tinh va hoc tap', 8.0, 5.0, 2.5),
('{Z_PATIO}', '{STORE_1}', 'Outdoor Patio', 4.0, 12.0, 0.0, 4, 'Z-PATIO', 'SEATING', '#FF33F3', 'Khu vuc ngoai troi thoang mat danh cho khach hut thuoc', 5.0, 4.0, 3.0),
('{Z2_CTR}', '{STORE_2}', 'Riverside Main Counter', 4.0, 3.0, 0.0, 4, 'Z2-COUNTER', 'COUNTER', '#FF5733', 'Quay pha che va thu ngan tich hop Riverside', 4.0, 2.0, 1.2),
('{Z2_SEAT}', '{STORE_2}', 'Riverside Seating', 12.0, 8.0, 0.0, 8, 'Z2-SEATING', 'SEATING', '#3357FF', 'Khu vuc ngoi huong song thoang dang', 8.0, 6.0, 3.0);

-- 11. WORKSTATIONS
INSERT INTO workstations (id, store_id, zone_id, name, code, workstation_type, x_coord, y_coord, z_coord, capacity, is_active) VALUES
('a7000000-0000-0000-0000-000000000001', '{STORE_1}', '{Z_BARISTA}', 'Espresso Station A1', 'WS-ESP-1', 'BARISTA_BAR', 4.0, 2.5, 0.9, 1, true),
('a7000000-0000-0000-0000-000000000002', '{STORE_1}', '{Z_BARISTA}', 'Pour-Over Station A2', 'WS-PO-1', 'BARISTA_BAR', 4.0, 3.5, 0.9, 1, true),
('a7000000-0000-0000-0000-000000000003', '{STORE_1}', '{Z_POS}', 'POS Register 01', 'WS-POS-1', 'CASHIER_STATION', 8.0, 2.5, 0.9, 1, true),
('a7000000-0000-0000-0000-000000000004', '{STORE_1}', '{Z_POS}', 'POS Register 02', 'WS-POS-2', 'CASHIER_STATION', 8.0, 3.5, 0.9, 1, true),
('a7000000-0000-0000-0000-000000000005', '{STORE_1}', '{Z_DINING}', 'Ground Floor Service Desk', 'WS-SRV-1', 'SERVICE_DESK', 14.0, 8.0, 0.0, 2, true),
('a7000000-0000-0000-0000-000000000006', '{STORE_2}', '{Z2_CTR}', 'Riverside Main Register', 'WS-RIV-1', 'GENERIC_COUNTER', 4.0, 3.0, 0.9, 2, true);\n""")

    # 12. SHIFT TEMPLATES
    lines.append("-- 12. SHIFT TEMPLATES")
    lines.append(f"""INSERT INTO shift_template (id, store_id, name, start_time, end_time, is_active) VALUES
('f0000000-0000-0000-0000-000000000001', '{STORE_1}', 'Morning Shift', '07:00:00', '15:00:00', true),
('f0000000-0000-0000-0000-000000000002', '{STORE_1}', 'Afternoon Shift', '14:30:00', '22:30:00', true),
('f0000000-0000-0000-0000-000000000003', '{STORE_1}', 'Night Shift', '18:00:00', '23:00:00', true),
('f0000000-0000-0000-0000-000000000004', '{STORE_1}', 'Weekend Brunch (Inactive)', '09:00:00', '17:00:00', false),
('f0000000-0000-0000-0000-000000000005', '{STORE_2}', 'Riverside Morning', '07:00:00', '15:00:00', true),
('f0000000-0000-0000-0000-000000000006', '{STORE_2}', 'Riverside Afternoon', '14:30:00', '22:30:00', true);\n""")

    # 13. LEAVE REQUESTS & BLACKOUT DATES
    lines.append("-- 13. LEAVE REQUESTS & BLACKOUT DATES")
    lines.append(f"""INSERT INTO leave_request (id, staff_id, store_id, leave_type, start_date, end_date, status, reason, approved_by, created_at, approved_at, rejection_reason) VALUES
('b1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', '{STORE_1}', 'ANNUAL', '2026-09-18', '2026-09-19', 'APPROVED', 'Nghi phep viec gia dinh', '{MGR_1_ID}', '2026-09-15 08:00:00+00', '2026-09-15 09:00:00+00', NULL),
('b1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', '{STORE_1}', 'SICK', '2026-09-21', '2026-09-22', 'PENDING', 'Nghi kham suc khoe dinh ky', NULL, '2026-09-16 10:00:00+00', NULL, NULL),
('b1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000013', '{STORE_1}', 'EMERGENCY', '2026-09-10', '2026-09-10', 'REJECTED', 'Viec ca nhan dot xuat', '{MGR_1_ID}', '2026-09-09 14:00:00+00', NULL, 'Khong du nhan su ca toi'),
('b1000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007', '{STORE_1}', 'ANNUAL', '2026-09-22', '2026-09-22', 'APPROVED', 'Nghi phep ca nhan', '{MGR_1_ID}', '2026-09-14 09:00:00+00', '2026-09-14 10:00:00+00', NULL);

INSERT INTO blackout_date (id, staff_id, date, reason, leave_request_id) VALUES
('b2000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', '2026-09-18', 'Approved Annual Leave', 'b1000000-0000-0000-0000-000000000001'),
('b2000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', '2026-09-19', 'Approved Annual Leave', 'b1000000-0000-0000-0000-000000000001'),
('b2000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008', '2026-09-08', 'Past Approved Leave', NULL),
('b2000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007', '2026-09-22', 'Approved Future Leave (SCHED-04)', 'b1000000-0000-0000-0000-000000000004');\n""")

    # 14. SHIFTS, REQUIREMENTS, ASSIGNMENTS, ATTENDANCE
    # Standard prefix scheme:
    # shift:      f1000000-0000-0000-0000-{shift_num:012d}
    # req:        f2000000-0000-0000-0000-{req_num:012d}
    # assignment: f3000000-0000-0000-0000-{asgn_num:012d}
    # attendance: e3000000-0000-0000-0000-{att_num:012d}
    shift_rows = []
    skill_req_rows = []
    assignment_rows = []
    attendance_rows = []

    shift_num = 1
    req_num = 1
    asgn_num = 1
    att_num = 1

    # W37 Historical Shifts (Store 1: 2 shifts/day = 14 shifts, shift_num 1..14)
    for day_offset in range(7):
        date_str = f"2026-09-{7+day_offset:02d}"
        for s_idx, s_type in enumerate([("Morning", "07:00:00", "15:00:00", "f0000000-0000-0000-0000-000000000001"),
                                       ("Afternoon", "14:30:00", "22:30:00", "f0000000-0000-0000-0000-000000000002")]):
            s_id = f"f1000000-0000-0000-0000-{shift_num:012d}"
            status = 'CANCELLED' if (day_offset == 6 and s_type[0] == "Afternoon") else 'COMPLETED'
            shift_rows.append(f"('{s_id}', '{STORE_1}', '{s_type[3]}', '{date_str}', '{s_type[1]}', '{s_type[2]}', '{status}', '{date_str} 06:00:00+00', false, 0)")

            r1_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r1_id}', '{s_id}', '{SK_BARISTA_1}', 1)")
            req_num += 1
            r2_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r2_id}', '{s_id}', '{SK_CASHIER_1}', 1)")
            req_num += 1

            if status == 'COMPLETED':
                if s_idx == 0:  # Morning
                    b_num = (day_offset % 3) + 1       # Staff 1..3
                    c_num = (day_offset % 3) + 7       # Staff 7..9
                else:           # Afternoon
                    b_num = (day_offset % 3) + 4       # Staff 4..6
                    c_num = (day_offset % 3) + 10      # Staff 10..12

                staff_b = f"10000000-0000-0000-0000-{b_num:012d}"
                staff_c = f"10000000-0000-0000-0000-{c_num:012d}"

                asgn1_id = f"f3000000-0000-0000-0000-{asgn_num:012d}"
                assignment_rows.append(f"('{asgn1_id}', '{s_id}', '{staff_b}', 'AUTO', '{date_str} 00:00:00+00', false, '{Z_BARISTA}', '{SK_BARISTA_1}')")
                asgn_num += 1

                asgn2_id = f"f3000000-0000-0000-0000-{asgn_num:012d}"
                assignment_rows.append(f"('{asgn2_id}', '{s_id}', '{staff_c}', 'AUTO', '{date_str} 00:00:00+00', false, '{Z_POS}', '{SK_CASHIER_1}')")
                asgn_num += 1

                att1_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                attendance_rows.append(f"('{att1_id}', '{asgn1_id}', '{date_str} {s_type[1]}+00', 10.7768, 106.7008, '{date_str} {s_type[2]}+00', 10.7768, 106.7008, 'PRESENT', false)")
                att_num += 1

                att2_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                att_status = 'EARLY_LEAVE' if day_offset == 4 else 'PRESENT'
                co_time = "22:10:00" if att_status == 'EARLY_LEAVE' else s_type[2]
                attendance_rows.append(f"('{att2_id}', '{asgn2_id}', '{date_str} {s_type[1]}+00', 10.7768, 106.7008, '{date_str} {co_time}+00', 10.7768, 106.7008, '{att_status}', false)")
                att_num += 1

            shift_num += 1

    # W38 Current Week Shifts (Store 1: 4 shifts/day = 28 shifts, shift_num 15..42)
    for day_offset in range(7):
        curr_date = f"2026-09-{14+day_offset:02d}"
        s_configs = [
            ("Morning", "07:00:00", "15:00:00", "f0000000-0000-0000-0000-000000000001", SK_BARISTA_1, Z_BARISTA, SK_CASHIER_1, Z_POS),
            ("Midday", "10:00:00", "18:00:00", "f0000000-0000-0000-0000-000000000001", SK_BARISTA_1, Z_BARISTA, SK_WAITER_1, Z_DINING),
            ("Afternoon", "14:30:00", "22:30:00", "f0000000-0000-0000-0000-000000000002", SK_BARISTA_1, Z_BARISTA, SK_CASHIER_1, Z_POS),
            ("Night", "18:00:00", "23:00:00", "f0000000-0000-0000-0000-000000000003", SK_WAITER_1, Z_MEZZ, SK_CASHIER_1, Z_POS)
        ]
        for s_idx, s_type in enumerate(s_configs):
            s_id = f"f1000000-0000-0000-0000-{shift_num:012d}"
            is_open = True if (day_offset == 4 and s_type[0] == "Midday") else False
            shift_rows.append(f"('{s_id}', '{STORE_1}', '{s_type[3]}', '{curr_date}', '{s_type[1]}', '{s_type[2]}', 'PUBLISHED', '{curr_date} 06:00:00+00', {str(is_open).lower()}, 0)")

            r1_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r1_id}', '{s_id}', '{s_type[4]}', 1)")
            req_num += 1
            r2_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r2_id}', '{s_id}', '{s_type[6]}', 1)")
            req_num += 1

            if s_idx == 0:
                s1_num = ((day_offset * 3 + 0) % 6) + 1   # Barista 1..6
                s2_num = ((day_offset * 2 + 0) % 6) + 7   # Cashier 7..12
            elif s_idx == 1:
                s1_num = ((day_offset * 3 + 1) % 6) + 1   # Barista 1..6
                s2_num = ((day_offset * 2 + 0) % 6) + 13  # Waiter 13..18
            elif s_idx == 2:
                s1_num = ((day_offset * 3 + 2) % 6) + 1   # Barista 1..6
                s2_num = ((day_offset * 2 + 1) % 6) + 7   # Cashier 7..12
            else:
                s1_num = ((day_offset * 2 + 1) % 6) + 13  # Waiter 13..18
                s2_num = ((day_offset * 2 + 2) % 6) + 7   # Cashier 7..12

            staff_1 = f"10000000-0000-0000-0000-{s1_num:012d}"
            staff_2 = f"10000000-0000-0000-0000-{s2_num:012d}"

            asgn1_id = f"f3000000-0000-0000-0000-{asgn_num:012d}"
            assignment_rows.append(f"('{asgn1_id}', '{s_id}', '{staff_1}', 'AUTO', '{curr_date} 00:00:00+00', false, '{s_type[5]}', '{s_type[4]}')")
            asgn_num += 1

            asgn2_id = f"f3000000-0000-0000-0000-{asgn_num:012d}"
            assignment_rows.append(f"('{asgn2_id}', '{s_id}', '{staff_2}', 'AUTO', '{curr_date} 00:00:00+00', false, '{s_type[7]}', '{s_type[6]}')")
            asgn_num += 1

            # Attendance logic relative to anchor date 2026-09-17 (day_offset == 3)
            if day_offset < 3:
                att1_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                status_1 = 'LATE' if (day_offset == 0 and s_type[0] == "Morning") else 'PRESENT'
                ci_time_1 = "07:12:00" if status_1 == 'LATE' else s_type[1]
                attendance_rows.append(f"('{att1_id}', '{asgn1_id}', '{curr_date} {ci_time_1}+00', 10.7768, 106.7008, '{curr_date} {s_type[2]}+00', 10.7768, 106.7008, '{status_1}', false)")
                att_num += 1

                att2_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                attendance_rows.append(f"('{att2_id}', '{asgn2_id}', '{curr_date} {s_type[1]}+00', 10.7768, 106.7008, '{curr_date} {s_type[2]}+00', 10.7768, 106.7008, 'PRESENT', false)")
                att_num += 1
            elif day_offset == 3 and s_type[0] in ["Morning", "Midday"]:
                att1_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                attendance_rows.append(f"('{att1_id}', '{asgn1_id}', '{curr_date} {s_type[1]}+00', 10.7768, 106.7008, '{curr_date} {s_type[2]}+00', 10.7768, 106.7008, 'PRESENT', false)")
                att_num += 1
                att2_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                attendance_rows.append(f"('{att2_id}', '{asgn2_id}', '{curr_date} {s_type[1]}+00', 10.7768, 106.7008, '{curr_date} {s_type[2]}+00', 10.7768, 106.7008, 'PRESENT', false)")
                att_num += 1
            elif day_offset == 3 and s_type[0] == "Afternoon":
                # Currently checked-in (active shift, check_out is NULL!)
                att1_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                attendance_rows.append(f"('{att1_id}', '{asgn1_id}', '{curr_date} 14:28:00+00', 10.7768, 106.7008, NULL, NULL, NULL, 'PRESENT', false)")
                att_num += 1
                att2_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                attendance_rows.append(f"('{att2_id}', '{asgn2_id}', '{curr_date} 14:31:00+00', 10.7768, 106.7008, NULL, NULL, NULL, 'PRESENT', false)")
                att_num += 1

            shift_num += 1

    # Store 2 W38 Current Shifts (14 shifts, shift_num 43..56)
    for day_offset in range(7):
        curr_date = f"2026-09-{14+day_offset:02d}"
        for s_idx, s_type in enumerate([("Riverside Morning", "07:00:00", "15:00:00", "f0000000-0000-0000-0000-000000000005"),
                                       ("Riverside Afternoon", "14:30:00", "22:30:00", "f0000000-0000-0000-0000-000000000006")]):
            s_id = f"f1000000-0000-0000-0000-{shift_num:012d}"
            shift_rows.append(f"('{s_id}', '{STORE_2}', '{s_type[3]}', '{curr_date}', '{s_type[1]}', '{s_type[2]}', 'PUBLISHED', '{curr_date} 06:00:00+00', false, 0)")

            r1_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r1_id}', '{s_id}', '{SK_BARISTA_2}', 1)")
            req_num += 1

            s2_staff = "70000000-0000-0000-0000-000000000001" if s_idx == 0 else "70000000-0000-0000-0000-000000000004"
            asgn1_id = f"f3000000-0000-0000-0000-{asgn_num:012d}"
            assignment_rows.append(f"('{asgn1_id}', '{s_id}', '{s2_staff}', 'AUTO', '{curr_date} 00:00:00+00', false, '{Z2_CTR}', '{SK_BARISTA_2}')")
            asgn_num += 1

            if day_offset < 3:
                att1_id = f"e3000000-0000-0000-0000-{att_num:012d}"
                attendance_rows.append(f"('{att1_id}', '{asgn1_id}', '{curr_date} {s_type[1]}+00', 10.7712, 106.7056, '{curr_date} {s_type[2]}+00', 10.7712, 106.7056, 'PRESENT', false)")
                att_num += 1

            shift_num += 1

    # W39 Next Week Shifts (DRAFT shifts ready for AutoScheduler)
    # Store 1: 4 shifts/day across 7 days (2026-09-21 to 2026-09-27) = 28 shifts (shift_num 57..84)
    for day_offset in range(7):
        next_date = f"2026-09-{21+day_offset:02d}"
        s_configs = [
            ("Morning", "07:00:00", "15:00:00", "f0000000-0000-0000-0000-000000000001"),
            ("Afternoon", "14:30:00", "22:30:00", "f0000000-0000-0000-0000-000000000002"),
            ("Night", "18:00:00", "23:00:00", "f0000000-0000-0000-0000-000000000003"),
            ("Midday", "10:00:00", "18:00:00", "f0000000-0000-0000-0000-000000000001")
        ]
        for s_type in s_configs:
            s_id = f"f1000000-0000-0000-0000-{shift_num:012d}"
            shift_rows.append(f"('{s_id}', '{STORE_1}', '{s_type[3]}', '{next_date}', '{s_type[1]}', '{s_type[2]}', 'DRAFT', '{next_date} 06:00:00+00', false, 0)")

            r1_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r1_id}', '{s_id}', '{SK_BARISTA_1}', 1)")
            req_num += 1
            r2_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r2_id}', '{s_id}', '{SK_CASHIER_1}', 1)")
            req_num += 1
            r3_id = f"f2000000-0000-0000-0000-{req_num:012d}"
            skill_req_rows.append(f"('{r3_id}', '{s_id}', '{SK_WAITER_1}', 1)")
            req_num += 1
            shift_num += 1

    # Store 2 Next Week Shifts (DRAFT with INSUFFICIENT STAFF: demand 6, supply 3 -> tests SCHED-06!)
    for day_offset in range(3):
        s2_date = f"2026-09-{21+day_offset:02d}"
        s_id = f"f1000000-0000-0000-0000-{shift_num:012d}"
        shift_rows.append(f"('{s_id}', '{STORE_2}', 'f0000000-0000-0000-0000-000000000005', '{s2_date}', '08:00:00', '16:00:00', 'DRAFT', '{s2_date} 06:00:00+00', false, 0)")

        r1_id = f"f2000000-0000-0000-0000-{req_num:012d}"
        skill_req_rows.append(f"('{r1_id}', '{s_id}', '{SK_BARISTA_2}', 2)")
        req_num += 1
        r2_id = f"f2000000-0000-0000-0000-{req_num:012d}"
        skill_req_rows.append(f"('{r2_id}', '{s_id}', '{SK_CASHIER_2}', 2)")
        req_num += 1
        r3_id = f"f2000000-0000-0000-0000-{req_num:012d}"
        skill_req_rows.append(f"('{r3_id}', '{s_id}', '{SK_WAITER_2}', 2)")
        req_num += 1
        shift_num += 1

    lines.append("INSERT INTO shift (id, store_id, shift_template_id, shift_date, start_time, end_time, status, availability_deadline, is_open, version) VALUES")
    lines.append(",\n".join(shift_rows) + ";\n")

    lines.append("-- 15. SHIFT SKILL REQUIREMENTS")
    lines.append("INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES")
    lines.append(",\n".join(skill_req_rows) + ";\n")

    lines.append("-- 16. SHIFT ASSIGNMENTS")
    lines.append("INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at, deleted, zone_id, required_skill_id) VALUES")
    lines.append(",\n".join(assignment_rows) + ";\n")

    lines.append("-- 17. ATTENDANCE")
    lines.append("INSERT INTO attendance (id, shift_assignment_id, check_in_time, check_in_lat, check_in_lng, check_out_time, check_out_lat, check_out_lng, status, deleted) VALUES")
    lines.append(",\n".join(attendance_rows) + ";\n")

    # 18. ATTENDANCE ADJUSTMENT REQUESTS (referencing actual valid attendance IDs 1, 2, 3 and shift IDs 1, 2)
    lines.append("-- 18. ATTENDANCE ADJUSTMENT REQUESTS")
    lines.append(f"""INSERT INTO attendance_adjustment_request (id, attendance_id, staff_id, shift_id, requested_check_in, requested_check_out, reason, status, approved_by, created_at, approved_at) VALUES
('c1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '2026-09-07 06:58:00+00', '2026-09-07 15:02:00+00', 'Ket xe do mua lon, co mat 06:58 nhung may cham cong bao loi', 'PENDING', NULL, '2026-09-07 15:30:00+00', NULL),
('c1000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', '2026-09-07 07:00:00+00', '2026-09-07 15:00:00+00', 'Quen quet the checkout khi het ca', 'APPROVED', '{MGR_1_ID}', '2026-09-07 16:00:00+00', '2026-09-07 17:00:00+00'),
('c1000000-0000-0000-0000-000000000003', 'e3000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', '2026-09-07 14:00:00+00', '2026-09-07 22:30:00+00', 'Xin dieu chinh vi ly do ca nhan', 'REJECTED', '{MGR_1_ID}', '2026-09-08 08:00:00+00', '2026-09-08 09:00:00+00');\n""")

    # 19. SHIFT SWAP REQUESTS (referencing actual valid shifts 15 and 16)
    lines.append("-- 19. SHIFT SWAP REQUESTS")
    lines.append(f"""INSERT INTO shift_swap_request (id, from_shift_id, from_staff_id, to_shift_id, to_staff_id, status, employee_accepted, approved_by) VALUES
('c2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002', 'PENDING', true, NULL),
('c2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000004', 'PENDING', false, NULL),
('c2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'APPROVED', true, '{MGR_1_ID}');\n""")

    # 20. OPEN SHIFT CLAIMS (Shift 34 is Friday Midday open shift)
    lines.append("-- 20. OPEN SHIFT CLAIMS")
    lines.append(f"""INSERT INTO open_shift_claim (id, shift_id, staff_id, status, claimed_at) VALUES
('c3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000006', 'PENDING', '2026-09-16 03:00:00+00'),
('c3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', 'APPROVED', '2026-09-08 04:00:00+00');\n""")

    # 21. WORKFORCE REQUESTS & PROPOSALS
    lines.append("-- 21. WORKFORCE REQUESTS & PROPOSALS")
    lines.append(f"""INSERT INTO workforce_request (id, requesting_store_id, target_store_id, shift_id, status, created_by, created_at, updated_at) VALUES
('c4000000-0000-0000-0000-000000000001', '{STORE_1}', '{STORE_2}', 'f1000000-0000-0000-0000-000000000015', 'PROPOSAL_SENT', '{MGR_1_ID}', '2026-09-16 08:00:00+00', '2026-09-16 09:00:00+00'),
('c4000000-0000-0000-0000-000000000002', '{STORE_1}', '{STORE_2}', 'f1000000-0000-0000-0000-000000000016', 'PENDING', '{MGR_1_ID}', '2026-09-16 10:00:00+00', '2026-09-16 10:00:00+00'),
('c4000000-0000-0000-0000-000000000003', '{STORE_1}', '{STORE_2}', 'f1000000-0000-0000-0000-000000000001', 'COMPLETED', '{MGR_1_ID}', '2026-09-07 08:00:00+00', '2026-09-07 10:00:00+00'),
('c4000000-0000-0000-0000-000000000004', '{STORE_2}', '{STORE_1}', 'f1000000-0000-0000-0000-000000000043', 'MANAGER_REJECTED', '{MGR_2_ID}', '2026-09-15 08:00:00+00', '2026-09-15 09:30:00+00');

INSERT INTO workforce_proposal (id, workforce_request_id, staff_id, status, proposed_by, created_at, responded_at) VALUES
('c5000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'PENDING', '{MGR_2_ID}', '2026-09-16 09:00:00+00', NULL),
('c5000000-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 'ACCEPTED', '{MGR_2_ID}', '2026-09-07 08:30:00+00', '2026-09-07 09:00:00+00');\n""")

    # 22. PAYROLL PERIODS & PAYROLL RECORDS
    lines.append("-- 22. PAYROLL PERIODS & PAYROLL RECORDS")
    lines.append(f"""INSERT INTO payroll_period (id, store_id, start_date, end_date, status) VALUES
('e1000000-0000-0000-0000-000000000001', '{STORE_1}', '2026-08-01', '2026-08-31', 'PAID'),
('e1000000-0000-0000-0000-000000000002', '{STORE_1}', '2026-09-01', '2026-09-30', 'DRAFT'),
('e1000000-0000-0000-0000-000000000003', '{STORE_2}', '2026-08-01', '2026-08-31', 'PAID');\n""")

    payroll_rows = []
    # Store 1 August Payroll (23 employees)
    for i in range(1, 21):
        s_id = f"10000000-0000-0000-0000-{i:012d}"
        p_id = f"e2000000-0000-0000-0001-{i:012d}"
        base_rate = 22.00 + (i % 5) * 2.00
        tot_hrs = 160.00 + (i % 4) * 8.00
        ot_hrs = 8.00 if i % 3 == 0 else 0.00
        hol_hrs = 8.00 if i % 4 == 0 else 0.00
        base_amt = tot_hrs * base_rate
        ot_amt = ot_hrs * (base_rate * 1.5)
        hol_amt = hol_hrs * (base_rate * 2.0)
        tot_amt = base_amt + ot_amt + hol_amt
        payroll_rows.append(f"('{p_id}', 'e1000000-0000-0000-0000-000000000001', '{s_id}', {tot_hrs:.2f}, {ot_hrs:.2f}, {hol_hrs:.2f}, {base_amt:.2f}, {ot_amt:.2f}, {hol_amt:.2f}, {tot_amt:.2f}, '2026-09-01 02:00:00+00', false)")

    payroll_rows.append(f"('e2000000-0000-0000-0001-000000000099', 'e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000099', 80.00, 0.00, 0.00, 1200.00, 0.00, 0.00, 1200.00, '2026-09-01 02:00:00+00', false)")
    payroll_rows.append(f"('e2000000-0000-0000-0001-000000000021', 'e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000021', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-09-01 02:00:00+00', false)")
    payroll_rows.append(f"('e2000000-0000-0000-0001-000000000022', 'e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000022', 40.00, 0.00, 0.00, 880.00, 0.00, 0.00, 880.00, '2026-09-01 02:00:00+00', false)")

    # Store 2 August Payroll (Chris, David, Emma, Frank)
    s2_rates = [(1, 25.00), (2, 22.00), (3, 20.00), (4, 24.00)]
    for num, rate in s2_rates:
        s_id = f"70000000-0000-0000-0000-{num:012d}"
        p_id = f"e2000000-0000-0000-0002-{num:012d}"
        base_amt = 160.00 * rate
        payroll_rows.append(f"('{p_id}', 'e1000000-0000-0000-0000-000000000003', '{s_id}', 160.00, 0.00, 0.00, {base_amt:.2f}, 0.00, 0.00, {base_amt:.2f}, '2026-09-01 02:00:00+00', false)")

    lines.append("INSERT INTO payroll (id, payroll_period_id, staff_id, total_hours, ot_hours, holiday_hours, base_amount, ot_amount, holiday_amount, total_amount, generated_at, deleted) VALUES")
    lines.append(",\n".join(payroll_rows) + ";\n")

    # 23. NOTIFICATIONS & PREFERENCES
    lines.append("-- 23. NOTIFICATIONS & PREFERENCES")
    notif_rows = [
        f"('f4000000-0000-0000-0000-000000000001', '{MGR_1_ID}', 'SCHEDULE_PUBLISHED', 'Lich tuan hien tai da phat hanh', 'Lich lam viec tuan nay (14/09 - 20/09) da duoc phan bo khong gian 3D thanh cong.', false, '2026-09-14 06:00:00+00')",
        f"('f4000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'SHIFT_REMINDER', 'Nhac nho ca lam viec', 'Ban co ca lam viec chieu nay luc 14:30 tai quay Barista Counter.', false, '2026-09-17 07:00:00+00')",
        f"('f4000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008', 'LEAVE_REQUEST_UPDATED', 'Don nghi phep da duoc duyet', 'Don xin nghi phep ngay 18/09 - 19/09 cua ban da duoc Quan ly Alice phe duyet.', true, '2026-09-15 09:00:00+00')",
        f"('f4000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'PAYROLL_COMPLETED', 'Phieu luong thang 08/2026 da san sang', 'Bang luong ky 01/08 - 31/08 da duoc thanh toan. Ban co the tai phieu luong PDF.', true, '2026-09-01 08:00:00+00')",
        f"('f4000000-0000-0000-0000-000000000005', '{MGR_1_ID}', 'WORKFORCE_REQUEST_UPDATED', 'De xuat chia se nhan su tu Store 2', 'Quan ly Bob da de xuat nhan vien Chris ho tro ca lam viec ngay 14/09.', false, '2026-09-16 09:00:00+00')",
    ]
    lines.append("INSERT INTO notification (id, staff_id, type, title, message, is_read, created_at) VALUES")
    lines.append(",\n".join(notif_rows) + ";\n")

    pref_rows = []
    p_counter = 1
    notif_types = ["SCHEDULE_PUBLISHED", "SHIFT_SWAP_UPDATED", "OPEN_SHIFT_AVAILABLE", "SHIFT_REMINDER", "PAYROLL_COMPLETED", "LEAVE_REQUEST_UPDATED", "ATTENDANCE_ADJUSTMENT_UPDATED", "WORKFORCE_REQUEST_UPDATED"]
    all_staff_ids = [ADMIN_ID, MGR_1_ID, MGR_2_ID] + [f"10000000-0000-0000-0000-{i:012d}" for i in range(1, 21)] + ["10000000-0000-0000-0000-000000000099"] + [f"70000000-0000-0000-0000-{i:012d}" for i in range(1, 6)]
    for st_id in all_staff_ids:
        for nt in notif_types:
            pref_rows.append(f"('f5000000-0000-0000-0000-{p_counter:012d}', '{st_id}', '{nt}', true, '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00')")
            p_counter += 1

    lines.append("INSERT INTO notification_preference (id, staff_id, notification_type, enabled, created_at, updated_at) VALUES")
    lines.append(",\n".join(pref_rows) + ";\n")

    # 24. HOLIDAYS
    lines.append("-- 24. HOLIDAYS")
    lines.append("""INSERT INTO holiday (id, holiday_date, name, rate_multiplier) VALUES
('f8000000-0000-0000-0000-000000000001', '2026-01-01', 'New Year''s Day', 2.00),
('f8000000-0000-0000-0000-000000000002', '2026-04-30', 'Reunification Day', 3.00),
('f8000000-0000-0000-0000-000000000003', '2026-05-01', 'International Labor Day', 3.00),
('f8000000-0000-0000-0000-000000000004', '2026-09-02', 'Vietnam National Day', 3.00);\n""")

    # 25. AUDIT LOGS
    lines.append("-- 25. AUDIT LOGS")
    lines.append(f"""INSERT INTO audit_log (id, actor_staff_id, action, entity_type, entity_id, before_data, after_data, created_at) VALUES
('f9000000-0000-0000-0000-000000000001', '{MGR_1_ID}', 'SCHEDULE_PUBLISHED', 'Schedule', '{STORE_1}', NULL, '{{"week": "2026-W38", "shifts_published": 28}}', '2026-09-14 06:00:00+00'),
('f9000000-0000-0000-0000-000000000002', '{MGR_1_ID}', 'LEAVE_REQUEST_APPROVED', 'LeaveRequest', 'b1000000-0000-0000-0000-000000000001', '{{"status": "PENDING"}}', '{{"status": "APPROVED"}}', '2026-09-15 09:00:00+00'),
('f9000000-0000-0000-0000-000000000003', '{ADMIN_ID}', 'PAYROLL_PERIOD_CREATED', 'PayrollPeriod', 'e1000000-0000-0000-0000-000000000002', NULL, '{{"store_id": "{STORE_1}", "period": "2026-09"}}', '2026-09-01 01:00:00+00'),
('f9000000-0000-0000-0000-000000000004', '{MGR_1_ID}', 'WORKFORCE_REQUEST_CREATED', 'WorkforceRequest', 'c4000000-0000-0000-0000-000000000001', NULL, '{{"target_store": "{STORE_2}", "shift_id": "f1000000-0000-0000-0000-000000000015"}}', '2026-09-16 08:00:00+00');\n""")

    lines.append("COMMIT;\n")

    sql_content = "\n".join(lines)
    with open(r"D:\ThucTapTotNghiep\ShiftSync\shiftsync-backend\scripts\seed\seed_master_dataset.sql", "w", encoding="utf-8") as f:
        f.write(sql_content)

    print("Successfully generated clean, unified Master Seed Dataset SQL!")

if __name__ == "__main__":
    main()
