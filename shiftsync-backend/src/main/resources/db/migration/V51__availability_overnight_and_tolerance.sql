-- End earlier than start means the following day; equal times are invalid.
ALTER TABLE availability DROP CONSTRAINT chk_availability_time;
ALTER TABLE availability ADD CONSTRAINT chk_availability_time CHECK (end_time <> start_time);

-- Exact coverage is the default. Any tolerance must be explicitly configured.
ALTER TABLE store_configuration ADD COLUMN availability_tolerance_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE store_configuration ADD CONSTRAINT chk_availability_tolerance
    CHECK (availability_tolerance_minutes BETWEEN 0 AND 60);
