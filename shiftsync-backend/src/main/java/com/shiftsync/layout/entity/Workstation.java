package com.shiftsync.layout.entity;

import com.shiftsync.store.entity.Store;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "workstations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Workstation {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private StoreZone zone;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "code")
    private String code;

    @Column(name = "workstation_type", nullable = false)
    @Builder.Default
    private String workstationType = "GENERIC_COUNTER";

    @Column(name = "x_coord", nullable = false)
    @Builder.Default
    private Double x = 0.0;

    @Column(name = "y_coord", nullable = false)
    @Builder.Default
    private Double y = 0.0;

    @Column(name = "z_coord", nullable = false)
    @Builder.Default
    private Double z = 0.0;

    @Column(name = "capacity", nullable = false)
    @Builder.Default
    private Integer capacity = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
