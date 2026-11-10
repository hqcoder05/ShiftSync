CREATE TABLE activity_shift_claim (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL UNIQUE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    store_id UUID NOT NULL REFERENCES store(id),
    shift_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);
CREATE INDEX idx_activity_claim_staff_time ON activity_shift_claim(staff_id, occurred_at DESC);
-- Existing OPEN_SHIFT assignments retain their actual assigned_at timestamp.
-- No event is inferred for assignments whose original owner/source was already replaced.
INSERT INTO activity_shift_claim(assignment_id, staff_id, store_id, shift_id, occurred_at, shift_date, start_time, end_time)
SELECT a.id, a.staff_id, s.store_id, s.id, a.assigned_at, s.shift_date, s.start_time, s.end_time
FROM shift_assignment a JOIN shift s ON s.id = a.shift_id
WHERE a.source = 'OPEN_SHIFT' AND NOT a.deleted AND a.assigned_at IS NOT NULL;
