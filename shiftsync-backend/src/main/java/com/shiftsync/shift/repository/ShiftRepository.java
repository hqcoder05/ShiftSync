package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftRepository extends JpaRepository<Shift, UUID> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"requirements", "requirements.skill"})
    List<Shift> findByStoreId(UUID storeId);
    
    @Query("SELECT s FROM Shift s WHERE s.store.id = :storeId AND s.shiftDate BETWEEN :startDate AND :endDate " +
           "ORDER BY s.shiftDate ASC, s.startTime ASC, s.endTime ASC, s.id ASC")
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"requirements", "requirements.skill"})
    List<Shift> findByStoreIdAndShiftDateBetween(@Param("storeId") UUID storeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);


    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"requirements", "requirements.skill"})
    List<Shift> findByStoreIdAndShiftDate(UUID storeId, LocalDate shiftDate);
    
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"requirements", "requirements.skill"})
    Optional<Shift> findByStoreIdAndShiftDateAndStartTimeAndEndTime(UUID storeId, LocalDate shiftDate, java.time.LocalTime startTime, java.time.LocalTime endTime);

    Optional<Shift> findByIdAndStoreId(UUID id, UUID storeId);

    List<Shift> findByStoreIdAndStatusAndIsOpenTrue(UUID storeId, com.shiftsync.shift.enums.ShiftStatus status);

    @Query("SELECT s FROM Shift s WHERE s.shiftDate >= :startDate AND s.shiftDate <= :endDate AND " +
           "s.id IN (SELECT a.shift.id FROM ShiftAssignment a WHERE a.staff.id = :staffId)")
    List<Shift> findActiveShiftsForStaffInPeriod(
            @Param("staffId") UUID staffId, 
            @Param("startDate") LocalDate startDate, 
            @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(req.requiredCount) FROM Shift s JOIN s.requirements req " +
           "WHERE s.store.id = :storeId AND s.shiftDate >= :startDate AND s.shiftDate <= :endDate")
    Long sumRequiredStaffByStoreAndDateRange(@Param("storeId") UUID storeId, 
                                             @Param("startDate") LocalDate startDate, 
                                             @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(s) FROM Shift s WHERE s.store.id = :storeId AND s.shiftDate >= :startDate AND s.shiftDate <= :endDate AND s.isOpen = true")
    long countOpenShiftsByStoreAndDateRange(@Param("storeId") UUID storeId, 
                                            @Param("startDate") LocalDate startDate, 
                                            @Param("endDate") LocalDate endDate);
}
