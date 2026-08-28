package com.shiftsync.attendance.repository;

import com.shiftsync.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findByShiftAssignment_Staff_IdAndShiftAssignment_Shift_IdIn(UUID staffId, List<UUID> shiftIds);
    Optional<Attendance> findByShiftAssignmentId(UUID shiftAssignmentId);
    
    List<Attendance> findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(UUID storeId, java.time.LocalDate startDate, java.time.LocalDate endDate);
    List<Attendance> findByShiftAssignment_Staff_IdOrderByCheckInTimeDesc(UUID staffId);
}
