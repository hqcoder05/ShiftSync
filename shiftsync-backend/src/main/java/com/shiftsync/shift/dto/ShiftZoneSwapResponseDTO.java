package com.shiftsync.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftZoneSwapResponseDTO {
    private ShiftAssignmentResponseDTO assignmentA;
    private ShiftAssignmentResponseDTO assignmentB;
}
