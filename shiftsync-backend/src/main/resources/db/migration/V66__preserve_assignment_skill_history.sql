-- Database enforcement closes the race between the service's reference check
-- and an assignment being inserted by another transaction.
ALTER TABLE shift_assignment DROP CONSTRAINT shift_assignment_required_skill_id_fkey;
ALTER TABLE shift_assignment ADD CONSTRAINT shift_assignment_required_skill_id_fkey
    FOREIGN KEY (required_skill_id) REFERENCES skill(id) ON DELETE RESTRICT;
