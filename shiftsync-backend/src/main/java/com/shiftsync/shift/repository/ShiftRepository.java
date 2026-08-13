package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, UUID> {
    List<Shift> findByStoreId(UUID storeId);
    
    List<Shift> findByStoreIdAndShiftDateBetween(UUID storeId, LocalDate startDate, LocalDate endDate);
    
    Optional<Shift> findByIdAndStoreId(UUID id, UUID storeId);

    List<Shift> findByStoreIdAndStatusAndIsOpenTrue(UUID storeId, com.shiftsync.shift.enums.ShiftStatus status);

    @Query("SELECT s FROM Shift s WHERE s.shiftDate >= :startDate AND s.shiftDate <= :endDate AND (" +
           "s.id IN (SELECT a.shift.id FROM ShiftAssignment a WHERE a.staff.id = :staffId) " +
           "OR s.id IN (SELECT r.shift.id FROM ShiftRegistration r WHERE r.staff.id = :staffId AND r.status != 'REJECTED'))")
    List<Shift> findActiveShiftsForStaffInPeriod(
            @Param("staffId") UUID staffId, 
            @Param("startDate") LocalDate startDate, 
            @Param("endDate") LocalDate endDate);
}
