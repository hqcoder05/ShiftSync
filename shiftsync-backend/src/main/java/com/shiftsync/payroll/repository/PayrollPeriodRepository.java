package com.shiftsync.payroll.repository;

import com.shiftsync.payroll.entity.PayrollPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, UUID> {
    boolean existsByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);
    java.util.Optional<PayrollPeriod> findByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);
    boolean existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(UUID storeId, LocalDate date1, LocalDate date2, List<com.shiftsync.payroll.enums.PayrollPeriodStatus> statuses);
    List<PayrollPeriod> findByStoreIdOrderByStartDateDesc(UUID storeId);
    java.util.Optional<PayrollPeriod> findByIdAndStoreId(UUID id, UUID storeId);
}
