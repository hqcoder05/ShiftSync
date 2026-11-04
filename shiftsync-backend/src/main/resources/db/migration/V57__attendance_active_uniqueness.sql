ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_shift_assignment_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_active_assignment
    ON attendance (shift_assignment_id) WHERE deleted = false;
