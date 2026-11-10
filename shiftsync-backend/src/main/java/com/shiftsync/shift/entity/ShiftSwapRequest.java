package com.shiftsync.shift.entity;

import com.shiftsync.auth.entity.User;
import com.shiftsync.shift.enums.SwapStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "shift_swap_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftSwapRequest {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_staff_id", nullable = false)
    private User fromStaff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_shift_id", nullable = false)
    private Shift fromShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_staff_id", nullable = false)
    private User toStaff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_shift_id")
    private Shift toShift;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Builder.Default
    private SwapStatus status = SwapStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    // Nullable for legacy rows; do not invent historical transition times.
    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private java.time.OffsetDateTime createdAt;

    private java.time.OffsetDateTime employeeRespondedAt;
    private java.time.OffsetDateTime reviewedAt;
    private java.time.OffsetDateTime cancelledAt;
    private UUID cancelledById;
    private String cancelledByName;
    @Column(columnDefinition = "TEXT")
    private String managerNote;

    @Column(name = "employee_accepted", nullable = false)
    @Builder.Default
    private boolean employeeAccepted = false;
}
