package com.shiftsync.shift.service;

import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.*;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MinimumRestPolicyTest {
    private final LocalDate monday=LocalDate.of(2030,11,4);
    private Shift shift(LocalDate date,String from,String to){return Shift.builder().id(UUID.randomUUID()).shiftDate(date).startTime(LocalTime.parse(from)).endTime(LocalTime.parse(to)).build();}

    @ParameterizedTest
    @CsvSource({"00:59:59,8,false","01:00,8,true","01:00:01,8,true","00:00,0,true"})
    void restBoundaryIsExactAcrossMidnight(String nextStart,int hours,boolean expected){
        Shift prior=shift(monday,"09:00","17:00");
        assertEquals(expected,ShiftTimeRange.hasRequiredRest(List.of(prior),shift(monday.plusDays(1),nextStart,"09:00"),hours));
    }
    @Test void futureAssignmentMustHaveEnoughRestAfterTheNewShift(){
        Shift future=shift(monday.plusDays(1),"09:00","17:00");
        assertTrue(ShiftTimeRange.hasRequiredRest(List.of(future),shift(monday,"22:00","01:00"),8));
        assertFalse(ShiftTimeRange.hasRequiredRest(List.of(future),shift(monday,"22:00","01:01"),8));
    }
    @Test void zeroRestAllowsAdjacencyButNeverOverlap(){
        Shift prior=shift(monday,"09:00","17:00");
        assertTrue(ShiftTimeRange.hasRequiredRest(List.of(prior),shift(monday,"17:00","22:00"),0));
        assertFalse(ShiftTimeRange.hasRequiredRest(List.of(prior),shift(monday,"16:59","22:00"),0));
    }
    @Test void manualValidationUsesStrictestActiveStoreAndLoadsNextWeek(){
        UUID person=UUID.randomUUID(),a=UUID.randomUUID(),b=UUID.randomUUID();
        var shifts=mock(ShiftRepository.class);var employments=mock(EmploymentRepository.class);var configs=mock(StoreConfigurationRepository.class);
        when(employments.findByUserIdAndStatus(person,EmploymentStatus.ACTIVE)).thenReturn(List.of(Employment.builder().store(Store.builder().id(b).build()).contractType(ContractType.builder().maxWeeklyHours(48).build()).build()));
        when(configs.findByStoreIdIn(any())).thenReturn(List.of(StoreConfiguration.builder().storeId(a).minRestHours(0).build(),StoreConfiguration.builder().storeId(b).minRestHours(36).build()));
        Shift proposed=shift(monday.plusDays(6),"09:00","17:00");proposed.setStore(Store.builder().id(a).build());
        Shift future=shift(monday.plusDays(8),"04:00","10:00");
        when(shifts.findActiveShiftsForStaffInPeriod(eq(person),any(),any())).thenReturn(List.of(future));
        var validator=new ShiftValidationService(shifts,employments,configs);
        assertThrows(BusinessException.class,()->validator.validateNoOverlapAndWeeklyHours(proposed,person,null));
        verify(shifts).findActiveShiftsForStaffInPeriod(person,monday.minusDays(1),monday.plusDays(8));
        future.setStartTime(LocalTime.of(5,0));
        assertDoesNotThrow(()->validator.validateNoOverlapAndWeeklyHours(proposed,person,null));
    }
    @Test void automaticCandidateUsesStaffRestEvenIfTargetStoreIsLessStrict(){
        var data=new AutoScheduleService.StaffData();
        data.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(48).build()).build());
        data.setRequiredRestHours(12);data.setSkills(List.of());data.setBlackoutDates(List.of());data.setApprovedLeaveDates(Set.of());
        data.setAvailabilities(List.of(com.shiftsync.availability.entity.Availability.builder().dayOfWeek((short)2).startTime(LocalTime.of(4,0)).endTime(LocalTime.of(14,0)).build()));
        data.setCurrentSchedule(new ArrayList<>(List.of(shift(monday,"09:00","17:00"))));
        var service=new AutoScheduleService(null,null,null,null,null,null,null,null);
        Shift next=shift(monday.plusDays(1),"04:00","12:00");
        assertTrue(service.findValidCandidates(new AutoScheduleService.Slot(next,null),List.of(data),0).isEmpty());
        next.setStartTime(LocalTime.of(5,0));
        assertEquals(1,service.findValidCandidates(new AutoScheduleService.Slot(next,null),List.of(data),0).size());
    }
    @Test void restAboveTwentyFourHoursNeverProducesNegativeScore(){
        var data=new AutoScheduleService.StaffData();
        data.setEmployment(Employment.builder().user(com.shiftsync.auth.entity.User.builder().id(UUID.randomUUID()).build()).contractType(ContractType.builder().maxWeeklyHours(48).build()).build());
        data.setSkills(List.of());data.setCurrentSchedule(List.of(shift(monday,"09:00","17:00")));
        var config=com.shiftsync.store.entity.SchedulerConfiguration.builder().skillWeight(java.math.BigDecimal.ZERO).hourWeight(java.math.BigDecimal.ZERO).fairnessWeight(java.math.BigDecimal.ZERO).availabilityWeight(java.math.BigDecimal.ZERO).restTimeWeight(java.math.BigDecimal.ONE).build();
        var service=new AutoScheduleService(null,null,null,null,null,null,null,null);
        double score=service.calculateScore(data,new AutoScheduleService.Slot(shift(monday.plusDays(2),"06:00","14:00"),null),config,36);
        assertTrue(Double.isFinite(score));assertTrue(score>0&&score<=1);
    }
    @Test void configurationHasAnExplicitBoundRatherThanUnboundedDateQueries(){
        assertEquals(0,StaffRestPolicy.validatedHours(StoreConfiguration.builder().minRestHours(0).build()));
        assertEquals(168,StaffRestPolicy.validatedHours(StoreConfiguration.builder().minRestHours(168).build()));
        assertThrows(BusinessException.class,()->StaffRestPolicy.validatedHours(StoreConfiguration.builder().minRestHours(-1).build()));
        assertThrows(BusinessException.class,()->StaffRestPolicy.validatedHours(StoreConfiguration.builder().minRestHours(169).build()));
    }
}
