package com.shiftsync.layout.entity;

import com.shiftsync.store.entity.Store;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "store_zones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreZone {

    @Id
    @GeneratedValue
    private UUID id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "x_coord", nullable = false)
    private Double x;

    @Column(name = "y_coord", nullable = false)
    private Double y;

    @Column(name = "z_coord", nullable = false)
    private Double z;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "code")
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone_type", nullable = false)
    @Builder.Default
    private com.shiftsync.layout.enums.SpatialType zoneType = com.shiftsync.layout.enums.SpatialType.ZONE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_zone_id")
    private StoreZone parentZone;

    @Column(name = "color")
    private String color;

    @Column(name = "description")
    private String description;

    @Column(name = "width_dim")
    @Builder.Default
    private Double widthDim = 3.0;

    @Column(name = "length_dim")
    @Builder.Default
    private Double lengthDim = 4.0;

    @Column(name = "height_dim")
    @Builder.Default
    private Double heightDim = 2.8;
}
