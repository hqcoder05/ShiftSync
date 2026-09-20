package com.shiftsync.quota.entity;

import com.shiftsync.skill.entity.Skill;
import com.shiftsync.store.entity.Store;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "position_norm_override", uniqueConstraints = @UniqueConstraint(
        name = "uk_position_norm_override_store_skill", columnNames = {"store_id", "skill_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PositionNormOverride {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(name = "min_count", nullable = false)
    private int min;

    @Column(name = "target_count", nullable = false)
    private int target;

    @Column(name = "max_count", nullable = false)
    private int max;
}
