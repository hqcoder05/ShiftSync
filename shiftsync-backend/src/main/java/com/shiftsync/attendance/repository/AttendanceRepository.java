package com.shiftsync.attendance.repository;

import com.shiftsync.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findByShiftAssignment_Staff_IdAndShiftAssignment_Shift_IdIn(UUID staffId, List<UUID> shiftIds);
    Optional<Attendance> findByShiftAssignmentId(UUID shiftAssignmentId);
    boolean existsByShiftAssignmentId(UUID shiftAssignmentId);
    boolean existsByShiftAssignment_Shift_Id(UUID shiftId);
    List<Attendance> findByShiftAssignment_IdIn(List<UUID> assignmentIds);
    
    List<Attendance> findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(UUID storeId, java.time.LocalDate startDate, java.time.LocalDate endDate);
    @org.springframework.data.jpa.repository.Query("SELECT a FROM Attendance a WHERE a.shiftAssignment.shift.store.id = :storeId AND a.shiftAssignment.shift.shiftDate BETWEEN :startDate AND :endDate")
    List<Attendance> findPayrollHistory(@org.springframework.data.repository.query.Param("storeId") UUID storeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    List<Attendance> findByShiftAssignment_Staff_IdOrderByCheckInTimeDesc(UUID staffId);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM Attendance a JOIN FETCH a.shiftAssignment sa JOIN FETCH sa.shift s JOIN FETCH s.store WHERE sa.staff.id = :staffId AND s.store.id = :storeId AND (a.checkInTime IS NOT NULL OR a.checkOutTime IS NOT NULL) ORDER BY a.checkInTime DESC")
    List<Attendance> findActivityForStore(@org.springframework.data.repository.query.Param("staffId") UUID staffId,
            @org.springframework.data.repository.query.Param("storeId") UUID storeId,
            org.springframework.data.domain.Pageable pageable);


    @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) FROM Attendance a WHERE a.shiftAssignment.shift.store.id = :storeId " +
           "AND a.shiftAssignment.shift.shiftDate >= :startDate " +
           "AND a.shiftAssignment.shift.shiftDate <= :endDate " +
           "AND a.status = :status")
    long countAttendanceByStoreAndDateRangeAndStatus(@org.springframework.data.repository.query.Param("storeId") UUID storeId, 
                                                     @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, 
                                                     @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
                                                     @org.springframework.data.repository.query.Param("status") com.shiftsync.attendance.enums.AttendanceStatus status);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(DISTINCT sa.id) FROM attendance a " +
            "JOIN shift_assignment sa ON sa.id=a.shift_assignment_id JOIN shift s ON s.id=sa.shift_id " +
            "WHERE s.store_id=:storeId AND s.shift_date BETWEEN :startDate AND :endDate " +
            "AND sa.deleted=false AND a.deleted=false AND a.status='LATE' AND s.status IN ('PUBLISHED','COMPLETED') " +
            "AND s.shift_date + s.start_time <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')", nativeQuery = true)
    long countLateStartedAssignments(@org.springframework.data.repository.query.Param("storeId") UUID storeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);
}
