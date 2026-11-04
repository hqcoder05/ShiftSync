CREATE TABLE leave_removed_assignment (
    leave_request_id uuid NOT NULL REFERENCES leave_request(id) ON DELETE CASCADE,
    assignment_id uuid NOT NULL REFERENCES shift_assignment(id) ON DELETE CASCADE,
    PRIMARY KEY (leave_request_id, assignment_id)
);
