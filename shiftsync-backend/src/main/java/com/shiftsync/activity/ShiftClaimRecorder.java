package com.shiftsync.activity;

import com.shiftsync.shift.entity.ShiftAssignment;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Stored in the claim transaction so a later swap cannot rewrite the original activity. */
@Service @RequiredArgsConstructor
public class ShiftClaimRecorder {
    private final JdbcTemplate jdbc;
    public void record(ShiftAssignment assignment) {
        var shift = assignment.getShift();
        jdbc.update("""
                INSERT INTO activity_shift_claim(assignment_id,staff_id,store_id,shift_id,occurred_at,shift_date,start_time,end_time)
                VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(assignment_id) DO NOTHING
                """, assignment.getId(), assignment.getStaff().getId(), shift.getStore().getId(), shift.getId(),
                assignment.getAssignedAt(), shift.getShiftDate(), shift.getStartTime(), shift.getEndTime());
    }
}
