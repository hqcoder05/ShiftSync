package com.shiftsync.leave.repository;

import com.shiftsync.leave.entity.LeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, UUID> {

    Optional<LeaveBalance> findByStaffIdAndStoreIdAndYear(UUID staffId, UUID storeId, int year);

    List<LeaveBalance> findByStoreIdAndYear(UUID storeId, int year);

    List<LeaveBalance> findByStaffIdAndStoreId(UUID staffId, UUID storeId);
}
