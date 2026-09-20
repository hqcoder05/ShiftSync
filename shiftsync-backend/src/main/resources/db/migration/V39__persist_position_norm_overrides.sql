CREATE TABLE position_norm_override (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id),
    skill_id UUID NOT NULL REFERENCES skill(id),
    min_count INTEGER NOT NULL CHECK (min_count >= 0),
    target_count INTEGER NOT NULL CHECK (target_count >= 0),
    max_count INTEGER NOT NULL CHECK (max_count >= 0),
    CONSTRAINT uk_position_norm_override_store_skill UNIQUE (store_id, skill_id)
);
