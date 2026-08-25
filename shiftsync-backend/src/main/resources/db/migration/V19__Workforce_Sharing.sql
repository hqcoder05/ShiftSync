CREATE TYPE workforce_request_status_enum AS ENUM (
    'PENDING', 
    'MANAGER_REJECTED', 
    'PROPOSAL_SENT', 
    'COMPLETED', 
    'CANCELLED'
);

CREATE TYPE workforce_proposal_status_enum AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED'
);

CREATE TABLE workforce_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requesting_store_id UUID NOT NULL REFERENCES store(id),
    target_store_id UUID NOT NULL REFERENCES store(id),
    shift_id UUID NOT NULL REFERENCES shift(id),
    status workforce_request_status_enum NOT NULL DEFAULT 'PENDING',
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_stores CHECK (requesting_store_id != target_store_id)
);

CREATE TABLE workforce_proposal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workforce_request_id UUID NOT NULL REFERENCES workforce_request(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    status workforce_proposal_status_enum NOT NULL DEFAULT 'PENDING',
    proposed_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);
