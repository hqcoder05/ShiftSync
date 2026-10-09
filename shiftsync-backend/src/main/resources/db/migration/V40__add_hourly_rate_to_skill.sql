-- V40__add_hourly_rate_to_skill.sql
-- Add hourly_rate to skill table to allow dynamic position-based pay rate configuration per store

ALTER TABLE skill ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12, 2) NOT NULL DEFAULT 23000.00;

-- Migrate existing hardcoded defaults based on current position names
UPDATE skill SET hourly_rate = 30000.00 WHERE LOWER(name) LIKE '%bếp%' OR LOWER(name) LIKE '%kitchen%';
UPDATE skill SET hourly_rate = 28000.00 WHERE LOWER(name) LIKE '%barista%' OR LOWER(name) LIKE '%pha chế%';
UPDATE skill SET hourly_rate = 26000.00 WHERE LOWER(name) LIKE '%thu ngân%' OR LOWER(name) LIKE '%cashier%';
UPDATE skill SET hourly_rate = 25000.00 WHERE LOWER(name) LIKE '%waiter%' OR LOWER(name) LIKE '%phục vụ%' OR LOWER(name) LIKE '%sảnh%' OR LOWER(name) LIKE '%bàn%';
