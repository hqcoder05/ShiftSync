package com.shiftsync.payroll;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.entity.*;
import com.shiftsync.payroll.entity.*;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shift.entity.*;
import com.shiftsync.skill.entity.Skill;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Passing characterizations document calculation defects, not acceptance behavior. */
class PayrollCalendarAuditTest {
    private final User user=User.builder().id(UUID.randomUUID()).build();
    private final PayrollCalculationService service=mock(PayrollCalculationService.class,CALLS_REAL_METHODS);
    private final com.shiftsync.store.entity.Store store=com.shiftsync.store.entity.Store.builder().id(UUID.randomUUID()).build();

    private void mockTerms(Employment emp, Map<UUID,Skill> skills) {
        emp.setId(UUID.randomUUID());
        emp.setStore(store);
        var resolver=mock(com.shiftsync.payroll.service.CompensationRevisionResolver.class);
        when(resolver.resolvePayTerms(any(),any(),any(),nullable(UUID.class),any())).thenAnswer(call -> {
            UUID skillId=call.getArgument(3);
            BigDecimal rate=skillId == null ? emp.getHourlyRate() : skills.get(skillId).getHourlyRate();
            return new com.shiftsync.payroll.service.CompensationRevisionResolver.PayTerms(rate,emp.getContractType().getMaxWeeklyHours(),emp.getContractType().getOtMultiplier());
        });
        ReflectionTestUtils.setField(service,"compensationRevisions",resolver);
    }

    private Payroll calculate(int cap,List<ShiftAssignment> assignments,Map<UUID,Attendance> attendance,
                              Map<LocalDate,BigDecimal> holidays,Map<UUID,Skill> skills) {
        var emp=Employment.builder().user(user).hourlyRate(BigDecimal.TEN).joinedDate(LocalDate.of(2020,1,1))
                .contractType(ContractType.builder().maxWeeklyHours(cap).otMultiplier(new BigDecimal("1.5")).build()).build();
        mockTerms(emp,skills);
        var date=assignments.get(0).getShift().getShiftDate();
        var period=PayrollPeriod.builder().startDate(date).endDate(date.plusDays(1)).build();
        return ReflectionTestUtils.invokeMethod(service,"calculateForEmployee",emp,List.of(emp),period,assignments,List.of(),attendance,holidays,skills);
    }
    private ShiftAssignment assignment(LocalDate date,LocalTime start,LocalTime end,UUID skill) {
        return ShiftAssignment.builder().id(UUID.randomUUID()).staff(user).requiredSkillId(skill)
                .shift(Shift.builder().store(store).shiftDate(date).startTime(start).endTime(end).build()).build();
    }
    private Attendance attendance(ShiftAssignment assignment,OffsetDateTime start,OffsetDateTime end) {
        return Attendance.builder().shiftAssignment(assignment).checkInTime(start).checkOutTime(end).build();
    }
    private static void amount(String expected,BigDecimal actual) {
        assertEquals(0,new BigDecimal(expected).compareTo(actual));
    }

    @Test void sameAttendanceInstantsPaySameHolidayAmountsWhenOffsetsChange() {
        var date=LocalDate.of(2030,1,1);
        var assignment=assignment(date,LocalTime.MIDNIGHT,LocalTime.of(8,0),null);
        var start=date.atStartOfDay().atOffset(ZoneOffset.ofHours(7));
        var end=start.plusHours(8);
        var local=attendance(assignment,start,end);
        var utc=attendance(assignment,start.withOffsetSameInstant(ZoneOffset.UTC),end.withOffsetSameInstant(ZoneOffset.UTC));
        assertEquals(local.getCheckInTime().toInstant(),utc.getCheckInTime().toInstant());
        assertEquals(local.getCheckOutTime().toInstant(),utc.getCheckOutTime().toInstant());
        var holidays=Map.of(date,new BigDecimal("3"));
        var localPay=calculate(48,List.of(assignment),Map.of(assignment.getId(),local),holidays,Map.of());
        var utcPay=calculate(48,List.of(assignment),Map.of(assignment.getId(),utc),holidays,Map.of());
        amount("8",localPay.getTotalHours());amount("8",utcPay.getTotalHours());
        amount("8",localPay.getHolidayHours());amount("8",utcPay.getHolidayHours());
        amount("240",localPay.getTotalAmount());amount("240",utcPay.getTotalAmount());
    }

    @Test void permutingSameDayAssignmentsDoesNotChangeOvertimeAmount() {
        var date=LocalDate.of(2030,11,4);
        var low=UUID.randomUUID();var high=UUID.randomUUID();
        var early=assignment(date,LocalTime.MIDNIGHT,LocalTime.of(6,0),low);
        var late=assignment(date,LocalTime.of(18,0),LocalTime.MIDNIGHT,high);
        var start=date.atStartOfDay().atOffset(ZoneOffset.ofHours(7));
        var attendance=Map.of(early.getId(),attendance(early,start,start.plusHours(6)),
                late.getId(),attendance(late,start.plusHours(18),start.plusHours(24)));
        var skills=Map.of(low,Skill.builder().id(low).hourlyRate(BigDecimal.TEN).build(),
                high,Skill.builder().id(high).hourlyRate(new BigDecimal("20")).build());
        // A small 8h weekly cap deliberately exercises the overtime boundary.
        // Work intervals have twelve hours of rest; only collection order changes.
        var chronological=calculate(8,List.of(early,late),attendance,Map.of(),skills);
        var reversed=calculate(8,List.of(late,early),attendance,Map.of(),skills);
        amount("12",chronological.getTotalHours());amount("12",reversed.getTotalHours());
        amount("4",chronological.getOtHours());amount("4",reversed.getOtHours());
        amount("220",chronological.getTotalAmount());amount("220",reversed.getTotalAmount());
    }

    @Test void simultaneousAttendanceUsesStableAssignmentOrderForOvertime() {
        var date=LocalDate.of(2030,11,4);
        var low=UUID.randomUUID();var high=UUID.randomUUID();
        var first=assignment(date,LocalTime.of(9,0),LocalTime.of(17,0),low);
        var second=assignment(date,LocalTime.of(9,0),LocalTime.of(17,0),high);
        var start=date.atTime(9,0).atOffset(ZoneOffset.ofHours(7));
        var attendance=Map.of(first.getId(),attendance(first,start,start.plusHours(8)),
                second.getId(),attendance(second,start,start.plusHours(8)));
        var skills=Map.of(low,Skill.builder().id(low).hourlyRate(BigDecimal.TEN).build(),
                high,Skill.builder().id(high).hourlyRate(new BigDecimal("20")).build());
        var forward=calculate(8,List.of(first,second),attendance,Map.of(),skills);
        var reversed=calculate(8,List.of(second,first),attendance,Map.of(),skills);
        amount("16",forward.getTotalHours());amount("8",forward.getOtHours());
        assertEquals(0,forward.getTotalAmount().compareTo(reversed.getTotalAmount()));
        assertEquals(0,forward.getOtAmount().compareTo(reversed.getOtAmount()));
    }

    @Test void approvedPaidLeaveRecoversAllRecordedRemovedAssignments() {
        var date=LocalDate.of(2030,11,4);
        var early=assignment(date,LocalTime.MIDNIGHT,LocalTime.of(4,0),null);
        var late=assignment(date,LocalTime.of(15,0),LocalTime.of(19,0),null);
        early.setDeleted(true);late.setDeleted(true);
        var repository=mock(com.shiftsync.shift.repository.ShiftAssignmentRepository.class);
        var leaveId=UUID.randomUUID();
        when(repository.findRemovedForLeave(leaveId,user.getId(),store.getId(),date.minusDays(1),date)).thenReturn(List.of(early,late));
        ReflectionTestUtils.setField(service,"shiftAssignmentRepository",repository);
        var emp=Employment.builder().user(user).hourlyRate(BigDecimal.TEN).joinedDate(LocalDate.of(2020,1,1))
                .contractType(ContractType.builder().maxWeeklyHours(48).otMultiplier(new BigDecimal("1.5")).build()).build();
        mockTerms(emp,Map.of());
        var period=PayrollPeriod.builder().store(store).startDate(date).endDate(date).build();
        var leave=com.shiftsync.leave.entity.LeaveRequest.builder()
                .id(leaveId).leaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL)
                .status(com.shiftsync.leave.enums.LeaveStatus.APPROVED).startDate(date).endDate(date).build();
        Payroll pay=ReflectionTestUtils.invokeMethod(service,"calculateForEmployee",emp,List.of(emp),period,List.of(),
                List.of(leave),Map.of(),Map.of(),Map.of());
        assertEquals(8,Duration.between(early.getShift().getStartTime(),early.getShift().getEndTime()).toHours()
                +Duration.between(late.getShift().getStartTime(),late.getShift().getEndTime()).toHours());
        amount("8",pay.getTotalHours());amount("80",pay.getTotalAmount());
        verify(repository).findRemovedForLeave(leaveId,user.getId(),store.getId(),date.minusDays(1),date);
    }
}
