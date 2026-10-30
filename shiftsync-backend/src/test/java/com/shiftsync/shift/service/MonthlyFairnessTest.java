package com.shiftsync.shift.service;

import com.shiftsync.employment.entity.*;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.store.entity.SchedulerConfiguration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.time.*;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class MonthlyFairnessTest {
    private Shift shift(LocalDate date,String start,String end){return Shift.builder().shiftDate(date).startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).build();}
    private AutoScheduleService.StaffData person(int weekly){
        var person=new AutoScheduleService.StaffData();
        person.setEmployment(Employment.builder().user(com.shiftsync.auth.entity.User.builder().id(UUID.randomUUID()).build()).contractType(ContractType.builder().maxWeeklyHours(weekly).build()).build());
        person.setCalendarMonthlyHours(new HashMap<>());person.setCurrentSchedule(new ArrayList<>());person.setSkills(List.of());return person;
    }
    private double score(AutoScheduleService.StaffData person,Shift shift){
        var config=SchedulerConfiguration.builder().fairnessWeight(BigDecimal.ONE).skillWeight(BigDecimal.ZERO).hourWeight(BigDecimal.ZERO).restTimeWeight(BigDecimal.ZERO).availabilityWeight(BigDecimal.ZERO).build();
        return new AutoScheduleService(null,null,null,null,null,null,null,null).calculateScore(person,new AutoScheduleService.Slot(shift,null),config,8);
    }
    @Test void overnightHoursSplitAtMonthBoundary(){
        Shift night=shift(LocalDate.of(2030,10,31),"22:00","06:00");
        assertEquals(2,ShiftTimeRange.hoursInMonth(night,YearMonth.of(2030,10)));
        assertEquals(6,ShiftTimeRange.hoursInMonth(night,YearMonth.of(2030,11)));
        assertEquals(0,ShiftTimeRange.hoursInMonth(night,YearMonth.of(2030,12)));
    }
    @Test void midnightEndDoesNotConsumeNextMonth(){
        Shift night=shift(LocalDate.of(2030,12,31),"22:00","00:00");
        assertEquals(2,ShiftTimeRange.hoursInMonth(night,YearMonth.of(2030,12)));
        assertEquals(0,ShiftTimeRange.hoursInMonth(night,YearMonth.of(2031,1)));
    }
    @ParameterizedTest @ValueSource(strings={"2031-02-15","2032-02-15","2030-04-15","2030-10-15"})
    void capacityUsesCalendarMonthLengthIncludingLeapYear(String date){
        var person=person(48);LocalDate day=LocalDate.parse(date);
        person.getCalendarMonthlyHours().put(YearMonth.from(day),60.0);
        assertEquals(1-60/(48*day.lengthOfMonth()/7.0),score(person,shift(day,"09:00","17:00")),1e-10);
    }
    @Test void anotherMonthNeverInflatesTheSlotMonthLoad(){
        var person=person(48);person.getCalendarMonthlyHours().put(YearMonth.of(2030,10),160.0);
        assertEquals(1,score(person,shift(LocalDate.of(2030,11,3),"09:00","17:00")),1e-10);
        assertTrue(score(person,shift(LocalDate.of(2030,10,30),"09:00","17:00"))<0.3);
    }
    @Test void equalContractUtilizationHasEqualFairnessScore(){
        var partTime=person(24);var fullTime=person(48);var month=YearMonth.of(2030,11);
        partTime.getCalendarMonthlyHours().put(month,40.0);fullTime.getCalendarMonthlyHours().put(month,80.0);
        Shift day=shift(month.atDay(3),"09:00","17:00");assertEquals(score(partTime,day),score(fullTime,day),1e-10);
    }
    @Test void assignmentAndRepairUpdatesPreserveBothMonthBalances(){
        var person=person(48);Shift night=shift(LocalDate.of(2030,10,31),"22:00","06:00");
        person.updateMonthlyHours(night,1);assertEquals(2,person.monthlyHours(LocalDate.of(2030,10,1)));assertEquals(6,person.monthlyHours(LocalDate.of(2030,11,1)));
        person.updateMonthlyHours(night,-1);Shift replacement=shift(LocalDate.of(2030,11,3),"09:00","17:00");person.updateMonthlyHours(replacement,1);
        assertEquals(0,person.monthlyHours(LocalDate.of(2030,10,1)));assertEquals(8,person.monthlyHours(LocalDate.of(2030,11,1)));
        assertEquals(8,person.getMonthlyAssignedHours());
    }
    @Test void crossMonthScoreWeightsLoadsByHoursActuallyWorkedInEachMonth(){
        var person=person(48);person.getCalendarMonthlyHours().put(YearMonth.of(2030,10),100.0);person.getCalendarMonthlyHours().put(YearMonth.of(2030,11),20.0);
        double expected=1-(2.0/8*100/(48*31/7.0)+6.0/8*20/(48*30/7.0));
        assertEquals(expected,score(person,shift(LocalDate.of(2030,10,31),"22:00","06:00")),1e-10);
    }
}
