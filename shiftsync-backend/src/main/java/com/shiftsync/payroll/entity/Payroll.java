package com.shiftsync.payroll.entity;

import com.shiftsync.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payroll")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE payroll SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Payroll {

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_period_id", nullable = false)
    private PayrollPeriod payrollPeriod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "total_hours", nullable = false)
    @Builder.Default
    private BigDecimal totalHours = BigDecimal.ZERO;

    @Column(name = "ot_hours", nullable = false)
    @Builder.Default
    private BigDecimal otHours = BigDecimal.ZERO;

    @Column(name = "holiday_hours", nullable = false)
    @Builder.Default
    private BigDecimal holidayHours = BigDecimal.ZERO;

    @Column(name = "base_amount", nullable = false)
    @Builder.Default
    private BigDecimal baseAmount = BigDecimal.ZERO;

    @Column(name = "ot_amount", nullable = false)
    @Builder.Default
    private BigDecimal otAmount = BigDecimal.ZERO;

    @Column(name = "holiday_amount", nullable = false)
    @Builder.Default
    private BigDecimal holidayAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "generated_at", nullable = false, updatable = false)
    private OffsetDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        generatedAt = OffsetDateTime.now();
    }
}