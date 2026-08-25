package com.shiftsync.leave.repository;

import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    List<LeaveRequest> findByStoreId(UUID storeId);
    List<LeaveRequest> findByStoreIdAndStatus(UUID storeId, LeaveStatus status);
}
