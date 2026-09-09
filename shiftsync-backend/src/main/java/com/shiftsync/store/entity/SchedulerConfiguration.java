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
    private BigDecimal fairnessWeight = new BigDecimal("0.200");

    @Column(name = "skill_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal skillWeight = new BigDecimal("0.250");

    @Column(name = "hour_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal hourWeight = new BigDecimal("0.200");

    @Column(name = "rest_time_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal restTimeWeight = new BigDecimal("0.150");

    @Column(name = "availability_weight", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal availabilityWeight = new BigDecimal("0.200");

    // Lỗi 6: Validate tổng trọng số scoring = 1.000 (cho phép sai số 0.001)
    @PrePersist
    @PreUpdate
    public void validateWeights() {
        BigDecimal sum = (fairnessWeight != null ? fairnessWeight : BigDecimal.ZERO)
                .add(skillWeight != null ? skillWeight : BigDecimal.ZERO)
                .add(hourWeight != null ? hourWeight : BigDecimal.ZERO)
                .add(restTimeWeight != null ? restTimeWeight : BigDecimal.ZERO)
                .add(availabilityWeight != null ? availabilityWeight : BigDecimal.ZERO);
        if (sum.subtract(BigDecimal.ONE).abs().compareTo(new BigDecimal("0.001")) > 0) {
            throw new com.shiftsync.shared.exception.BusinessException(
                    "Total scheduler weights must equal 1.000 (within 0.001 tolerance)",
                    org.springframework.http.HttpStatus.BAD_REQUEST);
        }
    }
}
