-- V7__Add_Performance_Indexes.sql

-- Index for Shift by Store and Date (very common query)
CREATE INDEX IF NOT EXISTS idx_shift_store_date ON shift(store_id, shift_date);

-- Index for ShiftAssignment by staff (for payroll and auto-schedule)
CREATE INDEX IF NOT EXISTS idx_shift_assignment_staff ON shift_assignment(staff_id);

-- Index for Attendance by shift_assignment
CREATE INDEX IF NOT EXISTS idx_attendance_shift_assignment ON attendance(shift_assignment_id);

-- Index for Availability by user
CREATE INDEX IF NOT EXISTS idx_availability_user ON availability(staff_id);

-- Index for BlackoutDate by staff and date
CREATE INDEX IF NOT EXISTS idx_blackout_date_staff_date ON blackout_date(staff_id, date);
