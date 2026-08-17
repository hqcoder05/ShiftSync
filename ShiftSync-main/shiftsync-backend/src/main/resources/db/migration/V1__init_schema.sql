-- ============================================================
-- Employee Scheduling App — Database Schema (PostgreSQL)
-- Deliverable: W2.2 — Database Design
-- Matches: ERD.mermaid
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------- ENUM TYPES ----------
CREATE TYPE system_role_enum        AS ENUM ('ADMIN', 'MANAGER', 'STAFF');
CREATE TYPE employment_type_enum    AS ENUM ('PART_TIME', 'FULL_TIME', 'SEASONAL', 'INTERN');
CREATE TYPE employment_status_enum  AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE skill_level_enum        AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE shift_status_enum       AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');
CREATE TYPE approval_status_enum    AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE swap_status_enum        AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE assignment_source_enum  AS ENUM ('MANUAL', 'AUTO', 'SWAP', 'OPEN_SHIFT', 'WORKFORCE_SHARING');
CREATE TYPE leave_type_enum         AS ENUM ('SICK', 'ANNUAL', 'UNPAID');
CREATE TYPE workforce_status_enum   AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CONFIRMED');
CREATE TYPE workforce_assign_status_enum AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED');
CREATE TYPE attendance_status_enum  AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EARLY_LEAVE');
CREATE TYPE payroll_period_status_enum AS ENUM ('DRAFT', 'CONFIRMED', 'PAID');

-- ============================================================
-- 1. User & Organization
-- ============================================================

CREATE TABLE store (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    address     VARCHAR(255),
    latitude    DECIMAL(10,7),
    longitude   DECIMAL(10,7),
    open_time   TIME,
    close_time  TIME,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    phone          VARCHAR(20),
    password_hash  VARCHAR(255) NOT NULL,
    system_role    system_role_enum NOT NULL DEFAULT 'STAFF',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employment: quan hệ làm việc Staff <-> Store (BR-44, BR-45, BR-46)
CREATE TABLE employment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    store_id        UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    employment_type employment_type_enum NOT NULL,
    hourly_rate     DECIMAL(12,2) NOT NULL,
    status          employment_status_enum NOT NULL DEFAULT 'ACTIVE',
    joined_date     DATE NOT NULL,
    left_date       DATE,
    CONSTRAINT chk_employment_dates CHECK (left_date IS NULL OR left_date >= joined_date)
);
CREATE INDEX idx_employment_staff ON employment(staff_id);
CREATE INDEX idx_employment_store ON employment(store_id);

-- ============================================================
-- 2. Skill Management (thay Role Management — BR-05, BR-06)
-- ============================================================

CREATE TABLE skill (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    UNIQUE (store_id, name)
);

CREATE TABLE staff_skill (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
    level           skill_level_enum NOT NULL DEFAULT 'BEGINNER',
    expiration_date DATE, -- BR-53: Skill Expiration (nullable = không hết hạn)
    UNIQUE (staff_id, skill_id)
);

-- ============================================================
-- 3. Availability (BR-08, BR-09, BR-10)
-- ============================================================

CREATE TABLE availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=CN
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    CONSTRAINT chk_availability_time CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_staff ON availability(staff_id);

CREATE TABLE blackout_date (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    "date"   DATE NOT NULL,
    reason   VARCHAR(255),
    UNIQUE (staff_id, "date")
);

-- ============================================================
-- 4. Shift Management (BR-11 .. BR-22)
-- ============================================================

CREATE TABLE shift_template (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id   UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time   TIME NOT NULL
);

CREATE TABLE shift (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id               UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    shift_template_id      UUID REFERENCES shift_template(id),
    shift_date             DATE NOT NULL,
    start_time             TIME NOT NULL,
    end_time               TIME NOT NULL,
    status                 shift_status_enum NOT NULL DEFAULT 'DRAFT',
    registration_deadline  TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_shift_store_date ON shift(store_id, shift_date);

-- Shift Requirement theo Skill (BR-15, thay cho theo Role)
CREATE TABLE shift_skill_requirement (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id       UUID NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
    skill_id       UUID NOT NULL REFERENCES skill(id),
    required_count INT NOT NULL CHECK (required_count > 0),
    UNIQUE (shift_id, skill_id)
);

CREATE TABLE shift_assignment (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id     UUID NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
    staff_id     UUID NOT NULL REFERENCES staff(id),
    source       assignment_source_enum NOT NULL DEFAULT 'MANUAL',
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shift_id, staff_id) -- BR-17: không trùng ca cho cùng 1 shift
);
CREATE INDEX idx_shift_assignment_staff ON shift_assignment(staff_id);

CREATE TABLE shift_registration (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id      UUID NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
    staff_id      UUID NOT NULL REFERENCES staff(id),
    status        approval_status_enum NOT NULL DEFAULT 'PENDING',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shift_id, staff_id)
);

-- ============================================================
-- 5. Leave Management (BR-47, BR-48, BR-49)
-- ============================================================

CREATE TABLE leave_request (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    leave_type  leave_type_enum NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      approval_status_enum NOT NULL DEFAULT 'PENDING',
    reason      VARCHAR(255),
    approved_by UUID REFERENCES staff(id),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);
CREATE INDEX idx_leave_staff ON leave_request(staff_id);

-- ============================================================
-- 6. Marketplace: Shift Swap & Open Shift (BR-23 .. BR-27)
-- ============================================================

CREATE TABLE shift_swap_request (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id      UUID NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
    from_staff_id UUID NOT NULL REFERENCES staff(id),
    to_staff_id   UUID NOT NULL REFERENCES staff(id),
    status        swap_status_enum NOT NULL DEFAULT 'PENDING',
    approved_by   UUID REFERENCES staff(id),
    CONSTRAINT chk_swap_not_self CHECK (from_staff_id <> to_staff_id)
);

CREATE TABLE open_shift_claim (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id   UUID NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
    staff_id   UUID NOT NULL REFERENCES staff(id),
    status     approval_status_enum NOT NULL DEFAULT 'PENDING',
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. Inter-Store Workforce Sharing (BR-39 .. BR-43)
-- ============================================================

CREATE TABLE workforce_request (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requesting_store_id UUID NOT NULL REFERENCES store(id),
    target_store_id     UUID NOT NULL REFERENCES store(id),
    shift_id            UUID REFERENCES shift(id),
    skill_id            UUID NOT NULL REFERENCES skill(id),
    needed_count        INT NOT NULL CHECK (needed_count > 0),
    status              workforce_status_enum NOT NULL DEFAULT 'PENDING',
    created_by          UUID NOT NULL REFERENCES staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_workforce_diff_store CHECK (requesting_store_id <> target_store_id)
);

CREATE TABLE workforce_assignment (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workforce_request_id UUID NOT NULL REFERENCES workforce_request(id) ON DELETE CASCADE,
    staff_id             UUID NOT NULL REFERENCES staff(id),
    status               workforce_assign_status_enum NOT NULL DEFAULT 'PROPOSED',
    confirmed_at         TIMESTAMPTZ
);

CREATE TABLE workforce_request_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workforce_request_id  UUID NOT NULL REFERENCES workforce_request(id) ON DELETE CASCADE,
    actor_staff_id        UUID NOT NULL REFERENCES staff(id),
    action                VARCHAR(50) NOT NULL,
    note                  VARCHAR(255),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. Attendance (BR-28 .. BR-31, BR-54, BR-55)
-- ============================================================

CREATE TABLE attendance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_assignment_id UUID NOT NULL UNIQUE REFERENCES shift_assignment(id) ON DELETE CASCADE, -- BR-30: 1 shift chỉ check-in 1 lần
    check_in_time       TIMESTAMPTZ,
    check_in_lat        DECIMAL(10,7),
    check_in_lng        DECIMAL(10,7),
    check_out_time      TIMESTAMPTZ,
    check_out_lat       DECIMAL(10,7),
    check_out_lng       DECIMAL(10,7),
    status              attendance_status_enum
);

-- BR-54: không sửa Attendance trực tiếp, phải qua request
CREATE TABLE attendance_adjustment_request (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id       UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    staff_id            UUID NOT NULL REFERENCES staff(id),
    requested_check_in  TIMESTAMPTZ,
    requested_check_out TIMESTAMPTZ,
    reason              VARCHAR(255),
    status              approval_status_enum NOT NULL DEFAULT 'PENDING',
    approved_by         UUID REFERENCES staff(id)
);

-- ============================================================
-- 9. Payroll (BR-32 .. BR-34, BR-52, BR-56, BR-57)
-- ============================================================

CREATE TABLE holiday (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date    DATE NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    rate_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0 -- VD: 3.00 = 300%
);

CREATE TABLE payroll_period (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id   UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date   DATE NOT NULL,
    status     payroll_period_status_enum NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT chk_payroll_period_dates CHECK (end_date > start_date),
    UNIQUE (store_id, start_date, end_date)
);

CREATE TABLE payroll (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID NOT NULL REFERENCES payroll_period(id) ON DELETE CASCADE,
    staff_id          UUID NOT NULL REFERENCES staff(id),
    total_hours       DECIMAL(8,2) NOT NULL DEFAULT 0,
    ot_hours          DECIMAL(8,2) NOT NULL DEFAULT 0,
    holiday_hours     DECIMAL(8,2) NOT NULL DEFAULT 0,
    base_amount       DECIMAL(14,2) NOT NULL DEFAULT 0,
    ot_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
    holiday_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (payroll_period_id, staff_id)
);

-- ============================================================
-- 10. Store & Scheduler Configuration (BR-50, BR-51)
-- ============================================================

CREATE TABLE store_configuration (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id                    UUID NOT NULL UNIQUE REFERENCES store(id) ON DELETE CASCADE,
    max_hour_per_week           INT NOT NULL DEFAULT 48,
    min_rest_hours              INT NOT NULL DEFAULT 8,
    geofence_radius_m           INT NOT NULL DEFAULT 100,
    registration_deadline_hours INT NOT NULL DEFAULT 24
);

CREATE TABLE scheduler_configuration (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id         UUID NOT NULL UNIQUE REFERENCES store(id) ON DELETE CASCADE,
    fairness_weight  DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    skill_weight     DECIMAL(4,3) NOT NULL DEFAULT 0.30,
    hour_weight      DECIMAL(4,3) NOT NULL DEFAULT 0.20,
    priority_weight  DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    availability_weight DECIMAL(4,3) NOT NULL DEFAULT 0.30,
    CONSTRAINT chk_weights_sum CHECK (
        fairness_weight + skill_weight + hour_weight + priority_weight + availability_weight = 1.000
    )
);

-- ============================================================
-- 11. Notification (BR-35, FR-38)
-- ============================================================

CREATE TABLE notification (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(150) NOT NULL,
    message    VARCHAR(500),
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_staff ON notification(staff_id, is_read);

CREATE TABLE notification_preference (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id          UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (staff_id, notification_type)
);

-- ============================================================
-- 12. Audit Log (BR-36, BR-38 — append-only, no hard delete)
-- ============================================================

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_staff_id  UUID REFERENCES staff(id),
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    before_data     JSONB,
    after_data      JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
