package com.shiftsync.workforce.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class WorkforceProposalCreateDTO {
    @NotNull(message = "staffId is required")
    private UUID staffId;
}
