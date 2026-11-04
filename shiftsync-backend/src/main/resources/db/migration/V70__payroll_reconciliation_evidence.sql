-- Evidence is recorded alongside a historical revision in the same transaction.
CREATE TABLE payroll_reconciliation_evidence (
    revision_id UUID PRIMARY KEY REFERENCES payroll_effective_revision(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES staff(id),
    evidence TEXT NOT NULL CHECK (length(trim(evidence)) BETWEEN 10 AND 2000),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
