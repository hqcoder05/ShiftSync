package com.shiftsync.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftZoneSwapRequest {

    @NotNull(message = "Staff A ID is required")
    private UUID staffAId;

    @NotNull(message = "Staff B ID is required")
    private UUID staffBId;

    /**
     * Optional explicit target zone for Staff A.
     * If not provided, defaults to the current zone of Staff B (or zoneBId).
     */
    private UUID targetZoneForAId;

    /**
     * Optional explicit target zone for Staff B.
     * If not provided, defaults to the current zone of Staff A (or zoneAId).
     */
    private UUID targetZoneForBId;

    /**
     * Compatibility fields matching frontend simulation diff structure:
     * zoneAId = original zone of Staff A (target for Staff B)
     * zoneBId = original zone of Staff B (target for Staff A)
     */
    private UUID zoneAId;
    private UUID zoneBId;
}
