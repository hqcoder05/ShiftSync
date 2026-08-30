package com.shiftsync.shift.entity;

import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.store.entity.Store;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "shift", indexes = {
        @Index(name = "idx_shift_store_date", columnList = "store_id, shift_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_template_id")
    private ShiftTemplate shiftTemplate;

    @Column(name = "shift_date", nullable = false)
    private LocalDate shiftDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Builder.Default
    private ShiftStatus status = ShiftStatus.DRAFT;

    @Column(name = "availability_deadline", nullable = false)
    private ZonedDateTime availabilityDeadline;

    @Column(name = "is_open", nullable = false)
    @Builder.Default
    private boolean isOpen = false;

    @OneToMany(mappedBy = "shift", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ShiftSkillRequirement> requirements = new ArrayList<>();

    @OneToMany(mappedBy = "shift")
    @Builder.Default
    private List<ShiftAssignment> assignments = new ArrayList<>();
    
    public void setRequirements(List<ShiftSkillRequirement> newRequirements) {
        if (this.requirements == null) {
            this.requirements = new ArrayList<>();
        }
        this.requirements.clear();
        if (newRequirements != null) {
            this.requirements.addAll(newRequirements);
            this.requirements.forEach(req -> req.setShift(this));
        }
    }
}
