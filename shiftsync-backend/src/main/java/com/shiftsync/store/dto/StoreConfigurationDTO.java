package com.shiftsync.store.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class StoreConfigurationDTO {
    @Schema(description = "Store Configuration ID")
    private UUID id;
    
    @Schema(description = "Store ID")
    private UUID storeId;
    
    @Schema(description = "Store Open Time")
    private LocalTime openTime;
    
    @Schema(description = "Store Close Time")
    private LocalTime closeTime;

    @Schema(description = "Max hours per week for a staff")
    private Integer maxHourPerWeek;

    @Schema(description = "Min rest hours between shifts")
    private Integer minRestHours;

    @Schema(description = "Geofence radius in meters")
    private Integer geofenceRadiusM;

    @Schema(description = "Deadline to submit availability before shift (hours)")
    private Integer availabilityDeadlineHours;

    @Schema(description = "Allowed check-in minutes before shift")
    private Integer allowedCheckInMinutes;

    @Schema(description = "Allowed check-out minutes after shift")
    private Integer allowedCheckOutMinutes;

    @Schema(description = "Late grace period in minutes")
    private Integer lateGraceMinutes;

    @Schema(description = "Early leave grace period in minutes")
    private Integer earlyLeaveGraceMinutes;
}
