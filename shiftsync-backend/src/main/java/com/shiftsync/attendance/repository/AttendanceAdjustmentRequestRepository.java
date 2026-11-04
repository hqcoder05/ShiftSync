package com.shiftsync.attendance.repository;

import com.shiftsync.attendance.entity.AttendanceAdjustmentRequest;
import com.shiftsync.attendance.enums.AdjustmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttendanceAdjustmentRequestRepository extends JpaRepository<AttendanceAdjustmentRequest, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM AttendanceAdjustmentRequest r WHERE r.id = :id")
    java.util.Optional<AttendanceAdjustmentRequest> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
    List<AttendanceAdjustmentRequest> findByShiftStoreId(UUID storeId);
    List<AttendanceAdjustmentRequest> findByShiftStoreIdAndStatus(UUID storeId, AdjustmentStatus status);
    List<AttendanceAdjustmentRequest> findByShiftStoreIdAndStaffId(UUID storeId, UUID staffId);
}
