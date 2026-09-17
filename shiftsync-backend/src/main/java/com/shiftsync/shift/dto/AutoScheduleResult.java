package com.shiftsync.shift.dto;

import com.shiftsync.shift.enums.ScheduleCoverageStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutoScheduleResult {

    @Schema(description = "Store ID")
    private UUID storeId;

    @Schema(description = "Scheduling window start date")
    private LocalDate startDate;

    @Schema(description = "Scheduling window end date")
    private LocalDate endDate;

    @Schema(description = "High-level schedule coverage status")
    private ScheduleCoverageStatus status;

    @Schema(description = "User-facing summary message reflecting schedule quality and shortage")
    private String message;

    @Schema(description = "Total demanded slots across all draft shifts")
    private int totalDemandSlots;

    @Schema(description = "Number of slots pre-filled by manual assignments")
    private int existingManualAssignments;

    @Schema(description = "Net slots demanded from the scheduler (totalDemandSlots - existingManualAssignments)")
    private int schedulerDemandSlots;

    @Schema(description = "Number of new auto assignments created in this run")
    private int newAssignmentsCreated;

    @Schema(description = "Total assigned slots (existingManualAssignments + newAssignmentsCreated)")
    private int totalAssignedSlots;

    @Schema(description = "Total shortage slots (Math.max(0, totalDemandSlots - totalAssignedSlots))")
    private int shortageSlots;

    @Schema(description = "Overall schedule coverage percentage (0.0 to 100.0)")
    private double coverageRate;

    @Schema(description = "Detailed list of unmet shortages with spatial and skill traceability")
    @Builder.Default
    private List<ShortageDetailDTO> shortages = new ArrayList<>();

    @Schema(description = "Coverage details broken down by each shift skill requirement")
    @Builder.Default
    private List<RequirementCoverageDTO> requirementCoverages = new ArrayList<>();

    @Schema(description = "Feasibility diagnostics comparing staff capacity with shift demand")
    private FeasibilityDiagnosticsDTO feasibility;
}
