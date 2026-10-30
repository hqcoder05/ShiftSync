package com.shiftsync.attendance.dto;

import com.shiftsync.attendance.enums.AdjustmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class AdjustmentResponseDTO {
    private UUID id;
    private UUID attendanceId;
    private UUID staffId;
    private String staffName;
    private UUID shiftId;
    private LocalDate shiftDate;
    private LocalTime shiftStartTime;
    private LocalTime shiftEndTime;
    private OffsetDateTime requestedCheckIn;
    private OffsetDateTime requestedCheckOut;
    private String reason;
    private String note;
    private AdjustmentStatus status;
    private OffsetDateTime createdAt;
    private UUID approvedBy;
    private String approvedByName;
    private OffsetDateTime approvedAt;
}
