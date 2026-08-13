package com.shiftsync.availability.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class AvailabilityResponse {
    private UUID id;
    private UUID staffId;
    private Short dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
}
