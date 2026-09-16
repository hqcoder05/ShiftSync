package com.shiftsync.shift.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BulkDemandPlanningResponse {
    @Schema(description = "Total shifts created")
    private int createdShifts;

    @Schema(description = "Total shifts updated")
    private int updatedShifts;

    @Schema(description = "Total requirements saved")
    private int totalRequirements;

    @Schema(description = "Status message")
    private String message;
}