package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeasibilityDiagnosticsDTO {

    @Schema(description = "Total active staff in store")
    private int totalActiveStaff;

    @Schema(description = "Theoretical capacity in hours based on contracts (sum of maxWeeklyHours)")
    private double theoreticalCapacityHours;

    @Schema(description = "Total demanded hours across all draft shifts in the scheduling window")
    private double totalDemandHours;

    @Schema(description = "Whether theoretical capacity meets or exceeds demanded hours")
    private boolean theoreticalCapacitySufficient;

    @Schema(description = "Total unassigned slots before local repair")
    private int unassignedSlotsBeforeRepair;

    @Schema(description = "Number of slots rescued by local repair")
    private int localRepairRescuedCount;

    @Schema(description = "Number of slots that remained unassigned after local repair")
    private int finalUnassignedCount;
}
