CREATE TABLE auto_schedule_plan (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    input_version VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    applied_at TIMESTAMPTZ,
    applied_payload JSONB
);
CREATE INDEX idx_auto_schedule_plan_owner_expiry ON auto_schedule_plan(actor_id, expires_at);
