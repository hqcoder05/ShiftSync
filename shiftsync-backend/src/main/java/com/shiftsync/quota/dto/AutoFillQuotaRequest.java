package com.shiftsync.quota.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutoFillQuotaRequest {
    @NotNull(message = "Branch ID is required")
    private UUID branchId;
    @NotBlank(message = "Scope is required")
    private String scope; // "DAY" or "WEEK"
    private LocalDate date;
    private LocalDate weekStart;
}

