-- Save the zones as they were at the time of a shift change. Existing snapshots
-- without zones must remain unknown: today's zones cannot reconstruct history.
CREATE OR REPLACE FUNCTION shiftsync_record_shift_history() RETURNS trigger AS $$
DECLARE before_data JSONB; after_data JSONB; target_store UUID; target_shift UUID; actor_text TEXT; zones JSONB;
BEGIN
    target_shift := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
    SELECT COALESCE(jsonb_agg(name ORDER BY name), '[]'::jsonb) INTO zones FROM (
        SELECT DISTINCT z.name FROM shift_skill_requirement r
        JOIN store_zones z ON z.id = r.zone_id WHERE r.shift_id = target_shift
    ) current_zones;
    IF TG_OP <> 'INSERT' THEN
        before_data := jsonb_build_object('shiftDate', OLD.shift_date, 'startTime', OLD.start_time,
            'endTime', OLD.end_time, 'status', OLD.status, 'zones', zones);
        target_store := OLD.store_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        after_data := jsonb_build_object('shiftDate', NEW.shift_date, 'startTime', NEW.start_time,
            'endTime', NEW.end_time, 'status', NEW.status, 'zones', zones);
        target_store := NEW.store_id;
    END IF;
    IF before_data IS DISTINCT FROM after_data THEN
        actor_text := NULLIF(current_setting('shiftsync.actor_id', true), '');
        INSERT INTO schedule_history(store_id, shift_id, before_snapshot, after_snapshot, actor_id)
        VALUES(target_store, target_shift, before_data, after_data, actor_text::UUID);
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Capture before dependent requirements are removed by cascading deletes.
DROP TRIGGER shift_history_trigger ON shift;
CREATE TRIGGER shift_history_trigger AFTER INSERT OR UPDATE ON shift
    FOR EACH ROW EXECUTE FUNCTION shiftsync_record_shift_history();
CREATE TRIGGER shift_history_delete_trigger BEFORE DELETE ON shift
    FOR EACH ROW EXECUTE FUNCTION shiftsync_record_shift_history();
