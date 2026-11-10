-- Additive weekly snapshots. Existing recurring declarations remain intact.
-- No historical weeks are inferred from today's recurring template.
CREATE TABLE availability_week (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    revision BIGINT NOT NULL DEFAULT 1,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_availability_week_staff UNIQUE (staff_id, week_start),
    CONSTRAINT chk_availability_week_monday CHECK (EXTRACT(ISODOW FROM week_start) = 1),
    CONSTRAINT chk_availability_week_revision CHECK (revision > 0)
);
CREATE TABLE availability_week_slot (
    id UUID PRIMARY KEY,
    week_id UUID NOT NULL REFERENCES availability_week(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT chk_availability_week_slot_times CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_week_slot_week ON availability_week_slot(week_id);
