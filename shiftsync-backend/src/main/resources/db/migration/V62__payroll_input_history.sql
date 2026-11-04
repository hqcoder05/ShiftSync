-- Preserve payroll inputs before mutable records are changed. Baselines describe
-- migration-time values only; they do not assert what was paid in earlier years.
CREATE TABLE payroll_input_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN ('employment', 'contract_type', 'skill')),
    entity_id UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    operation VARCHAR(8) NOT NULL CHECK (operation IN ('BASELINE', 'INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    transaction_id BIGINT NOT NULL DEFAULT txid_current()
);
CREATE INDEX idx_payroll_input_history_entity ON payroll_input_history(entity_type, entity_id, id);

INSERT INTO payroll_input_history(entity_type, entity_id, operation, new_values)
SELECT 'employment', id, 'BASELINE', to_jsonb(e) FROM employment e;
INSERT INTO payroll_input_history(entity_type, entity_id, operation, new_values)
SELECT 'contract_type', id, 'BASELINE', to_jsonb(c) FROM contract_type c;
INSERT INTO payroll_input_history(entity_type, entity_id, operation, new_values)
SELECT 'skill', id, 'BASELINE', to_jsonb(s) FROM skill s;

CREATE FUNCTION record_payroll_input_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN
        RETURN NEW;
    END IF;
    INSERT INTO payroll_input_history(entity_type, entity_id, operation, old_values, new_values)
    VALUES (TG_TABLE_NAME, CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
            TG_OP, CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
            CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER employment_payroll_history AFTER INSERT OR UPDATE OR DELETE ON employment
FOR EACH ROW EXECUTE FUNCTION record_payroll_input_history();
CREATE TRIGGER contract_type_payroll_history AFTER INSERT OR UPDATE OR DELETE ON contract_type
FOR EACH ROW EXECUTE FUNCTION record_payroll_input_history();
CREATE TRIGGER skill_payroll_history AFTER INSERT OR UPDATE OR DELETE ON skill
FOR EACH ROW EXECUTE FUNCTION record_payroll_input_history();
