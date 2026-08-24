package com.shiftsync.shift.dto;

import com.shiftsync.shift.enums.SwapStatus;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class ShiftSwapRequestDTO {
    private UUID id;
    private UUID fromStaffId;
    private UUID fromShiftId;
    private UUID toStaffId;
    private UUID toShiftId;
    private SwapStatus status;
    private UUID approvedById;
    private boolean employeeAccepted;
}
