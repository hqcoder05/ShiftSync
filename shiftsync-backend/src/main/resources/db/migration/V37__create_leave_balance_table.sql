-- Flyway Migration V37: Create leave_balance table for annual leave entitlement tracking and concurrency control
CREATE TABLE IF NOT EXISTS leave_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    year INT NOT NULL,
    annual_entitlement INT NOT NULL DEFAULT 12,
    carry_over_days INT NOT NULL DEFAULT 0,
    used_days INT NOT NULL DEFAULT 0,
    pending_days INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_staff_store_year UNIQUE (staff_id, store_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balance_staff_store_year ON leave_balance(staff_id, store_id, year);
