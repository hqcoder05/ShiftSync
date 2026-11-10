-- Only writes from the new history hooks are recorded. No historical events are inferred.
-- shift_id deliberately has no FK: an actual deletion must not erase its history.
CREATE TABLE schedule_change (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id),
    shift_id UUID NOT NULL,
    actor_id UUID,
    actor_name VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    before_date DATE,
    after_date DATE,
    employee_visible BOOLEAN NOT NULL,
    before_data JSONB,
    after_data JSONB,
    CONSTRAINT chk_schedule_change_state CHECK (before_data IS NOT NULL OR after_data IS NOT NULL)
);
CREATE INDEX idx_schedule_change_before ON schedule_change(store_id, before_date, changed_at DESC);
CREATE INDEX idx_schedule_change_after ON schedule_change(store_id, after_date, changed_at DESC);
