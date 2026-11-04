-- Scheduled compensation changes are separate from the audit trail: recording
-- time and the date a change takes effect are different concepts.
CREATE TABLE payroll_effective_revision (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN ('employment', 'contract_type', 'skill')),
    entity_id UUID NOT NULL,
    effective_date DATE NOT NULL,
    values_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID REFERENCES staff(id),
    UNIQUE (entity_type, entity_id, effective_date)
);
CREATE INDEX idx_payroll_effective_revision_lookup
    ON payroll_effective_revision(entity_type, entity_id, effective_date DESC);
