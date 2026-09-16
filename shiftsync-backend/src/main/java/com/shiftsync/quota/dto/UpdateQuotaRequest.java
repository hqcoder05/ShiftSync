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
public class UpdateQuotaRequest {
    private UUID branchId;
    private LocalDate date;
    private String shiftType; // "morning" or "afternoon" or specific shift ID
    private UUID positionId;
    private Integer count;
    private Integer min;
    private Integer target;
    private Integer max;
}
