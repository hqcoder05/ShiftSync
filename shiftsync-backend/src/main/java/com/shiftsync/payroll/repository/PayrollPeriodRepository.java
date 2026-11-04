package com.shiftsync.payroll.repository;

import com.shiftsync.payroll.entity.PayrollPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, UUID> {
    java.util.Optional<PayrollPeriod> findByIdAndStoreId(UUID id, UUID storeId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM PayrollPeriod p WHERE p.id = :id")
    java.util.Optional<PayrollPeriod> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
    boolean existsByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);
    java.util.Optional<PayrollPeriod> findByStoreIdAndStartDateAndEndDate(UUID storeId, LocalDate startDate, LocalDate endDate);
    boolean existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(UUID storeId, LocalDate date1, LocalDate date2, List<com.shiftsync.payroll.enums.PayrollPeriodStatus> statuses);
    boolean existsByStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(LocalDate date1, LocalDate date2, List<com.shiftsync.payroll.enums.PayrollPeriodStatus> statuses);
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(p) > 0 FROM PayrollPeriod p WHERE p.store.id = :storeId AND p.status IN :statuses AND p.endDate >= :startDate AND p.startDate < :endExclusive")
    boolean existsLockedOverlappingRevision(@org.springframework.data.repository.query.Param("storeId") UUID storeId,
            @org.springframework.data.repository.query.Param("startDate") LocalDate startDate,
            @org.springframework.data.repository.query.Param("endExclusive") LocalDate endExclusive,
            @org.springframework.data.repository.query.Param("statuses") List<com.shiftsync.payroll.enums.PayrollPeriodStatus> statuses);
    List<PayrollPeriod> findByStoreIdOrderByStartDateDesc(UUID storeId);
    @org.springframework.data.jpa.repository.Query("SELECT p FROM PayrollPeriod p WHERE p.store.id = :storeId AND p.startDate <= :endDate AND p.endDate >= :startDate")
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<PayrollPeriod> findOverlappingPeriods(@org.springframework.data.repository.query.Param("storeId") UUID storeId, 
                                               @org.springframework.data.repository.query.Param("startDate") LocalDate startDate, 
                                               @org.springframework.data.repository.query.Param("endDate") LocalDate endDate);
}
