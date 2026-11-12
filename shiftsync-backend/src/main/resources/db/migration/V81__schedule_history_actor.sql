ALTER TABLE schedule_history ADD COLUMN actor_id UUID REFERENCES staff(id);
ALTER TABLE schedule_history ADD COLUMN reason VARCHAR(500);

CREATE OR REPLACE FUNCTION shiftsync_record_shift_history() RETURNS trigger AS $$
DECLARE before_data JSONB; after_data JSONB; target_store UUID; target_shift UUID; actor_text TEXT;
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
        actor_text := NULLIF(current_setting('shiftsync.actor_id',true),'');
        INSERT INTO schedule_history(store_id,shift_id,before_snapshot,after_snapshot,actor_id)
        VALUES(target_store,target_shift,before_data,after_data,actor_text::UUID);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
