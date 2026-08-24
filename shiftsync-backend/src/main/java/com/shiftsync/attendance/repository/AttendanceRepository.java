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

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) FROM Attendance a WHERE a.shiftAssignment.shift.store.id = :storeId " +
           "AND a.shiftAssignment.shift.shiftDate >= :startDate " +
           "AND a.shiftAssignment.shift.shiftDate <= :endDate " +
           "AND a.status = :status")
    long countAttendanceByStoreAndDateRangeAndStatus(@org.springframework.data.repository.query.Param("storeId") UUID storeId, 
                                                     @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, 
                                                     @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
                                                     @org.springframework.data.repository.query.Param("status") com.shiftsync.attendance.enums.AttendanceStatus status);
}
