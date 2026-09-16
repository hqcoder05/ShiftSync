package com.shiftsync.quota.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplySchedulerRequest {
    private UUID branchId;
    private String scope; // "DAY" or "WEEK"
    private LocalDate date;
    private LocalDate weekStart;
}
