CREATE TABLE attendance_adjustment_request (
    id UUID PRIMARY KEY,
    attendance_id UUID,
    staff_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    requested_check_in TIMESTAMP WITH TIME ZONE,
    requested_check_out TIMESTAMP WITH TIME ZONE,
    reason VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_attendance_adjustment_request_attendance FOREIGN KEY (attendance_id) REFERENCES attendance (id),
    CONSTRAINT fk_attendance_adjustment_request_staff FOREIGN KEY (staff_id) REFERENCES staff (id),
    CONSTRAINT fk_attendance_adjustment_request_shift FOREIGN KEY (shift_id) REFERENCES shift (id),
    CONSTRAINT fk_attendance_adjustment_request_manager FOREIGN KEY (approved_by) REFERENCES staff (id)
);
