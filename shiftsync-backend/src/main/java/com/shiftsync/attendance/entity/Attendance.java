package com.shiftsync.attendance.entity;

import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.shift.entity.ShiftAssignment;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE attendance SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Attendance {

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_assignment_id", nullable = false, unique = true)
    private ShiftAssignment shiftAssignment;

    @Column(name = "check_in_time")
    private OffsetDateTime checkInTime;

    @Column(name = "check_out_time")
    private OffsetDateTime checkOutTime;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status")
    private AttendanceStatus status;
}
