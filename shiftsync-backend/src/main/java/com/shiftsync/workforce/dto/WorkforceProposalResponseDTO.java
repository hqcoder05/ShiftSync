package com.shiftsync.workforce.dto;

import com.shiftsync.workforce.enums.WorkforceProposalStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class WorkforceProposalResponseDTO {
    private UUID id;
    private UUID workforceRequestId;
    private UUID staffId;
    private WorkforceProposalStatus status;
    private UUID proposedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime respondedAt;
}
