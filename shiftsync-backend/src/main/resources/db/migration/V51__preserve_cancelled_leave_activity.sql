-- A source leave row is hard deleted by cancellation. Preserve its known original
-- action times and the new cancellation event atomically with that deletion.
-- No older cancellations or unknown timestamps are reconstructed.
CREATE TABLE activity_preserved_event (
    event_id TEXT PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staff(id),
    store_id UUID NOT NULL REFERENCES store(id),
    entity_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL
);
CREATE INDEX idx_activity_preserved_owner_time ON activity_preserved_event(staff_id,store_id,occurred_at DESC,event_id DESC);
