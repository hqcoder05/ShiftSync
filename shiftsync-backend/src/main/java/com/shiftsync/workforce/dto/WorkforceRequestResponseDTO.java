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
    private String requestingStoreName;
    private UUID targetStoreId;
    private String targetStoreName;
    private UUID shiftId;
    private java.time.LocalDate shiftDate;
    private java.time.LocalTime shiftStartTime;
    private java.time.LocalTime shiftEndTime;
    private WorkforceRequestStatus status;
    private UUID createdBy;
    private String creatorName;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<WorkforceProposalResponseDTO> proposals;
}
