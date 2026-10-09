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
    
    private UUID skillId;
    
    @jakarta.validation.constraints.Min(value = 1, message = "neededCount must be at least 1")
    private Integer neededCount = 1;
}
