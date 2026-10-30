-- Workforce requests stop being actionable when their requested shift starts.
ALTER TYPE workforce_request_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
