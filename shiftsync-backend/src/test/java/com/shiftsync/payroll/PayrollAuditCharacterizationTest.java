package com.shiftsync.payroll;

import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.entity.*;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.*;
import com.shiftsync.payroll.controller.PayrollController;
import com.shiftsync.payroll.entity.*;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.*;
import com.shiftsync.payroll.service.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.store.entity.Store;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Passing tests document current defects, not desired behavior. */
class PayrollAuditCharacterizationTest {
    private PayrollCalculationService calculator(Employment employment, Store store) {
        employment.setId(UUID.randomUUID());
        employment.setStore(store);
        var service=mock(PayrollCalculationService.class,CALLS_REAL_METHODS);
        var resolver=mock(CompensationRevisionResolver.class);
        when(resolver.resolvePayTerms(any(),any(),any(),nullable(UUID.class),any())).thenReturn(
                new CompensationRevisionResolver.PayTerms(employment.getHourlyRate(),employment.getContractType().getMaxWeeklyHours(),employment.getContractType().getOtMultiplier()));
        ReflectionTestUtils.setField(service,"compensationRevisions",resolver);
        return service;
    }
    @Test void sundayOvernightHoursAreAllocatedToTheirActualWeeks() {
        var result=workPay(new String[][] {
                {"2030-11-03T09:00:00+07:00","2030-11-03T15:00:00+07:00"},
                {"2030-11-03T22:00:00+07:00","2030-11-04T06:00:00+07:00"}});
        assertEquals(0,BigDecimal.ZERO.compareTo(result.getOtHours()));
        // Actual calendar-week totals are Sunday 8h and next Monday 6h, both within the 8h test cap.
    }

    @Test void splittingPayrollInsideWeekKeepsEarlierHoursForOvertime() {
        var first=new String[]{"2030-10-28T09:00:00+07:00","2030-10-28T15:00:00+07:00"};
        var second=new String[]{"2030-10-29T09:00:00+07:00","2030-10-29T13:00:00+07:00"};
        assertEquals(0,BigDecimal.valueOf(2).compareTo(workPay(new String[][]{first,second}).getOtHours()));
        assertEquals(0,BigDecimal.ZERO.compareTo(workPay(new String[][]{first}).getOtHours()));
        var secondPeriod=workPay(new String[][]{first,second},LocalDate.of(2030,10,29));
        assertEquals(0,BigDecimal.valueOf(2).compareTo(secondPeriod.getOtHours()));
        assertEquals(0,BigDecimal.valueOf(4).compareTo(secondPeriod.getTotalHours()));
    }

    @Test void sameWeekNumberInDifferentYearsIsNotMerged() {
        var first=LocalDate.of(2030,10,28);
        var second=LocalDate.of(2031,10,27);
        assertEquals(first.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR),
                second.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR));
        var result=workPay(new String[][] {
                {first+"T09:00:00+07:00",first+"T15:00:00+07:00"},
                {second+"T09:00:00+07:00",second+"T15:00:00+07:00"}});
        assertEquals(0,BigDecimal.ZERO.compareTo(result.getOtHours()));
    }

    private Payroll workPay(String[][] intervals) {
        return workPay(intervals,OffsetDateTime.parse(intervals[0][0]).toLocalDate());
    }

    private Payroll workPay(String[][] intervals,LocalDate periodStart) {
        var user=User.builder().id(UUID.randomUUID()).build();
        var employment=Employment.builder().user(user).hourlyRate(BigDecimal.valueOf(100)).joinedDate(LocalDate.of(2020,1,1))
                .contractType(ContractType.builder().maxWeeklyHours(8).otMultiplier(BigDecimal.valueOf(1.5)).build()).build();
        var store=Store.builder().id(UUID.randomUUID()).build();
        var assignments=new ArrayList<ShiftAssignment>();
        var attendance=new HashMap<UUID,com.shiftsync.attendance.entity.Attendance>();
        for(var interval:intervals) {
            var start=OffsetDateTime.parse(interval[0]);var end=OffsetDateTime.parse(interval[1]);
            var shift=Shift.builder().store(store).shiftDate(start.toLocalDate()).startTime(start.toLocalTime()).endTime(end.toLocalTime()).build();
            var assignment=ShiftAssignment.builder().id(UUID.randomUUID()).staff(user).shift(shift).build();
            assignments.add(assignment);
            attendance.put(assignment.getId(),com.shiftsync.attendance.entity.Attendance.builder()
                    .checkInTime(start).checkOutTime(end).shiftAssignment(assignment).build());
        }
        var period=PayrollPeriod.builder().startDate(periodStart)
                .endDate(OffsetDateTime.parse(intervals[intervals.length-1][1]).toLocalDate()).build();
        return ReflectionTestUtils.invokeMethod(calculator(employment,store),
                "calculateForEmployee",employment,List.of(employment),period,assignments,List.of(),attendance,Map.of(),Map.of());
    }

    @Test void paidLeavePaysOnlyTheCoveredPartOfAnOvernightShift() {
        assertEquals(0,BigDecimal.valueOf(800).compareTo(leavePay("08:00","16:00").getTotalAmount()));
        assertEquals(0,BigDecimal.valueOf(200).compareTo(leavePay("22:00","06:00").getTotalAmount()));
    }

    private Payroll leavePay(String start,String end) {
        var date=LocalDate.of(2030,11,4);
        var user=User.builder().id(UUID.randomUUID()).build();
        var employment=Employment.builder().user(user).hourlyRate(BigDecimal.valueOf(100)).joinedDate(LocalDate.of(2020,1,1))
                .contractType(ContractType.builder().maxWeeklyHours(48).otMultiplier(BigDecimal.valueOf(1.5)).build()).build();
        var store=Store.builder().id(UUID.randomUUID()).build();
        var shift=Shift.builder().store(store).shiftDate(date).startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).build();
        var assignment=ShiftAssignment.builder().id(UUID.randomUUID()).staff(user).shift(shift).build();
        var period=PayrollPeriod.builder().startDate(date).endDate(date.plusDays(1)).build();
        var leave=LeaveRequest.builder().status(LeaveStatus.APPROVED).leaveType(LeaveType.ANNUAL).startDate(date).endDate(date).build();
        return ReflectionTestUtils.invokeMethod(calculator(employment,store),
                "calculateForEmployee",employment,List.of(employment),period,List.of(assignment),List.of(leave),Map.of(),Map.of(),Map.of());
    }

    @Test void payslipListRejectsPeriodFromAnotherStore() {
        var repository=mock(PayrollRepository.class);
        var periods=mock(PayrollPeriodRepository.class);
        var controller=new PayrollController(mock(PayrollCalculationService.class),periods,
                repository,mock(PdfExportService.class),mock(ExcelExportService.class));
        var requestedStore=UUID.randomUUID();
        var foreignPeriod=PayrollPeriod.builder().id(UUID.randomUUID()).store(Store.builder().id(UUID.randomUUID()).build())
                .status(PayrollPeriodStatus.DRAFT).build();
        var foreignPay=Payroll.builder().id(UUID.randomUUID()).payrollPeriod(foreignPeriod)
                .staff(User.builder().id(UUID.randomUUID()).fullName("Other store employee").build()).totalAmount(BigDecimal.valueOf(999)).build();
        when(periods.findByIdAndStoreId(foreignPeriod.getId(),requestedStore)).thenReturn(Optional.empty());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                () -> controller.getPayslips(requestedStore,foreignPeriod.getId()));
        verify(periods).findByIdAndStoreId(foreignPeriod.getId(),requestedStore);
        verifyNoInteractions(repository);
    }
}
