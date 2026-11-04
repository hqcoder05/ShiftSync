-- A dated employment revision must keep its referenced contract alive, even
-- when the current employment has since moved to another contract.
ALTER TABLE payroll_effective_revision ADD COLUMN employment_contract_id UUID
    GENERATED ALWAYS AS (CASE WHEN entity_type='employment'
        THEN (values_json->>'contractTypeId')::uuid ELSE NULL END) STORED;
ALTER TABLE payroll_effective_revision ADD CONSTRAINT fk_revision_employment_contract
    FOREIGN KEY (employment_contract_id) REFERENCES contract_type(id) ON DELETE RESTRICT;
CREATE INDEX idx_revision_employment_contract ON payroll_effective_revision(employment_contract_id)
    WHERE employment_contract_id IS NOT NULL;
