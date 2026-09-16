-- V33: Allow required_count to be 0 for demand planning and quota setting
ALTER TABLE shift_skill_requirement DROP CONSTRAINT IF EXISTS shift_skill_requirement_required_count_check;
ALTER TABLE shift_skill_requirement ADD CONSTRAINT shift_skill_requirement_required_count_check CHECK (required_count >= 0);
