package com.shiftsync.request.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "requester_name", nullable = false, length = 100)
    private String requesterName;

    @Column(name = "avatar_key", length = 50)
    @Builder.Default
    private String avatarKey = "paul";

    @Column(name = "request_type", nullable = false, length = 100)
    private String requestType;

    @Column(name = "type_category", nullable = false, length = 50)
    @Builder.Default
    private String typeCategory = "support";

    @Column(name = "status", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private com.shiftsync.request.enums.RequestStatus status = com.shiftsync.request.enums.RequestStatus.PENDING;

    @Column(name = "recipient", length = 255)
    private String recipient;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "shift_info", length = 255)
    private String shiftInfo;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
