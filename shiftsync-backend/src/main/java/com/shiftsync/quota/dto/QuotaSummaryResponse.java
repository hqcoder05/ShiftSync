package com.shiftsync.quota.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuotaSummaryResponse {
    private UUID branchId;
    private int totalHours;
    private int totalQuotas;
    private long estimatedCost;
    private String formattedEstimatedCost;
    private double slaComplianceRate;
    private long monthlyQuotaBudget;
    private long monthlyUsedBudget;
    private double monthlyUsedPercentage;
    private String budgetStatusText;
}
