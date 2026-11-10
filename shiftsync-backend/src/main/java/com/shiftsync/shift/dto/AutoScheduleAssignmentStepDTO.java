package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * One assignment in the exact order it was accepted by the scheduler.
 * This lets clients replay the scheduler's decisions instead of inventing a
 * chronological display order after the fact.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutoScheduleAssignmentStepDTO {
    @Schema(description = "Zero-based order in which the scheduler accepted this assignment")
    private int sequence;
    private UUID shiftId;
    private UUID staffId;
    private UUID zoneId;
    private UUID workstationId;
    private UUID requiredSkillId;
}
