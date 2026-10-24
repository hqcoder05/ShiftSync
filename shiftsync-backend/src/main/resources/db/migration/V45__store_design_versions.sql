CREATE TABLE store_design_versions (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL CHECK (revision > 0),
    document TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, revision)
);
