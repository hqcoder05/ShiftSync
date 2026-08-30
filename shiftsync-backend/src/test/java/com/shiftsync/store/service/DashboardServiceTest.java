package com.shiftsync.store.service;

import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.dto.PayrollAggregation;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import com.shiftsync.store.dto.DashboardMetricsDTO;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class DashboardServiceTest {

    @Mock private EmploymentRepository employmentRepository;
    @Mock private PayrollRepository payrollRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftSwapRequestRepository shiftSwapRequestRepository;
    @Mock private StoreConfigurationRepository storeConfigurationRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private UUID storeId;
    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        startDate = LocalDate.of(2026, 8, 1);
        endDate = LocalDate.of(2026, 8, 31);
        
        // Default mocks to prevent NullPointerException
        when(shiftAssignmentRepository.countTotalAssignmentsByStoreAndDateRange(storeId, startDate, endDate)).thenReturn(100L);
        when(payrollRepository.getPayrollMetrics(storeId, startDate, endDate)).thenReturn(new PayrollAggregation(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
    }

    @Test
    void testCalculateLateRate() {
        when(attendanceRepository.countAttendanceByStoreAndDateRangeAndStatus(storeId, startDate, endDate, com.shiftsync.attendance.enums.AttendanceStatus.LATE))
                .thenReturn(15L);
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(15.0, result.getAttendance().getLateRate());
    }

    @Test
    void testCalculateAbsentRate() {
        when(shiftAssignmentRepository.countAbsentAssignmentsByStoreAndDateRange(storeId, startDate, endDate))
                .thenReturn(5L);
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(5.0, result.getAttendance().getAbsentRate());
    }

    @Test
    void testCalculateCoverage() {
        when(shiftRepository.sumRequiredStaffByStoreAndDateRange(storeId, startDate, endDate)).thenReturn(125L);
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(80.0, result.getScheduling().getCoverage()); // 100 / 125 * 100 = 80.0
    }

    @Test
    void testCalculateLaborCost() {
        when(payrollRepository.getPayrollMetrics(storeId, startDate, endDate)).thenReturn(
            new PayrollAggregation(new BigDecimal("100"), new BigDecimal("15000.50"), BigDecimal.ZERO)
        );
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(new BigDecimal("15000.50"), result.getPayroll().getLaborCost());
    }

    @Test
    void testCalculateWorkingHour() {
        when(payrollRepository.getPayrollMetrics(storeId, startDate, endDate)).thenReturn(
            new PayrollAggregation(new BigDecimal("350.5"), BigDecimal.ZERO, BigDecimal.ZERO)
        );
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(350.5, result.getPayroll().getWorkingHour());
    }

    @Test
    void testCalculateOvertime() {
        when(payrollRepository.getPayrollMetrics(storeId, startDate, endDate)).thenReturn(
            new PayrollAggregation(BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("25.75"))
        );
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(25.75, result.getPayroll().getOvertime());
    }

    @Test
    void testCalculateStaffUtilization() {
        when(payrollRepository.getPayrollMetrics(storeId, startDate, endDate)).thenReturn(
            new PayrollAggregation(new BigDecimal("200.5"), BigDecimal.ZERO, BigDecimal.ZERO)
        );
        when(employmentRepository.countByStoreIdAndStatus(eq(storeId), any())).thenReturn(5L);
        StoreConfiguration config = new StoreConfiguration();
        config.setMaxHourPerWeek(40);
        when(storeConfigurationRepository.findByStoreId(storeId)).thenReturn(Optional.of(config));
        
        // Max possible = 5 * 40 * (31/7) = 885.714
        // Utilization = 200.5 / 885.714 = 22.64
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(22.64, result.getPayroll().getStaffUtilization());
    }

    @Test
    void testCalculateOpenShiftCount() {
        when(shiftRepository.countOpenShiftsByStoreAndDateRange(storeId, startDate, endDate)).thenReturn(10L);
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(10L, result.getScheduling().getOpenShiftCount());
    }

    @Test
    void testCalculateSwapCount() {
        when(shiftSwapRequestRepository.countSwapRequestsByStoreAndDateRange(storeId, startDate, endDate)).thenReturn(7L);
        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        assertEquals(7L, result.getScheduling().getSwapCount());
    }

    @Test
    void testHandlesZeroDivisionsSafely() {
        when(shiftAssignmentRepository.countTotalAssignmentsByStoreAndDateRange(storeId, startDate, endDate)).thenReturn(0L);
        when(shiftRepository.sumRequiredStaffByStoreAndDateRange(storeId, startDate, endDate)).thenReturn(0L);
        when(payrollRepository.getPayrollMetrics(storeId, startDate, endDate)).thenReturn(null);

        DashboardMetricsDTO result = dashboardService.getDashboardMetrics(storeId, startDate, endDate);

        assertEquals(0.0, result.getAttendance().getLateRate());
        assertEquals(0.0, result.getAttendance().getAbsentRate());
        assertEquals(0.0, result.getScheduling().getCoverage());
        assertEquals(0.0, result.getPayroll().getStaffUtilization());
    }
}
