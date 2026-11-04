package com.shiftsync.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record LeaveProvenanceReconciliationRequest(@NotNull List<@NotNull UUID> assignmentIds,
                                                    @NotBlank String reason) {}
