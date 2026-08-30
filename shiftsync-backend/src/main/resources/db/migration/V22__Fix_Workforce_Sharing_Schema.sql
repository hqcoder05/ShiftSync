-- Drop old tables and enums
DROP TABLE IF EXISTS workforce_request_history CASCADE;
DROP TABLE IF EXISTS workforce_assignment CASCADE;
DROP TABLE IF EXISTS workforce_request CASCADE;
DROP TYPE IF EXISTS workforce_status_enum CASCADE;
DROP TYPE IF EXISTS workforce_assign_status_enum CASCADE;

-- Create new enums
CREATE TYPE workforce_request_status_enum AS ENUM ('PENDING', 'MANAGER_REJECTED', 'PROPOSAL_SENT', 'COMPLETED', 'CANCELLED');
CREATE TYPE workforce_proposal_status_enum AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- Create workforce_request table
CREATE TABLE workforce_request (
    id UUID PRIMARY KEY,
    requesting_store_id UUID NOT NULL REFERENCES store(id),
    target_store_id UUID NOT NULL REFERENCES store(id),
    shift_id UUID NOT NULL REFERENCES shift(id),
    status workforce_request_status_enum NOT NULL DEFAULT 'PENDING',
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_workforce_diff_store CHECK (requesting_store_id <> target_store_id)
);

-- Create workforce_proposal table
CREATE TABLE workforce_proposal (
    id UUID PRIMARY KEY,
    workforce_request_id UUID NOT NULL REFERENCES workforce_request(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    status workforce_proposal_status_enum NOT NULL DEFAULT 'PENDING',
    proposed_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ
);
