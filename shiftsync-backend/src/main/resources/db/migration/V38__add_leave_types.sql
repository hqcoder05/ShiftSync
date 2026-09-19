-- Update leave_type_enum to support PERSONAL and OTHER
ALTER TYPE leave_type_enum ADD VALUE IF NOT EXISTS 'PERSONAL';
ALTER TYPE leave_type_enum ADD VALUE IF NOT EXISTS 'OTHER';
