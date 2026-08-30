package com.shiftsync.shift.dto;

import com.shiftsync.shift.enums.AssignmentSource;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ShiftAssignmentResponseDTO {
    private UUID id;
    private UUID shiftId;
    private UUID staffId;
    private String staffName;
    private AssignmentSource source;
    private OffsetDateTime assignedAt;
}
