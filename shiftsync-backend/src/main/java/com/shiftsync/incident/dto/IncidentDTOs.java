package com.shiftsync.incident.dto;

import com.shiftsync.incident.entity.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class IncidentDTOs {
    private IncidentDTOs() { }
    public record PhotoDTO(UUID id, String contentType, int sizeBytes) { }
    public record IncidentDTO(UUID id, UUID storeId, UUID shiftId, UUID reporterId, String reporterName,
            IncidentCategory category, IncidentSeverity severity, IncidentStatus status, String description,
            OffsetDateTime createdAt, OffsetDateTime updatedAt, String reviewNote, List<PhotoDTO> photos) { }
    public record ReviewRequest(@NotNull IncidentStatus status, @Size(max = 2000) String reviewNote) { }
}
