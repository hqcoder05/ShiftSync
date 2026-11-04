CREATE FUNCTION protect_historical_contract() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM payroll_effective_revision r WHERE r.entity_type='employment'
                  AND r.values_json->>'contractTypeId'=OLD.id::text)
       OR EXISTS (SELECT 1 FROM payroll_input_history h WHERE h.entity_type='employment'
                  AND (h.old_values->>'contract_type_id'=OLD.id::text OR h.new_values->>'contract_type_id'=OLD.id::text)) THEN
        RAISE EXCEPTION 'Không thể xóa hợp đồng được tham chiếu trong lịch sử lương' USING ERRCODE='23503';
    END IF;
    RETURN OLD;
END $$;
CREATE TRIGGER protect_historical_contract_before_delete BEFORE DELETE ON contract_type
FOR EACH ROW EXECUTE FUNCTION protect_historical_contract();
