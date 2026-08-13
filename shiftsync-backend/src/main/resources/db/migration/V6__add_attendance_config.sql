ALTER TABLE store_configuration ADD COLUMN allowed_check_in_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE store_configuration ADD COLUMN allowed_check_out_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE store_configuration ADD COLUMN late_grace_minutes INTEGER NOT NULL DEFAULT 5;
ALTER TABLE store_configuration ADD COLUMN early_leave_grace_minutes INTEGER NOT NULL DEFAULT 5;
