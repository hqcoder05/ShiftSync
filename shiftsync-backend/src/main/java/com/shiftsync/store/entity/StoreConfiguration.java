package com.shiftsync.store.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "store_configuration")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "store_id", nullable = false, unique = true)
    private UUID storeId;

    @Column(name = "max_hour_per_week", nullable = false)
    @Builder.Default
    private Integer maxHourPerWeek = 48;

    @Column(name = "min_rest_hours", nullable = false)
    @Builder.Default
    private Integer minRestHours = 8;

    @Column(name = "geofence_radius_m", nullable = false)
    @Builder.Default
    private Integer geofenceRadiusM = 100;

    @Column(name = "registration_deadline_hours", nullable = false)
    @Builder.Default
    private Integer registrationDeadlineHours = 24;

    @Column(name = "allowed_check_in_minutes", nullable = false)
    @Builder.Default
    private Integer allowedCheckInMinutes = 30;

    @Column(name = "allowed_check_out_minutes", nullable = false)
    @Builder.Default
    private Integer allowedCheckOutMinutes = 60;

    @Column(name = "late_grace_minutes", nullable = false)
    @Builder.Default
    private Integer lateGraceMinutes = 5;

    @Column(name = "early_leave_grace_minutes", nullable = false)
    @Builder.Default
    private Integer earlyLeaveGraceMinutes = 5;
}
