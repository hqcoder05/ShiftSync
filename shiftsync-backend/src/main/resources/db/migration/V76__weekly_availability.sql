-- Weekly submissions are separate from recurring availability templates.
CREATE TABLE weekly_availability (
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (staff_id, week_start),
    CHECK (EXTRACT(ISODOW FROM week_start) = 1),
    CHECK (revision >= 0)
);

CREATE TABLE weekly_availability_slot (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL,
    week_start DATE NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (staff_id, week_start)
        REFERENCES weekly_availability(staff_id, week_start) ON DELETE CASCADE,
    CHECK (start_time <> end_time)
);
