-- Drop the old ShiftRegistration table (no other tables depend on it)
DROP TABLE IF EXISTS shift_registration;

-- Rename registration_deadline to availability_deadline in shift table
ALTER TABLE shift RENAME COLUMN registration_deadline TO availability_deadline;

-- Rename registration_deadline_hours to availability_deadline_hours in store_configuration table
ALTER TABLE store_configuration RENAME COLUMN registration_deadline_hours TO availability_deadline_hours;
