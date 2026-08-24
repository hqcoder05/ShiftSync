package com.shiftsync.attendance.dto;

import com.shiftsync.attendance.enums.AttendanceStatus;
import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class AttendanceDTO {
    private UUID id;
    private UUID shiftAssignmentId;
    private OffsetDateTime checkInTime;
    private OffsetDateTime checkOutTime;
    private AttendanceStatus status;
}
