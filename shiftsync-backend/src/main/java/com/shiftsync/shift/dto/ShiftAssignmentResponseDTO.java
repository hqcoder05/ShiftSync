package com.shiftsync.shift.dto;

import com.shiftsync.shift.enums.AssignmentSource;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
public class ShiftAssignmentResponseDTO {
    private UUID id;
    private UUID shiftId;
    private UUID staffId;
    private String staffName;
    private String gender;
    private String avatarUrl;
    private String avatarId;
    private UUID requiredSkillId;
    private String skillName;
    private UUID zoneId;
    private String zoneName;
    private UUID workstationId;
    private String workstationName;
    private AssignmentSource source;
    private OffsetDateTime assignedAt;
}
