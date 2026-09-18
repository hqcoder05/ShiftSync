package com.shiftsync.leave.entity;

import com.shiftsync.auth.entity.User;
import com.shiftsync.store.entity.Store;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "leave_balance", uniqueConstraints = {
        @UniqueConstraint(name = "uq_staff_store_year", columnNames = {"staff_id", "store_id", "year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "annual_entitlement", nullable = false)
    @Builder.Default
    private int annualEntitlement = 12;

    @Column(name = "carry_over_days", nullable = false)
    @Builder.Default
    private int carryOverDays = 0;

    @Column(name = "used_days", nullable = false)
    @Builder.Default
    private int usedDays = 0;

    @Column(name = "pending_days", nullable = false)
    @Builder.Default
    private int pendingDays = 0;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    public int getRemainingDays() {
        return (annualEntitlement + carryOverDays) - usedDays;
    }
}
