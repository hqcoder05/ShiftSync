package com.shiftsync.store.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class SchedulerConfigUpdateDTO {

    @NotNull
    @DecimalMin("0.0") @DecimalMax("1.0")
    private BigDecimal fairnessWeight;

    @NotNull
    @DecimalMin("0.0") @DecimalMax("1.0")
    private BigDecimal skillWeight;

    @NotNull
    @DecimalMin("0.0") @DecimalMax("1.0")
    private BigDecimal hourWeight;

    @NotNull
    @DecimalMin("0.0") @DecimalMax("1.0")
    private BigDecimal restTimeWeight;

    @NotNull
    @DecimalMin("0.0") @DecimalMax("1.0")
    private BigDecimal availabilityWeight;
}
