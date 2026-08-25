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
    List<ShiftAssignment> findByShiftId(UUID shiftId);

    @Query("SELECT COUNT(sa) FROM ShiftAssignment sa WHERE sa.shift.id = :shiftId")
    long countActiveAssignmentsByShiftId(@Param("shiftId") UUID shiftId);

    long countByShiftId(UUID shiftId);

    Optional<ShiftAssignment> findByShiftIdAndStaffId(UUID shiftId, UUID staffId);
    
    List<ShiftAssignment> findByStaffIdAndShift_ShiftDateBetween(UUID staffId, LocalDate startDate, LocalDate endDate);
    
    boolean existsByShiftIdAndStaffId(UUID shiftId, UUID staffId);

    List<ShiftAssignment> findByStaffIdInAndShift_ShiftDateBetween(List<UUID> staffIds, LocalDate startDate, LocalDate endDate);
    
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
}
