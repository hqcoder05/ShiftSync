ALTER TABLE store ADD COLUMN monthly_quota_budget BIGINT;
ALTER TABLE store ADD CONSTRAINT store_monthly_quota_budget_positive
    CHECK (monthly_quota_budget IS NULL OR monthly_quota_budget > 0);
