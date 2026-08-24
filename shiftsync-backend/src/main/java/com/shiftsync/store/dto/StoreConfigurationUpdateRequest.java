package com.shiftsync.store.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalTime;

@Data
public class StoreConfigurationUpdateRequest {
    
    @NotNull(message = "openTime is required")
    private LocalTime openTime;
    
    @NotNull(message = "closeTime is required")
    private LocalTime closeTime;

    @NotNull
    @Min(0)
    private Integer maxHourPerWeek;

    @NotNull
    @Min(0)
    private Integer minRestHours;

    @NotNull
    @Min(0)
    private Integer geofenceRadiusM;

    @NotNull
    @Min(0)
    private Integer availabilityDeadlineHours;

    @NotNull
    @Min(0)
    private Integer allowedCheckInMinutes;

    @NotNull
    @Min(0)
    private Integer allowedCheckOutMinutes;

    @NotNull
    @Min(0)
    private Integer lateGraceMinutes;

    @NotNull
    @Min(0)
    private Integer earlyLeaveGraceMinutes;
}
