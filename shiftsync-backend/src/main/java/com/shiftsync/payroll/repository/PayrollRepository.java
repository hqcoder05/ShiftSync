package com.shiftsync.payroll.repository;

import com.shiftsync.payroll.entity.Payroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, UUID> {
    List<Payroll> findByPayrollPeriodId(UUID payrollPeriodId);
    void deleteByPayrollPeriod(com.shiftsync.payroll.entity.PayrollPeriod payrollPeriod);
    List<Payroll> findByStaffIdOrderByPayrollPeriod_StartDateDesc(UUID staffId);
    Optional<Payroll> findByIdAndStaffId(UUID id, UUID staffId);

    @Query("SELECT new com.shiftsync.payroll.dto.PayrollAggregation(SUM(p.totalHours), SUM(p.totalAmount), SUM(p.otHours)) " +
           "FROM Payroll p JOIN p.payrollPeriod pp " +
           "WHERE pp.store.id = :storeId " +
           "AND pp.startDate >= :startDate AND pp.endDate <= :endDate")
    com.shiftsync.payroll.dto.PayrollAggregation getPayrollMetrics(@org.springframework.data.repository.query.Param("storeId") java.util.UUID storeId,
                                                                   @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
                                                                   @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @Query("SELECT new com.shiftsync.payroll.dto.PayrollChartAggregation(pp.startDate, pp.endDate, SUM(p.totalHours), SUM(p.totalAmount)) " +
           "FROM Payroll p JOIN p.payrollPeriod pp " +
           "WHERE pp.store.id = :storeId " +
           "AND pp.startDate >= :startDate AND pp.endDate <= :endDate " +
           "GROUP BY pp.id, pp.startDate, pp.endDate " +
           "ORDER BY pp.startDate ASC")
    List<com.shiftsync.payroll.dto.PayrollChartAggregation> getPayrollChartData(@org.springframework.data.repository.query.Param("storeId") java.util.UUID storeId,
                                                                                @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
                                                                                @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);
}
