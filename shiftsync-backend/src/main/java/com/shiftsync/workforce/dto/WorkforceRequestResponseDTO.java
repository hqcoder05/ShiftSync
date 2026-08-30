package com.shiftsync.workforce.dto;

import com.shiftsync.workforce.enums.WorkforceRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.List;

@Data
@Builder
public class WorkforceRequestResponseDTO {
    private UUID id;
    private UUID requestingStoreId;
    private UUID targetStoreId;
    private UUID shiftId;
    private WorkforceRequestStatus status;
    private UUID createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<WorkforceProposalResponseDTO> proposals;
}
