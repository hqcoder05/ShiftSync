-- V28: Replace strict UNIQUE constraint on (shift_id, staff_id) with partial unique index WHERE deleted = false
-- This allows soft-deleted records to not block subsequent auto-scheduling assignments.

ALTER TABLE shift_assignment DROP CONSTRAINT IF EXISTS shift_assignment_shift_id_staff_id_key;

DROP INDEX IF EXISTS idx_shift_assignment_shift_staff_active;
CREATE UNIQUE INDEX idx_shift_assignment_shift_staff_active 
ON shift_assignment (shift_id, staff_id) 
WHERE deleted = false;
