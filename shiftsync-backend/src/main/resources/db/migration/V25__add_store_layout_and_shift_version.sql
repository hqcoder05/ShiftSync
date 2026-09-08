-- Add version to shift for optimistic locking
ALTER TABLE shift ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Create store_layouts table for 3D store dimensions
CREATE TABLE IF NOT EXISTS store_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES store(id) ON DELETE CASCADE,
    length DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL
);

-- Create store_zones table for 3D spatial zones
CREATE TABLE IF NOT EXISTS store_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    x_coord DOUBLE PRECISION NOT NULL,
    y_coord DOUBLE PRECISION NOT NULL,
    z_coord DOUBLE PRECISION NOT NULL,
    capacity INT NOT NULL
);

-- Add zone_id to shift_assignment
ALTER TABLE shift_assignment ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES store_zones(id) ON DELETE SET NULL;
