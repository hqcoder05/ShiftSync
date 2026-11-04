-- Each reviewed legacy change is linked to exactly one dated revision.
CREATE TABLE payroll_untracked_reconciliation (
    history_id BIGINT PRIMARY KEY REFERENCES payroll_input_history(id) ON DELETE RESTRICT,
    revision_id UUID NOT NULL UNIQUE REFERENCES payroll_effective_revision(id) ON DELETE RESTRICT
);
