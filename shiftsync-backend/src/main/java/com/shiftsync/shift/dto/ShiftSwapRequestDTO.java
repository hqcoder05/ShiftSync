package com.shiftsync.shift.dto;

import com.shiftsync.shift.enums.SwapStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class ShiftSwapRequestDTO {
    private UUID id;
    private UUID fromStaffId;
    private String fromStaffName;
    private UUID fromShiftId;
    private LocalDate fromShiftDate;
    private LocalTime fromShiftStartTime;
    private LocalTime fromShiftEndTime;
    private UUID toStaffId;
    private String toStaffName;
    private UUID toShiftId;
    private LocalDate toShiftDate;
    private LocalTime toShiftStartTime;
    private LocalTime toShiftEndTime;
    private SwapStatus status;
    private UUID approvedById;
    private boolean employeeAccepted;
}

