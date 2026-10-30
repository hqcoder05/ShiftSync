-- A pending swap cannot be actioned after either shift has started.
-- Keep it in the audit trail instead of leaving an actionable PENDING request.
ALTER TYPE swap_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
