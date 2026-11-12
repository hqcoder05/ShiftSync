CREATE FUNCTION shiftsync_record_requirement_zones() RETURNS trigger AS $$
DECLARE target_shift UUID; old_zone UUID; target_requirement UUID; current_shift shift%ROWTYPE; old_zones JSONB; new_zones JSONB; base JSONB; actor_text TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.zone_id IS NOT DISTINCT FROM NEW.zone_id THEN RETURN NULL; END IF;
    target_shift := CASE WHEN TG_OP = 'DELETE' THEN OLD.shift_id ELSE NEW.shift_id END;
    IF TG_OP <> 'INSERT' THEN old_zone := OLD.zone_id; END IF;
    target_requirement := CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
    SELECT * INTO current_shift FROM shift WHERE id=target_shift;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT COALESCE(jsonb_agg(name ORDER BY name),'[]'::jsonb) INTO new_zones FROM (
        SELECT DISTINCT z.name FROM shift_skill_requirement r JOIN store_zones z ON z.id=r.zone_id WHERE r.shift_id=target_shift
    ) zones;
    SELECT COALESCE(jsonb_agg(name ORDER BY name),'[]'::jsonb) INTO old_zones FROM (
        SELECT DISTINCT z.name FROM shift_skill_requirement r JOIN store_zones z ON z.id=r.zone_id
            WHERE r.shift_id=target_shift AND r.id <> target_requirement
        UNION
        SELECT z.name FROM store_zones z WHERE z.id=old_zone
    ) zones;
    IF old_zones IS DISTINCT FROM new_zones THEN
        base := jsonb_build_object('shiftDate',current_shift.shift_date,'startTime',current_shift.start_time,'endTime',current_shift.end_time,'status',current_shift.status);
        actor_text := NULLIF(current_setting('shiftsync.actor_id',true),'');
        INSERT INTO schedule_history(store_id,shift_id,before_snapshot,after_snapshot,actor_id)
        VALUES(current_shift.store_id,target_shift,base || jsonb_build_object('zones',old_zones),base || jsonb_build_object('zones',new_zones),actor_text::UUID);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER requirement_zone_history_trigger AFTER INSERT OR UPDATE OR DELETE ON shift_skill_requirement FOR EACH ROW EXECUTE FUNCTION shiftsync_record_requirement_zones();
