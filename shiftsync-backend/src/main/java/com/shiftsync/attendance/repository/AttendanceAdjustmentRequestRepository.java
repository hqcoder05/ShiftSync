package com.shiftsync.attendance.repository;

import com.shiftsync.attendance.entity.AttendanceAdjustmentRequest;
import com.shiftsync.attendance.enums.AdjustmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceAdjustmentRequestRepository extends JpaRepository<AttendanceAdjustmentRequest, UUID> {
    List<AttendanceAdjustmentRequest> findByShiftStoreId(UUID storeId);
    List<AttendanceAdjustmentRequest> findByShiftStoreIdAndStatus(UUID storeId, AdjustmentStatus status);
}
