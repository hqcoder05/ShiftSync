-- ==========================================================
-- Migration V10: Create staff_requests table for Requests & Shift Marketplace
-- ==========================================================

CREATE TABLE IF NOT EXISTS staff_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_name VARCHAR(100) NOT NULL,
    avatar_key VARCHAR(50) DEFAULT 'paul',
    request_type VARCHAR(100) NOT NULL,
    type_category VARCHAR(50) NOT NULL DEFAULT 'support',
    status VARCHAR(50) NOT NULL DEFAULT 'Đang chờ phê duyệt',
    recipient VARCHAR(255),
    start_date DATE,
    end_date DATE,
    shift_info VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient search and filtering
CREATE INDEX IF NOT EXISTS idx_staff_requests_status ON staff_requests(status);
CREATE INDEX IF NOT EXISTS idx_staff_requests_type_category ON staff_requests(type_category);
CREATE INDEX IF NOT EXISTS idx_staff_requests_created_at ON staff_requests(created_at DESC);
