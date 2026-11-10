package com.shiftsync.availability.entity;

import com.shiftsync.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** A submitted week remains a separate snapshot, including an explicitly empty week. */
@Entity
@Table(name = "availability_week", uniqueConstraints = @UniqueConstraint(columnNames = {"staff_id", "week_start"}))
@Getter @Setter @NoArgsConstructor
public class AvailabilityWeek {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "staff_id", nullable = false)
    private User user;
    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;
    @Column(nullable = false)
    private long revision;
    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;
    @ElementCollection
    @CollectionTable(name = "availability_week_slot", joinColumns = @JoinColumn(name = "week_id"))
    @OrderBy("dayOfWeek ASC, startTime ASC")
    private List<AvailabilityWeekSlot> slots = new ArrayList<>();
}
