package com.shiftsync.shift.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

/** Outcome of publishing a store schedule for a date range. */
@Value
@Builder
public class ShiftPublishResultDTO {
    LocalDate startDate;
    LocalDate endDate;
    int totalShifts;
    int publishedCount;
    int alreadyPublishedCount;
    int notifiedStaffCount;
}
