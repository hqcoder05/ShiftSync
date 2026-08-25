-- Add shift_reminder_hours to store_configuration
ALTER TABLE store_configuration ADD COLUMN shift_reminder_hours INT NOT NULL DEFAULT 2;

ALTER TABLE notification_preference ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE notification_preference ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
