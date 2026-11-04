-- Payroll history checks look up changes for one entity after its baseline.
-- Limit the index to updates: inserts and deletes are irrelevant to this check.
CREATE INDEX idx_payroll_input_history_updates
    ON payroll_input_history (entity_type, entity_id, recorded_at)
    WHERE operation = 'UPDATE';
