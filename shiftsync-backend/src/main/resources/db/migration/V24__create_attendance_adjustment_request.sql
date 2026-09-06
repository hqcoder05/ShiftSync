-- Modify the existing attendance_adjustment_request table created in V1

-- 1. attendance_id must be nullable for case "forget check-in"
ALTER TABLE attendance_adjustment_request ALTER COLUMN attendance_id DROP NOT NULL;

-- 2. Increase reason length to 500
ALTER TABLE attendance_adjustment_request ALTER COLUMN reason TYPE VARCHAR(500);

-- 3. Add missing columns
ALTER TABLE attendance_adjustment_request ADD COLUMN shift_id UUID;
ALTER TABLE attendance_adjustment_request ADD COLUMN created_at TIMESTAMPTZ;
ALTER TABLE attendance_adjustment_request ADD COLUMN approved_at TIMESTAMPTZ;

-- 4. Add constraints
ALTER TABLE attendance_adjustment_request ADD CONSTRAINT fk_attendance_adjustment_request_shift FOREIGN KEY (shift_id) REFERENCES shift (id);
