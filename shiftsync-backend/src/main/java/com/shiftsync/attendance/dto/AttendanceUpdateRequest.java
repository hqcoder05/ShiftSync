package com.shiftsync.attendance.dto;

import com.shiftsync.attendance.enums.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceUpdateRequest {
    private OffsetDateTime checkInTime;
    private OffsetDateTime checkOutTime;
    private AttendanceStatus status;
    private String checkInTimeString;
    private String checkOutTimeString;
}
