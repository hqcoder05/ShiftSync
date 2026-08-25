package com.shiftsync.employment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractTypeDTO {
    private UUID id;
    private String name;
    private Integer maxWeeklyHours;
    private BigDecimal otMultiplier;
    private BigDecimal defaultHourlyRate;
}
