package com.shiftsync.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBalanceDTO {
    private UUID id;
    private UUID staffId;
    private String staffName;
    private UUID storeId;
    private String storeName;
    private int year;
    private int annualEntitlement;
    private int carryOverDays;
    private int usedDays;
    private int pendingDays;
    private int remainingDays;
    private OffsetDateTime updatedAt;
}
