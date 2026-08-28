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
    private UUID shiftId;
    private UUID storeId;
    private String storeName;
    private String staffId;
    private String staffName;
    private java.time.LocalDate shiftDate;
    private java.time.LocalTime scheduledStart;
    private java.time.LocalTime scheduledEnd;
    private Double checkInLat;
    private Double checkInLng;
    private Double checkOutLat;
    private Double checkOutLng;
    private String checkInPhotoBase64;
    private String checkOutPhotoBase64;
}
