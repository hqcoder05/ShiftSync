BEGIN;
DELETE FROM attendance_adjustment_request WHERE shift_id IN (SELECT id FROM shift WHERE note = 'ATT_E2E OT preparation shift');
DELETE FROM attendance WHERE shift_assignment_id IN (SELECT id FROM shift_assignment WHERE shift_id IN (SELECT id FROM shift WHERE note = 'ATT_E2E OT preparation shift'));
DELETE FROM shift_assignment WHERE shift_id IN (SELECT id FROM shift WHERE note = 'ATT_E2E OT preparation shift');
DELETE FROM shift_skill_requirement WHERE shift_id IN (SELECT id FROM shift WHERE note = 'ATT_E2E OT preparation shift');
DELETE FROM shift WHERE note = 'ATT_E2E OT preparation shift';
DELETE FROM workstations WHERE id = 'a7100000-0000-0000-0000-000000008002';
DELETE FROM store_zones WHERE id = 'a7100000-0000-0000-0000-000000008001';
COMMIT;
