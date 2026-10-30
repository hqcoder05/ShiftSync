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
    @Test void sundayOvernightHoursAreChargedToPreviousWeeksOvertime() {
        var result=workPay(new String[][] {
                {"2030-11-03T09:00:00+07:00","2030-11-03T15:00:00+07:00"},
                {"2030-11-03T22:00:00+07:00","2030-11-04T06:00:00+07:00"}});
        assertEquals(0,BigDecimal.valueOf(6).compareTo(result.getOtHours()));
        // Actual calendar-week totals are Sunday 8h and next Monday 6h, both within the 8h test cap.
    }

    @Test void splittingPayrollInsideWeekDropsOvertime() {
        var first=new String[]{"2030-10-28T09:00:00+07:00","2030-10-28T15:00:00+07:00"};
        var second=new String[]{"2030-10-29T09:00:00+07:00","2030-10-29T13:00:00+07:00"};
        assertEquals(0,BigDecimal.valueOf(2).compareTo(workPay(new String[][]{first,second}).getOtHours()));
        assertEquals(0,BigDecimal.ZERO.compareTo(workPay(new String[][]{first}).getOtHours()));
        assertEquals(0,BigDecimal.ZERO.compareTo(workPay(new String[][]{second}).getOtHours()));
    }

    @Test void sameWeekNumberInDifferentYearsIsMergedForOvertime() {
        var first=LocalDate.of(2030,10,28);
        var second=LocalDate.of(2031,10,27);
        assertEquals(first.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR),
                second.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR));
        var result=workPay(new String[][] {
                {first+"T09:00:00+07:00",first+"T15:00:00+07:00"},
                {second+"T09:00:00+07:00",second+"T15:00:00+07:00"}});
        assertEquals(0,BigDecimal.valueOf(4).compareTo(result.getOtHours()));
    }

    private Payroll workPay(String[][] intervals) {
        var user=User.builder().id(UUID.randomUUID()).build();
        var employment=Employment.builder().user(user).hourlyRate(BigDecimal.valueOf(100))
                .contractType(ContractType.builder().maxWeeklyHours(8).otMultiplier(BigDecimal.valueOf(1.5)).build()).build();
        var assignments=new ArrayList<ShiftAssignment>();
        var attendance=new HashMap<UUID,com.shiftsync.attendance.entity.Attendance>();
        for(var interval:intervals) {
            var start=OffsetDateTime.parse(interval[0]);var end=OffsetDateTime.parse(interval[1]);
            var shift=Shift.builder().shiftDate(start.toLocalDate()).startTime(start.toLocalTime()).endTime(end.toLocalTime()).build();
            var assignment=ShiftAssignment.builder().id(UUID.randomUUID()).staff(user).shift(shift).build();
            assignments.add(assignment);
            attendance.put(assignment.getId(),com.shiftsync.attendance.entity.Attendance.builder()
                    .checkInTime(start).checkOutTime(end).shiftAssignment(assignment).build());
        }
        var period=PayrollPeriod.builder().startDate(assignments.get(0).getShift().getShiftDate())
                .endDate(OffsetDateTime.parse(intervals[intervals.length-1][1]).toLocalDate()).build();
        return ReflectionTestUtils.invokeMethod(mock(PayrollCalculationService.class,CALLS_REAL_METHODS),
                "calculateForEmployee",employment,period,assignments,List.of(),attendance,Map.of(),Map.of());
    }

    @Test void paidLeavePaysDayShiftButDropsOvernightShift() {
        assertEquals(0,BigDecimal.valueOf(800).compareTo(leavePay("08:00","16:00").getTotalAmount()));
        assertEquals(0,BigDecimal.ZERO.compareTo(leavePay("22:00","06:00").getTotalAmount()));
    }

    private Payroll leavePay(String start,String end) {
        var date=LocalDate.of(2030,11,4);
        var user=User.builder().id(UUID.randomUUID()).build();
        var employment=Employment.builder().user(user).hourlyRate(BigDecimal.valueOf(100))
                .contractType(ContractType.builder().maxWeeklyHours(48).otMultiplier(BigDecimal.valueOf(1.5)).build()).build();
        var shift=Shift.builder().shiftDate(date).startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).build();
        var assignment=ShiftAssignment.builder().id(UUID.randomUUID()).staff(user).shift(shift).build();
        var period=PayrollPeriod.builder().startDate(date).endDate(date.plusDays(1)).build();
        var leave=LeaveRequest.builder().status(LeaveStatus.APPROVED).leaveType(LeaveType.ANNUAL).startDate(date).endDate(date).build();
        return ReflectionTestUtils.invokeMethod(mock(PayrollCalculationService.class,CALLS_REAL_METHODS),
                "calculateForEmployee",employment,period,List.of(assignment),List.of(leave),Map.of(),Map.of(),Map.of());
    }

    @Test void payslipListDoesNotCheckPeriodStoreAgainstUrlStore() {
        var repository=mock(PayrollRepository.class);
        var controller=new PayrollController(mock(PayrollCalculationService.class),mock(PayrollPeriodRepository.class),
                repository,mock(PdfExportService.class),mock(ExcelExportService.class));
        var foreignPeriod=PayrollPeriod.builder().id(UUID.randomUUID()).store(Store.builder().id(UUID.randomUUID()).build())
                .status(PayrollPeriodStatus.DRAFT).build();
        var foreignPay=Payroll.builder().id(UUID.randomUUID()).payrollPeriod(foreignPeriod)
                .staff(User.builder().id(UUID.randomUUID()).fullName("Other store employee").build()).totalAmount(BigDecimal.valueOf(999)).build();
        when(repository.findByPayrollPeriodId(foreignPeriod.getId())).thenReturn(List.of(foreignPay));
        var result=controller.getPayslips(UUID.randomUUID(),foreignPeriod.getId());
        assertEquals("Other store employee",result.getBody().get(0).getStaffName());
        assertEquals(BigDecimal.valueOf(999),result.getBody().get(0).getTotalAmount());
    }
}
