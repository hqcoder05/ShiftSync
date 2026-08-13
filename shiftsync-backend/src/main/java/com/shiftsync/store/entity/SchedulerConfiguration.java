package com.shiftsync.store.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "scheduler_configuration")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchedulerConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "store_id", nullable = false, unique = true)
    private UUID storeId;

    @Column(name = "fairness_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal fairnessWeight = new BigDecimal("0.100");

    @Column(name = "skill_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal skillWeight = new BigDecimal("0.300");

    @Column(name = "hour_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal hourWeight = new BigDecimal("0.200");

    @Column(name = "priority_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal priorityWeight = new BigDecimal("0.100");

    @Column(name = "availability_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal availabilityWeight = new BigDecimal("0.300");
}
