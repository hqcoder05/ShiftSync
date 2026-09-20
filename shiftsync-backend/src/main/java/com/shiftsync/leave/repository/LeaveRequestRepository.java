package com.shiftsync.leave.repository;

import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    List<LeaveRequest> findByStoreId(UUID storeId);
    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.store.id = :storeId AND l.status = :status ORDER BY l.staff.id ASC, l.startDate ASC, l.endDate ASC, l.id ASC")
    List<LeaveRequest> findByStoreIdAndStatus(@org.springframework.data.repository.query.Param("storeId") UUID storeId, @org.springframework.data.repository.query.Param("status") LeaveStatus status);
    List<LeaveRequest> findByStaffId(UUID staffId);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.staff.id = :staffId AND l.status IN ('PENDING', 'APPROVED') AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<LeaveRequest> findOverlappingRequests(@org.springframework.data.repository.query.Param("staffId") UUID staffId, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.store.id = :storeId AND l.status = :status AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<LeaveRequest> findApprovedLeavesInPeriod(@org.springframework.data.repository.query.Param("storeId") UUID storeId, @org.springframework.data.repository.query.Param("status") LeaveStatus status, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);
}
