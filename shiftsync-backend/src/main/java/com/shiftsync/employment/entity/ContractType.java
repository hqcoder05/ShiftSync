package com.shiftsync.employment.entity;

import com.shiftsync.store.entity.Store;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "contract_type")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractType {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(nullable = false)
    private String name;

    @Column(name = "max_weekly_hours", nullable = false)
    private Integer maxWeeklyHours;

    @Column(name = "ot_multiplier", nullable = false)
    private BigDecimal otMultiplier;

    @Column(name = "default_hourly_rate", nullable = false)
    private BigDecimal defaultHourlyRate;
}
