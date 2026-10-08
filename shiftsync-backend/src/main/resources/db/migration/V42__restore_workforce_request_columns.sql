ALTER TABLE workforce_request ADD COLUMN skill_id UUID REFERENCES skill(id);
ALTER TABLE workforce_request ADD COLUMN needed_count INT DEFAULT 1 CHECK (needed_count > 0);