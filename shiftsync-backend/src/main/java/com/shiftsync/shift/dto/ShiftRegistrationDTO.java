package com.shiftsync.shift.dto;

import com.shiftsync.shared.enums.ApprovalStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ShiftRegistrationDTO {
    @Schema(description = "Registration ID")
    private UUID id;

    @Schema(description = "Shift ID")
    private UUID shiftId;

    @Schema(description = "Staff ID")
    private UUID staffId;
    
    @Schema(description = "Staff Name")
    private String staffName;

    @Schema(description = "Status")
    private ApprovalStatus status;

    @Schema(description = "Registration Time")
    private OffsetDateTime registeredAt;
}
