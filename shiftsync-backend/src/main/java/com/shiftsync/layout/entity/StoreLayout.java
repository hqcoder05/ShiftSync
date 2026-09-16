package com.shiftsync.layout.entity;

import com.shiftsync.store.entity.Store;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "store_layouts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreLayout {

    @Id
    @GeneratedValue
    private UUID id;


    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false, unique = true)
    private Store store;

    @Column(name = "length", nullable = false)
    private Double length;

    @Column(name = "width", nullable = false)
    private Double width;

    @Column(name = "height", nullable = false)
    private Double height;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 1L;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private java.time.OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private java.time.OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = java.time.OffsetDateTime.now();
        updatedAt = java.time.OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = java.time.OffsetDateTime.now();
    }

}
