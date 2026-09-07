package com.shiftsync.leave.repository;

import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    List<LeaveRequest> findByStoreId(UUID storeId);
    List<LeaveRequest> findByStoreIdAndStatus(UUID storeId, LeaveStatus status);
    List<LeaveRequest> findByStaffId(UUID staffId);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM LeaveRequest l WHERE l.staff.id = :staffId AND l.status IN ('PENDING', 'APPROVED') AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<LeaveRequest> findOverlappingRequests(@org.springframework.data.repository.query.Param("staffId") UUID staffId, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);
}
