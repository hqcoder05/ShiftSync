-- Unknown historical transition times deliberately remain NULL.
ALTER TABLE shift_swap_request
    ADD COLUMN created_at TIMESTAMPTZ,
    ADD COLUMN employee_responded_at TIMESTAMPTZ,
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN manager_note TEXT,
    ADD COLUMN cancelled_at TIMESTAMPTZ,
    ADD COLUMN cancelled_by_id UUID,
    ADD COLUMN cancelled_by_name VARCHAR(255);

ALTER TABLE staff_requests
    ADD COLUMN requester_id UUID REFERENCES staff(id),
    ADD COLUMN store_id UUID REFERENCES store(id),
    ADD COLUMN reviewed_by_id UUID,
    ADD COLUMN reviewed_by_name VARCHAR(255),
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN manager_note TEXT;

-- Resolve legacy names only when there is one unambiguous user.
UPDATE staff_requests r
SET requester_id = s.id
FROM staff s
WHERE lower(trim(r.requester_name)) = lower(trim(s.full_name))
  AND (SELECT count(*) FROM staff candidate
       WHERE lower(trim(candidate.full_name)) = lower(trim(r.requester_name))) = 1;

-- Do not guess a legacy request's store for staff working in multiple stores.
UPDATE staff_requests r
SET store_id = e.store_id
FROM employment e
WHERE e.staff_id = r.requester_id AND e.status = 'ACTIVE'
  AND (SELECT count(DISTINCT active.store_id) FROM employment active
       WHERE active.staff_id = r.requester_id AND active.status = 'ACTIVE') = 1;

CREATE INDEX idx_staff_requests_requester_id ON staff_requests(requester_id);
CREATE INDEX idx_staff_requests_store_id ON staff_requests(store_id);
