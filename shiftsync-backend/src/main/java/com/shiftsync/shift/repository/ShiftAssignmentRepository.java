package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
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
}
