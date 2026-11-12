CREATE TABLE schedule_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES store(id),
    shift_id UUID NOT NULL,
    before_snapshot JSONB,
    after_snapshot JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_schedule_history_store ON schedule_history(store_id,changed_at DESC);

CREATE FUNCTION shiftsync_record_shift_history() RETURNS trigger AS $$
DECLARE before_data JSONB; after_data JSONB; target_store UUID; target_shift UUID;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        before_data := jsonb_build_object('shiftDate',OLD.shift_date,'startTime',OLD.start_time,'endTime',OLD.end_time,'status',OLD.status);
        target_store := OLD.store_id; target_shift := OLD.id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        after_data := jsonb_build_object('shiftDate',NEW.shift_date,'startTime',NEW.start_time,'endTime',NEW.end_time,'status',NEW.status);
        target_store := NEW.store_id; target_shift := NEW.id;
    END IF;
    IF before_data IS DISTINCT FROM after_data THEN
        INSERT INTO schedule_history(store_id,shift_id,before_snapshot,after_snapshot) VALUES(target_store,target_shift,before_data,after_data);
    END IF;
    RETURN COALESCE(NEW,OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER shift_history_trigger AFTER INSERT OR UPDATE OR DELETE ON shift FOR EACH ROW EXECUTE FUNCTION shiftsync_record_shift_history();
