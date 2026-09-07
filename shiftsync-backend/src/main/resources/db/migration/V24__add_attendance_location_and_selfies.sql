ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS check_in_photo BYTEA,
    ADD COLUMN IF NOT EXISTS check_out_photo BYTEA;
