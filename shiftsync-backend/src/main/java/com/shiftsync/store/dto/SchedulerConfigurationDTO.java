package com.shiftsync.store.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class SchedulerConfigurationDTO {
    private UUID id;
    private UUID storeId;
    private BigDecimal fairnessWeight;
    private BigDecimal skillWeight;
    private BigDecimal hourWeight;
    private BigDecimal restTimeWeight;
    private BigDecimal availabilityWeight;
}
