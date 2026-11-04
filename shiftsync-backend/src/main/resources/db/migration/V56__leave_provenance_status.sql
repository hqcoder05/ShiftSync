ALTER TABLE leave_request ADD COLUMN assignment_provenance_complete boolean NOT NULL DEFAULT false;
UPDATE leave_request l SET assignment_provenance_complete = true
WHERE EXISTS (SELECT 1 FROM leave_removed_assignment r WHERE r.leave_request_id = l.id);
