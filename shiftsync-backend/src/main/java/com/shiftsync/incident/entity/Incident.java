package com.shiftsync.incident.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "incident_report")
@Getter @Setter @NoArgsConstructor
public class Incident {
    @Id private UUID id;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "shift_id") private UUID shiftId;
    @Column(name = "reporter_id", nullable = false) private UUID reporterId;
    @Column(name = "reporter_name", nullable = false, length = 255) private String reporterName;
    @Column(name = "client_request_id", nullable = false) private UUID clientRequestId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private IncidentCategory category;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private IncidentSeverity severity;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private IncidentStatus status;
    @Column(nullable = false, length = 2000) private String description;
    @Column(name = "review_note", length = 2000) private String reviewNote;
    @Column(name = "reviewed_by") private UUID reviewedBy;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;
}
