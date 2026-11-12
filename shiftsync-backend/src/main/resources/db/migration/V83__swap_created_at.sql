-- Older requests have no trustworthy creation time; leave those timestamps null.
ALTER TABLE shift_swap_request ADD COLUMN created_at TIMESTAMPTZ;
ALTER TABLE shift_swap_request ALTER COLUMN created_at SET DEFAULT now();
