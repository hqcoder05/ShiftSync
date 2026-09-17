-- V35: Add avatar_id column to staff table for persistent 3D Avatar identity
ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(50);
