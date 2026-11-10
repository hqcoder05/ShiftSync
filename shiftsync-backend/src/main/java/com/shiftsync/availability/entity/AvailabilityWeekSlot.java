package com.shiftsync.availability.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;
import java.util.UUID;

@Embeddable @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AvailabilityWeekSlot {
    @Column(name = "id", nullable = false)
    private UUID id;
    @Column(name = "day_of_week", nullable = false)
    private Short dayOfWeek;
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;
}
