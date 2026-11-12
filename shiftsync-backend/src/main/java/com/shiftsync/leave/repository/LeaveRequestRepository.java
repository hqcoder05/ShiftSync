package com.shiftsync.leave.repository;

import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT l.* FROM leave_request l
            WHERE l.status = 'APPROVED' AND l.store_id <> :storeId
              AND l.start_date <= :endDate AND l.end_date >= :startDate
              AND EXISTS (SELECT 1 FROM leave_removed_assignment r
                JOIN shift_assignment a ON a.id=r.assignment_id
                JOIN employment e ON e.id=a.support_employment_id
                WHERE r.leave_request_id=l.id AND a.staff_id=l.staff_id
                  AND a.source='WORKFORCE_SHARING' AND e.store_id=:storeId)
            """, nativeQuery = true)
    List<LeaveRequest> findSupportLeavesForPayroll(
            @org.springframework.data.repository.query.Param("storeId") UUID storeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.id = :id")
    java.util.Optional<LeaveRequest> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
    List<LeaveRequest> findByStoreId(UUID storeId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.store.id = :storeId AND l.status IN ('PENDING', 'APPROVED')")
    List<LeaveRequest> findOpenForStoreClosure(@org.springframework.data.repository.query.Param("storeId") UUID storeId);
    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.store.id = :storeId AND l.status = :status ORDER BY l.staff.id ASC, l.startDate ASC, l.endDate ASC, l.id ASC")
    List<LeaveRequest> findByStoreIdAndStatus(@org.springframework.data.repository.query.Param("storeId") UUID storeId, @org.springframework.data.repository.query.Param("status") LeaveStatus status);
    List<LeaveRequest> findByStaffId(UUID staffId);

    List<LeaveRequest> findByStaffIdAndStoreIdOrderByCreatedAtDesc(UUID staffId, UUID storeId, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.staff.id IN :staffIds AND l.status = :status AND l.startDate <= :endDate AND l.endDate >= :startDate ORDER BY l.staff.id, l.startDate, l.id")
    List<LeaveRequest> findByStaffIdsAndStatusInPeriod(
            @org.springframework.data.repository.query.Param("staffIds") List<UUID> staffIds,
            @org.springframework.data.repository.query.Param("status") LeaveStatus status,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.staff.id = :staffId AND l.status IN ('PENDING', 'APPROVED') AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<LeaveRequest> findOverlappingRequests(@org.springframework.data.repository.query.Param("staffId") UUID staffId, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.store.id = :storeId AND l.status = :status AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<LeaveRequest> findApprovedLeavesInPeriod(@org.springframework.data.repository.query.Param("storeId") UUID storeId, @org.springframework.data.repository.query.Param("status") LeaveStatus status, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);
}
