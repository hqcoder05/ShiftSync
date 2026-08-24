-- Update leave_request from V1
ALTER TABLE leave_request ADD COLUMN store_id UUID REFERENCES store(id);
-- Update existing records if necessary, but table is likely empty
-- Add created_at and approved_at
ALTER TABLE leave_request ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE leave_request ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Add leave_request_id to blackout_date
ALTER TABLE blackout_date ADD COLUMN leave_request_id UUID REFERENCES leave_request(id);

-- Update leave_type_enum to support EMERGENCY if not already
ALTER TYPE leave_type_enum ADD VALUE IF NOT EXISTS 'EMERGENCY';

-- Fix column mapping for Java Enums. By default Hibernate might try to map LeaveType and LeaveStatus as varchar.
-- Wait, in V1, they are defined as ENUMs.
-- Let's define the Casts so Hibernate can read/write them as varchar natively without complaining.
CREATE CAST (varchar AS leave_type_enum) WITH INOUT AS IMPLICIT;
CREATE CAST (leave_type_enum AS varchar) WITH INOUT AS IMPLICIT;

CREATE CAST (varchar AS approval_status_enum) WITH INOUT AS IMPLICIT;
CREATE CAST (approval_status_enum AS varchar) WITH INOUT AS IMPLICIT;
