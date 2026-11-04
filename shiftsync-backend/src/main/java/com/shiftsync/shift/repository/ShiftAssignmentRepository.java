package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, UUID> {
    @Query("SELECT a FROM ShiftAssignment a WHERE a.shift.id = :shiftId ORDER BY a.staff.id ASC, a.id ASC")
    List<ShiftAssignment> findByShiftId(@Param("shiftId") UUID shiftId);

    List<ShiftAssignment> findByStaffId(UUID staffId);

    @Query("SELECT COUNT(sa) FROM ShiftAssignment sa WHERE sa.shift.id = :shiftId")
    long countActiveAssignmentsByShiftId(@Param("shiftId") UUID shiftId);

    long countByShiftId(UUID shiftId);

    Optional<ShiftAssignment> findByShiftIdAndStaffId(UUID shiftId, UUID staffId);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.shift.id = :shiftId AND sa.staff.id = :staffId")
    Optional<ShiftAssignment> findWithLockByShiftIdAndStaffId(@Param("shiftId") UUID shiftId, @Param("staffId") UUID staffId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.shift.id = :shiftId AND sa.staff.id IN :staffIds")
    List<ShiftAssignment> findWithLockByShiftIdAndStaffIdIn(@Param("shiftId") UUID shiftId, @Param("staffIds") List<UUID> staffIds);
    
    List<ShiftAssignment> findByStaffIdAndShift_ShiftDateBetween(UUID staffId, LocalDate startDate, LocalDate endDate);
    
    boolean existsByShiftIdAndStaffId(UUID shiftId, UUID staffId);

    @Query("SELECT a FROM ShiftAssignment a WHERE a.staff.id IN :staffIds AND a.shift.shiftDate BETWEEN :startDate AND :endDate " +
           "ORDER BY a.staff.id ASC, a.shift.shiftDate ASC, a.shift.startTime ASC, a.shift.endTime ASC, a.shift.id ASC, a.id ASC")
    List<ShiftAssignment> findByStaffIdInAndShift_ShiftDateBetween(@Param("staffIds") List<UUID> staffIds, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    List<ShiftAssignment> findByShift_Store_IdAndShift_ShiftDateBetween(UUID storeId, LocalDate startDate, LocalDate endDate);
    @Query("SELECT a FROM ShiftAssignment a JOIN FETCH a.supportEmployment e JOIN FETCH a.shift s " +
            "WHERE e.store.id = :storeId AND s.shiftDate BETWEEN :startDate AND :endDate")
    List<ShiftAssignment> findSupportForPayroll(@Param("storeId") UUID storeId,
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    // Include removed assignments: approved leave can still make their role payable.
    @Query(value = "SELECT DISTINCT e.store_id FROM shift_assignment a JOIN employment e ON e.id=a.support_employment_id WHERE a.required_skill_id=:skillId AND a.source='WORKFORCE_SHARING'", nativeQuery = true)
    List<UUID> findSupportPayrollStoresForSkill(@Param("skillId") UUID skillId);
    @Query(value = "SELECT DISTINCT e.store_id FROM shift_assignment a JOIN employment e ON e.id=a.support_employment_id " +
            "WHERE a.shift_id=:shiftId AND a.source='WORKFORCE_SHARING' AND a.deleted=false", nativeQuery = true)
    List<UUID> findSupportPayrollStoresForShift(@Param("shiftId") UUID shiftId);
    @Query(value = "SELECT DISTINCT e.store_id FROM shift_assignment a JOIN employment e ON e.id=a.support_employment_id " +
            "JOIN shift s ON s.id=a.shift_id WHERE s.store_id=:storeId AND s.shift_date BETWEEN :startDate AND :endDate " +
            "AND a.source='WORKFORCE_SHARING' AND a.deleted=false", nativeQuery = true)
    List<UUID> findSupportPayrollStoresForShiftRange(@Param("storeId") UUID storeId,
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.shift.store.id = :storeId AND sa.shift.shiftDate BETWEEN :startDate AND :endDate")
    List<ShiftAssignment> findPayrollHistory(@Param("storeId") UUID storeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    @Query("SELECT sa.shift.id FROM ShiftAssignment sa WHERE sa.staff.id = :staffId AND sa.shift.status = 'PUBLISHED' AND sa.shift.shiftDate >= :startDate AND sa.shift.shiftDate <= :endDate")
    List<UUID> findConflictingPublishedShiftIds(@Param("staffId") UUID staffId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(sa) FROM ShiftAssignment sa WHERE sa.shift.store.id = :storeId " +
           "AND sa.shift.shiftDate >= :startDate " +
           "AND sa.shift.shiftDate <= :endDate")
    long countTotalAssignmentsByStoreAndDateRange(@Param("storeId") UUID storeId, 
                                                  @Param("startDate") LocalDate startDate, 
                                                  @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT COUNT(*) FROM shift_assignment sa JOIN shift s ON s.id=sa.shift_id " +
           "WHERE s.store_id=:storeId AND s.shift_date BETWEEN :startDate AND :endDate " +
           "AND sa.deleted=false AND s.status IN ('PUBLISHED','COMPLETED') " +
           "AND s.shift_date + s.end_time + CASE WHEN s.end_time <= s.start_time THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END " +
           "< (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')", nativeQuery = true)
    long countEndedAssignmentsByStoreAndDateRange(@Param("storeId") UUID storeId,
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT COUNT(*) FROM shift_assignment sa JOIN shift s ON s.id=sa.shift_id " +
           "WHERE s.store_id=:storeId AND s.shift_date BETWEEN :startDate AND :endDate " +
           "AND sa.deleted=false AND s.status IN ('PUBLISHED','COMPLETED') " +
           "AND s.shift_date + s.start_time <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')", nativeQuery = true)
    long countStartedAssignmentsByStoreAndDateRange(@Param("storeId") UUID storeId,
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT COUNT(*) FROM shift_assignment sa JOIN shift s ON s.id = sa.shift_id " +
           "WHERE s.store_id = :storeId AND s.shift_date BETWEEN :startDate AND :endDate " +
           "AND sa.deleted = false AND s.status IN ('PUBLISHED', 'COMPLETED') " +
           "AND s.shift_date + s.end_time + CASE WHEN s.end_time <= s.start_time THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END " +
           "< (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') " +
           "AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.shift_assignment_id = sa.id AND a.deleted = false AND a.status IS DISTINCT FROM 'ABSENT')", nativeQuery = true)
    long countAbsentAssignmentsByStoreAndDateRange(@Param("storeId") UUID storeId, 
                                                   @Param("startDate") LocalDate startDate, 
                                                   @Param("endDate") LocalDate endDate);

    List<ShiftAssignment> findByShift_Store_IdAndShift_ShiftDateAndShift_StartTimeBetween(
            UUID storeId, LocalDate shiftDate, java.time.LocalTime startTimeStart, java.time.LocalTime startTimeEnd);

    @Query("SELECT sa FROM ShiftAssignment sa JOIN FETCH sa.shift WHERE sa.shift.store.id = :storeId AND sa.shift.status = 'PUBLISHED' " +
            "AND (sa.shift.shiftDate > :startDate OR (sa.shift.shiftDate = :startDate AND sa.shift.startTime >= :startTime)) " +
            "AND (sa.shift.shiftDate < :endDate OR (sa.shift.shiftDate = :endDate AND sa.shift.startTime < :endTime))")
    List<ShiftAssignment> findPublishedReminders(@Param("storeId") UUID storeId,
            @Param("startDate") LocalDate startDate, @Param("startTime") java.time.LocalTime startTime,
            @Param("endDate") LocalDate endDate, @Param("endTime") java.time.LocalTime endTime);

    List<ShiftAssignment> findByStaffIdAndShift_ShiftDate(UUID staffId, LocalDate shiftDate);

    @Query(value = "SELECT sa.* FROM shift_assignment sa " +
                   "JOIN shift s ON sa.shift_id = s.id " +
                   "WHERE sa.staff_id = :staffId AND s.shift_date = :shiftDate " +
                   "ORDER BY sa.deleted ASC LIMIT 1", nativeQuery = true)
    Optional<ShiftAssignment> findAssignmentForStaffOnDateIncludingDeleted(@Param("staffId") UUID staffId, @Param("shiftDate") LocalDate shiftDate);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "INSERT INTO leave_removed_assignment(leave_request_id, assignment_id) VALUES (:leaveId, :assignmentId) ON CONFLICT DO NOTHING", nativeQuery = true)
    void recordLeaveRemoval(@Param("leaveId") UUID leaveId, @Param("assignmentId") UUID assignmentId);

    @Query(value = "SELECT sa.* FROM leave_removed_assignment l JOIN shift_assignment sa ON sa.id=l.assignment_id " +
            "JOIN shift s ON s.id=sa.shift_id LEFT JOIN employment e ON e.id=sa.support_employment_id " +
            "WHERE l.leave_request_id=:leaveId AND sa.staff_id=:staffId " +
            "AND ((sa.source <> 'WORKFORCE_SHARING' AND s.store_id=:storeId) OR (sa.source = 'WORKFORCE_SHARING' AND e.store_id=:storeId)) " +
            "AND s.shift_date BETWEEN :startDate AND :endDate", nativeQuery = true)
    List<ShiftAssignment> findRemovedForLeave(@Param("leaveId") UUID leaveId, @Param("staffId") UUID staffId,
            @Param("storeId") UUID storeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    interface LeaveReconciliationCandidate {
        UUID getAssignmentId();
        UUID getShiftId();
        LocalDate getShiftDate();
        java.time.LocalTime getStartTime();
        java.time.LocalTime getEndTime();
    }

    @Query(value = "SELECT sa.id AS \"assignmentId\", s.id AS \"shiftId\", s.shift_date AS \"shiftDate\", " +
            "s.start_time AS \"startTime\", s.end_time AS \"endTime\" FROM shift_assignment sa " +
            "JOIN shift s ON s.id=sa.shift_id LEFT JOIN employment e ON e.id=sa.support_employment_id " +
            "WHERE sa.deleted=true AND sa.staff_id=:staffId " +
            "AND ((sa.source <> 'WORKFORCE_SHARING' AND s.store_id=:storeId) OR (sa.source = 'WORKFORCE_SHARING' AND e.store_id=:storeId)) " +
            "AND s.status <> 'CANCELLED' AND s.shift_date + s.start_time < CAST(:endDate AS date) + INTERVAL '1 day' " +
            "AND s.shift_date + s.end_time + CASE WHEN s.end_time <= s.start_time THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END > CAST(:startDate AS date) " +
            "ORDER BY s.shift_date,s.start_time,sa.id", nativeQuery = true)
    List<LeaveReconciliationCandidate> findLeaveReconciliationCandidates(@Param("staffId") UUID staffId,
            @Param("storeId") UUID storeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
