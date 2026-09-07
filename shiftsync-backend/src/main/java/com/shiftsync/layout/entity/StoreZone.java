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
}
