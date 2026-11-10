package com.shiftsync.schedulehistory.entity;

import com.shiftsync.schedulehistory.dto.ScheduleHistoryDTOs.ShiftSnapshot;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.*;
import java.util.UUID;

@Entity @Table(name = "schedule_change")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduleChange {
    @Id private UUID id;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "shift_id", nullable = false) private UUID shiftId;
    @Column(name = "actor_id") private UUID actorId;
    @Column(name = "actor_name", nullable = false, length = 255) private String actorName;
    @Column(name = "changed_at", nullable = false) private OffsetDateTime changedAt;
    @Column(nullable = false, length = 1000) private String reason;
    @Column(name = "before_date") private LocalDate beforeDate;
    @Column(name = "after_date") private LocalDate afterDate;
    @Column(name = "employee_visible", nullable = false) private boolean employeeVisible;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "before_data", columnDefinition = "jsonb") private ShiftSnapshot before;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "after_data", columnDefinition = "jsonb") private ShiftSnapshot after;
}
