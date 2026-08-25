package com.shiftsync.workforce.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class WorkforceRequestCreateDTO {
    @NotNull(message = "targetStoreId is required")
    private UUID targetStoreId;

    @NotNull(message = "shiftId is required")
    private UUID shiftId;
}
