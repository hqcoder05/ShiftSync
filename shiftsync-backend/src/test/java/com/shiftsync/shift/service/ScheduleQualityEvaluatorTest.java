package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.shift.dto.RequirementCoverageDTO;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.AssignmentSource;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ScheduleQualityEvaluatorTest {
    private final YearMonth month = YearMonth.of(2030,11);
    private Shift shift(String date, String start, String end) {
        return Shift.builder().id(UUID.randomUUID()).shiftDate(LocalDate.parse(date)).startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).build();
    }
    private RequirementCoverageDTO coverage(Shift shift,int required,int assigned) {
        return RequirementCoverageDTO.builder().shiftId(shift.getId()).shiftDate(shift.getShiftDate())
                .startTime(shift.getStartTime()).endTime(shift.getEndTime()).requiredCount(required).assignedCount(assigned).build();
    }
    private ShiftAssignment assignment(Shift shift,UUID staff,UUID skill) {
        return ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(User.builder().id(staff).build()).requiredSkillId(skill).source(AssignmentSource.AUTO).build();
    }
    @Test void coverageUsesMatchedRolesAndActualHoursInsteadOfCountingAssignments() {
        var shortShift=shift("2030-11-03","09:00","11:00");var longShift=shift("2030-11-03","22:00","06:00");
        var result=ScheduleQualityEvaluator.evaluate(List.of(coverage(shortShift,1,1),coverage(longShift,2,1)),List.of(),List.of(),List.of(),month,month);
        assertEquals(3,result.getDemandSlots());assertEquals(2,result.getCoveredSlots());assertEquals(1,result.getUnfilledSlots());
        assertEquals(18,result.getDemandHours());assertEquals(10,result.getCoveredHours());assertEquals(8,result.getUnfilledHours());
        var excess=ScheduleQualityEvaluator.evaluate(List.of(coverage(shortShift,1,3)),List.of(),List.of(),List.of(),month,month);
        assertEquals(1,excess.getCoveredSlots());assertEquals(2,excess.getCoveredHours());
    }
    @Test void proportionalFullAndPartTimeLoadsHaveZeroSpreadDespiteDifferentHours() {
        var a=new ScheduleQualityEvaluator.Person(UUID.randomUUID(),40,List.of(shift("2030-11-03","09:00","17:00")));
        var b=new ScheduleQualityEvaluator.Person(UUID.randomUUID(),20,List.of(shift("2030-11-03","09:00","13:00")));
        var result=ScheduleQualityEvaluator.evaluate(List.of(),List.of(a,b),List.of(),List.of(),month,month).getMonthlyLoads().getFirst();
        assertEquals(2,result.getStaffCount());assertEquals(12,result.getScheduledHours());assertEquals(0,result.getNormalizedLoadStdDev(),1e-12);
    }
    @Test void unassignedActiveStaffAreIncludedAndOverCapacityRatiosAreNotClamped() {
        var people=List.of(new ScheduleQualityEvaluator.Person(UUID.randomUUID(),1,List.of(shift("2030-11-03","09:00","17:00"))),
                new ScheduleQualityEvaluator.Person(UUID.randomUUID(),1,List.of()));
        var result=ScheduleQualityEvaluator.evaluate(List.of(),people,List.of(),List.of(),month,month).getMonthlyLoads().getFirst();
        assertEquals(2,result.getStaffCount());assertEquals(8/(30/7.0)/2,result.getNormalizedLoadStdDev(),1e-12);
        assertTrue(result.getStaffLoads().stream().anyMatch(load->load.getLoadRatio()>1));
    }
    @Test void midnightCarryoverIsSplitBetweenCalendarMonthsAndIncludesOtherStoreHistory() {
        var carry=shift("2030-10-31","22:00","06:00");var future=shift("2030-11-10","09:00","13:00");
        var person=new ScheduleQualityEvaluator.Person(UUID.randomUUID(),40,List.of(carry,future));
        var result=ScheduleQualityEvaluator.evaluate(List.of(),List.of(person),List.of(),List.of(),month.minusMonths(1),month);
        assertEquals(2,result.getMonthlyLoads().get(0).getScheduledHours());assertEquals(10,result.getMonthlyLoads().get(1).getScheduledHours());
        assertEquals(40*31/7.0,result.getMonthlyLoads().get(0).getStaffLoads().getFirst().getCapacityHours(),1e-12);
    }
    @Test void churnIgnoresAssignmentIdsButDetectsRoleAndPlacementChanges() {
        UUID staff=UUID.randomUUID(),skill=UUID.randomUUID();var shift=shift("2030-11-03","09:00","17:00");
        var old=assignment(shift,staff,skill);var same=assignment(shift,staff,skill);
        var kept=ScheduleQualityEvaluator.evaluate(List.of(),List.of(),List.of(old),List.of(same),month,month);
        assertEquals(1,kept.getAutoAssignmentsKept());assertEquals(0,kept.getAutoAssignmentsAdded());assertEquals(0,kept.getAutoAssignmentsRemoved());
        same.setZone(StoreZone.builder().id(UUID.randomUUID()).build());
        var moved=ScheduleQualityEvaluator.evaluate(List.of(),List.of(),List.of(old),List.of(same),month,month);
        assertEquals(0,moved.getAutoAssignmentsKept());assertEquals(1,moved.getAutoAssignmentsAdded());assertEquals(1,moved.getAutoAssignmentsRemoved());
        same.setZone(null);same.setRequiredSkillId(UUID.randomUUID());
        assertEquals(0,ScheduleQualityEvaluator.evaluate(List.of(),List.of(),List.of(old),List.of(same),month,month).getAutoAssignmentsKept());
    }
    @Test void outputIsIndependentOfSolverTraversalAndExcludesManualOrDeletedChurn() {
        var shift=shift("2030-11-03","09:00","17:00");var a=assignment(shift,UUID.randomUUID(),UUID.randomUUID());var b=assignment(shift,UUID.randomUUID(),UUID.randomUUID());
        var manual=assignment(shift,UUID.randomUUID(),null);manual.setSource(AssignmentSource.MANUAL);
        var deleted=assignment(shift,UUID.randomUUID(),null);deleted.setDeleted(true);
        var people=List.of(new ScheduleQualityEvaluator.Person(a.getStaff().getId(),40,List.of(shift)),new ScheduleQualityEvaluator.Person(b.getStaff().getId(),20,List.of()));
        var first=ScheduleQualityEvaluator.evaluate(List.of(coverage(shift,2,1)),people,List.of(a,manual,deleted),List.of(a,b),month,month);
        var reversed=new ArrayList<>(people);Collections.reverse(reversed);
        var second=ScheduleQualityEvaluator.evaluate(List.of(coverage(shift,2,1)),reversed,List.of(deleted,manual,a),List.of(b,a),month,month);
        assertEquals(first,second);assertEquals(1,first.getAutoAssignmentsKept());assertEquals(1,first.getAutoAssignmentsAdded());assertEquals(0,first.getAutoAssignmentsRemoved());
    }
    @Test void emptyDemandIsDefinedAndInvalidCapacityCannotProduceNaN() {
        var empty=ScheduleQualityEvaluator.evaluate(List.of(),List.of(),List.of(),List.of(),month,month);
        assertEquals(0,empty.getUnfilledHours());assertEquals(0,empty.getMonthlyLoads().getFirst().getNormalizedLoadStdDev());
        for(double limit:new double[]{0,-1,Double.NaN,Double.POSITIVE_INFINITY}) assertThrows(IllegalArgumentException.class,()->
                ScheduleQualityEvaluator.evaluate(List.of(),List.of(new ScheduleQualityEvaluator.Person(UUID.randomUUID(),limit,List.of())),List.of(),List.of(),month,month));
    }
}
