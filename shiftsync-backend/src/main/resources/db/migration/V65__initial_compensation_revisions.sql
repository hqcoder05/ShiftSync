-- New records receive a known starting state on their creation date. Backdated
-- employment start dates do not prove compensation before the record existed.
CREATE FUNCTION create_initial_compensation_revision() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    snapshot JSONB;
BEGIN
    CASE TG_TABLE_NAME
        WHEN 'employment' THEN
            snapshot := jsonb_build_object('contractTypeId', NEW.contract_type_id, 'hourlyRate', NEW.hourly_rate);
        WHEN 'contract_type' THEN
            snapshot := jsonb_build_object('defaultHourlyRate', NEW.default_hourly_rate,
                'maxWeeklyHours', NEW.max_weekly_hours, 'otMultiplier', NEW.ot_multiplier);
        WHEN 'skill' THEN
            snapshot := jsonb_build_object('hourlyRate', NEW.hourly_rate);
        ELSE
            RAISE EXCEPTION 'Loại dữ liệu lương không được hỗ trợ: %', TG_TABLE_NAME;
    END CASE;
    INSERT INTO payroll_effective_revision(id, entity_type, entity_id, effective_date, values_json)
    VALUES (gen_random_uuid(), TG_TABLE_NAME, NEW.id,
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, snapshot);
    RETURN NEW;
END $$;

CREATE TRIGGER employment_initial_compensation AFTER INSERT ON employment
FOR EACH ROW EXECUTE FUNCTION create_initial_compensation_revision();
CREATE TRIGGER contract_type_initial_compensation AFTER INSERT ON contract_type
FOR EACH ROW EXECUTE FUNCTION create_initial_compensation_revision();
CREATE TRIGGER skill_initial_compensation AFTER INSERT ON skill
FOR EACH ROW EXECUTE FUNCTION create_initial_compensation_revision();
