package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.SwapStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShiftSwapRequestRepository extends JpaRepository<ShiftSwapRequest, UUID> {
    List<ShiftSwapRequest> findByFromStaffIdOrToStaffId(UUID fromStaffId, UUID toStaffId);
    List<ShiftSwapRequest> findByFromShiftId_StoreIdAndStatus(UUID storeId, SwapStatus status);
}
