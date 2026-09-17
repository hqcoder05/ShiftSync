-- V34: Enforce unique scheduling identity for shifts to prevent duplicate shift creation
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_unique_identity ON shift (store_id, shift_date, start_time, end_time);
