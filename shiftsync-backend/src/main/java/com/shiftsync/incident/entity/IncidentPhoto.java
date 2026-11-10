package com.shiftsync.incident.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "incident_photo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IncidentPhoto {
    @Id private UUID id;
    @Column(name = "incident_id", nullable = false) private UUID incidentId;
    @Column(name = "content_type", nullable = false, length = 30) private String contentType;
    @Column(name = "size_bytes", nullable = false) private int sizeBytes;
    @Column(nullable = false, columnDefinition = "bytea") private byte[] data;
}
