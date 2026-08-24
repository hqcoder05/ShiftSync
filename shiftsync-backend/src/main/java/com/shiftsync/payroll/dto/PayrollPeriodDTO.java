package com.shiftsync.payroll.dto;

import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class PayrollPeriodDTO {
    private UUID id;
    private UUID storeId;
    private LocalDate startDate;
    private LocalDate endDate;
    private PayrollPeriodStatus status;
}
