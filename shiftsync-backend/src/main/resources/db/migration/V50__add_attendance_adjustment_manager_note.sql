ALTER TABLE attendance_adjustment_request
    ADD COLUMN IF NOT EXISTS manager_note VARCHAR(500);
