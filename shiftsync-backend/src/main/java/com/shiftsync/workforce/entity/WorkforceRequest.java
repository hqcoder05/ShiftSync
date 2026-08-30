package com.shiftsync.workforce.entity;

import com.shiftsync.shift.entity.Shift;
import com.shiftsync.store.entity.Store;
import com.shiftsync.auth.entity.User;
import com.shiftsync.workforce.enums.WorkforceRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.List;

@Entity
@Table(name = "workforce_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkforceRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requesting_store_id", nullable = false)
    private Store requestingStore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_store_id", nullable = false)
    private Store targetStore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "workforce_request_status_enum", nullable = false)
    private WorkforceRequestStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
    
    @OneToMany(mappedBy = "workforceRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkforceProposal> proposals;
}

