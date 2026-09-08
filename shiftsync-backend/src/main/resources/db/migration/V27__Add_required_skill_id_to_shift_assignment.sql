-- Migration V27: Them cot required_skill_id vao shift_assignment de luu vet ky nang yeu cau goc
-- Phuc vu cho tinh nang Local Repair (HC1 Skill Match) va kiem toan phan cong ca

ALTER TABLE shift_assignment
    ADD COLUMN IF NOT EXISTS required_skill_id UUID REFERENCES skill(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shift_assignment_required_skill
    ON shift_assignment(required_skill_id);