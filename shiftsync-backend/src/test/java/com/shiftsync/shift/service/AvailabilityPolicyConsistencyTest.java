package com.shiftsync.shift.service;

import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.entity.*;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.skill.repository.*;
import com.shiftsync.store.entity.*;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AvailabilityPolicyConsistencyTest {
    @ParameterizedTest
    @CsvSource({
        "1,09:00,17:00,09:00,17:00,0,true",
        "1,09:00,17:00,08:30,17:30,0,false",
        "1,09:00,17:00,08:30,17:30,30,true",
        "1,09:00,17:00,08:29,17:30,30,false",
        "1,09:00,17:00,22:00,06:00,0,false",
        "1,22:00,06:00,22:00,06:00,0,true",
        "0,22:00,06:00,02:00,06:00,0,true",
        "0,22:00,06:00,02:00,06:01,0,false",
        "0,22:00,06:00,02:00,06:01,1,true",
        "2,00:00,06:00,23:45,06:00,15,true",
        "2,00:00,06:00,23:44,06:00,15,false"
    })
    void autoManualAndEligibilityUseTheSamePolicy(int dow,String availableStart,String availableEnd,
            String shiftStart,String shiftEnd,int tolerance,boolean expected) {
        UUID person=UUID.randomUUID(),store=UUID.randomUUID();
        var slots=List.of(Availability.builder().dayOfWeek((short)dow).startTime(LocalTime.parse(availableStart)).endTime(LocalTime.parse(availableEnd)).build());
        var shift=Shift.builder().id(UUID.randomUUID()).store(Store.builder().id(store).build()).shiftDate(LocalDate.of(2030,11,4))
                .startTime(LocalTime.parse(shiftStart)).endTime(LocalTime.parse(shiftEnd)).build();
        var availability=mock(AvailabilityRepository.class);
        when(availability.findByUserId(person)).thenReturn(slots);
        var configs=mock(StoreConfigurationRepository.class);
        when(configs.findByStoreId(store)).thenReturn(Optional.of(StoreConfiguration.builder().availabilityToleranceMinutes(tolerance).build()));
        var validator=new ShiftAssignmentValidator(availability,mock(BlackoutDateRepository.class),mock(ShiftAssignmentRepository.class),
                mock(StaffSkillRepository.class),mock(SkillRepository.class),mock(ShiftValidationService.class),null,configs);
        assertEquals(expected,validator.isEligible(shift,person));
        if(expected) {
            assertDoesNotThrow(()->validator.validateEligibility(shift,person));
            assertDoesNotThrow(()->validator.validateAvailabilityAndTimeOff(shift,person));
        } else {
            assertThrows(BusinessException.class,()->validator.validateEligibility(shift,person));
            assertThrows(BusinessException.class,()->validator.validateAvailabilityAndTimeOff(shift,person));
        }

        var data=new AutoScheduleService.StaffData();
        data.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(48).build()).build());
        data.setAvailabilities(slots); data.setAvailabilityToleranceMinutes(tolerance);
        data.setBlackoutDates(List.of());data.setApprovedLeaveDates(Set.of());data.setSkills(List.of());data.setCurrentSchedule(new ArrayList<>());
        var scheduler=new AutoScheduleService(null,null,null,null,null,null,null,null);
        assertEquals(expected,!scheduler.findValidCandidates(new AutoScheduleService.Slot(shift,null),List.of(data),0).isEmpty());
    }
}
