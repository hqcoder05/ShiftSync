package com.shiftsync.payroll.dto;

import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayrollPeriodStatusUpdateRequest {
    @NotNull(message = "Status cannot be null")
    private PayrollPeriodStatus status;
}