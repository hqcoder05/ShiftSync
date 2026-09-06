package com.shiftsync.attendance.dto;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class AttendanceUpdateRequest {
    private OffsetDateTime checkInTime;
    private OffsetDateTime checkOutTime;
}
