package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, UUID> {
    @Query("SELECT a FROM ShiftAssignment a WHERE a.shift.id = :shiftId ORDER BY a.staff.id ASC, a.id ASC")
    List<ShiftAssignment> findByShiftId(@Param("shiftId") UUID shiftId);

    List<ShiftAssignment> findByStaffId(UUID staffId);

    @Query("SELECT COUNT(sa) FROM ShiftAssignment sa WHERE sa.shift.id = :shiftId")
    long countActiveAssignmentsByShiftId(@Param("shiftId") UUID shiftId);

    long countByShiftId(UUID shiftId);

    Optional<ShiftAssignment> findByShiftIdAndStaffId(UUID shiftId, UUID staffId);
    
    List<ShiftAssignment> findByStaffIdAndShift_ShiftDateBetween(UUID staffId, LocalDate startDate, LocalDate endDate);
    
    boolean existsByShiftIdAndStaffId(UUID shiftId, UUID staffId);

    @Query("SELECT a FROM ShiftAssignment a WHERE a.staff.id IN :staffIds AND a.shift.shiftDate BETWEEN :startDate AND :endDate " +
           "ORDER BY a.staff.id ASC, a.shift.shiftDate ASC, a.shift.startTime ASC, a.shift.endTime ASC, a.shift.id ASC, a.id ASC")
    List<ShiftAssignment> findByStaffIdInAndShift_ShiftDateBetween(@Param("staffIds") List<UUID> staffIds, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    List<ShiftAssignment> findByShift_Store_IdAndShift_ShiftDateBetween(UUID storeId, LocalDate startDate, LocalDate endDate);
    @Query("SELECT sa.shift.id FROM ShiftAssignment sa WHERE sa.staff.id = :staffId AND sa.shift.status = 'PUBLISHED' AND sa.shift.shiftDate >= :startDate AND sa.shift.shiftDate <= :endDate")
    List<UUID> findConflictingPublishedShiftIds(@Param("staffId") UUID staffId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(sa) FROM ShiftAssignment sa WHERE sa.shift.store.id = :storeId " +
           "AND sa.shift.shiftDate >= :startDate " +
           "AND sa.shift.shiftDate <= :endDate")
    long countTotalAssignmentsByStoreAndDateRange(@Param("storeId") UUID storeId, 
                                                  @Param("startDate") LocalDate startDate, 
                                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(sa) FROM ShiftAssignment sa WHERE sa.shift.store.id = :storeId " +
           "AND sa.shift.shiftDate >= :startDate " +
           "AND sa.shift.shiftDate <= :endDate " +
           "AND (sa.shift.shiftDate < CURRENT_DATE OR (sa.shift.shiftDate = CURRENT_DATE AND sa.shift.endTime < CURRENT_TIME)) " +
           "AND NOT EXISTS (SELECT a FROM Attendance a WHERE a.shiftAssignment = sa)")
    long countAbsentAssignmentsByStoreAndDateRange(@Param("storeId") UUID storeId, 
                                                   @Param("startDate") LocalDate startDate, 
                                                   @Param("endDate") LocalDate endDate);

    List<ShiftAssignment> findByShift_Store_IdAndShift_ShiftDateAndShift_StartTimeBetween(
            UUID storeId, LocalDate shiftDate, java.time.LocalTime startTimeStart, java.time.LocalTime startTimeEnd);

    List<ShiftAssignment> findByStaffIdAndShift_ShiftDate(UUID staffId, LocalDate shiftDate);

    @Query(value = "SELECT sa.* FROM shift_assignment sa " +
                   "JOIN shift s ON sa.shift_id = s.id " +
                   "WHERE sa.staff_id = :staffId AND s.shift_date = :shiftDate " +
                   "ORDER BY sa.deleted ASC LIMIT 1", nativeQuery = true)
    Optional<ShiftAssignment> findAssignmentForStaffOnDateIncludingDeleted(@Param("staffId") UUID staffId, @Param("shiftDate") LocalDate shiftDate);
}
