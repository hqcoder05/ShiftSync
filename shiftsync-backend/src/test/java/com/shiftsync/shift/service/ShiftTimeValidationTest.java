package com.shiftsync.shift.service;

import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.repository.ShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ShiftTimeValidationTest {
    private final ShiftRepository shifts = mock(ShiftRepository.class);
    private final EmploymentRepository employments = mock(EmploymentRepository.class);
    private final com.shiftsync.store.repository.StoreConfigurationRepository configs=mock(com.shiftsync.store.repository.StoreConfigurationRepository.class);
    private final ShiftValidationService validator = new ShiftValidationService(shifts, employments,configs);
    private final UUID storeId=UUID.randomUUID();
    private final UUID person = UUID.randomUUID();
    private final LocalDate monday = LocalDate.of(2030, 11, 4);
    private final ContractType contract = ContractType.builder().maxWeeklyHours(48).build();

    @BeforeEach void setup() {
        when(configs.findByStoreIdIn(any())).thenReturn(List.of(com.shiftsync.store.entity.StoreConfiguration.builder().storeId(storeId).minRestHours(0).build()));
        when(employments.findByUserIdAndStatus(person, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(Employment.builder().contractType(contract).build()));
    }
    private Shift shift(LocalDate date, int from, int to) {
        return Shift.builder().id(UUID.randomUUID()).store(com.shiftsync.store.entity.Store.builder().id(storeId).build()).shiftDate(date)
                .startTime(LocalTime.of(from, 0)).endTime(LocalTime.of(to, 0)).build();
    }
    private void schedule(Shift... items) {
        when(shifts.findActiveShiftsForStaffInPeriod(eq(person), any(), any())).thenReturn(List.of(items));
    }
    @Test void rejectsOverlapWithPreviousSundayNight() {
        schedule(shift(monday.minusDays(1), 22, 6));
        assertThrows(BusinessException.class, () -> validator.validateNoOverlapAndWeeklyHours(shift(monday, 5, 9), person, null));
        verify(shifts).findActiveShiftsForStaffInPeriod(person, monday.minusDays(1), monday.plusDays(6));
    }
    @Test void rejectsOverlapWithTheMorningAfterNewNightShift() {
        schedule(shift(monday.plusDays(1), 5, 9));
        assertThrows(BusinessException.class, () -> validator.validateNoOverlapAndWeeklyHours(shift(monday, 22, 6), person, null));
    }
    @Test void permitsAdjacentShiftsWithoutOverlap() {
        schedule(shift(monday.minusDays(1), 22, 6));
        assertDoesNotThrow(() -> validator.validateNoOverlapAndWeeklyHours(shift(monday, 6, 10), person, null));
    }
    @Test void overnightHoursCannotSubtractFromWeeklyTotal() {
        contract.setMaxWeeklyHours(10);
        schedule(shift(monday, 22, 6));
        assertThrows(BusinessException.class, () -> validator.validateNoOverlapAndWeeklyHours(shift(monday.plusDays(2), 9, 12), person, null));
    }
    @Test void priorSundayCarryoverCountsInMondayWeek() {
        contract.setMaxWeeklyHours(8);
        schedule(shift(monday.minusDays(1), 22, 6));
        assertThrows(BusinessException.class, () -> validator.validateNoOverlapAndWeeklyHours(shift(monday.plusDays(1), 9, 12), person, null));
    }
    @Test void newSundayNightMustFitFollowingWeekToo() {
        contract.setMaxWeeklyHours(8);
        schedule(shift(monday.plusWeeks(1).plusDays(1), 9, 12));
        assertThrows(BusinessException.class, () -> validator.validateNoOverlapAndWeeklyHours(shift(monday.plusDays(6), 22, 6), person, null));
        verify(shifts).findActiveShiftsForStaffInPeriod(person, monday.minusDays(1), monday.plusDays(13));
    }
    @Test void splitHoursPermitSundayNightWhenEachWeekFits() {
        contract.setMaxWeeklyHours(8);
        schedule(shift(monday, 9, 15), shift(monday.plusDays(8), 9, 11));
        assertDoesNotThrow(() -> validator.validateNoOverlapAndWeeklyHours(shift(monday.plusDays(6), 22, 6), person, null));
    }
    @Test void excludedSwapShiftNeitherConflictsNorConsumesHours() {
        contract.setMaxWeeklyHours(8);
        Shift old = shift(monday, 9, 17); schedule(old);
        assertDoesNotThrow(() -> validator.validateNoOverlapAndWeeklyHours(shift(monday, 9, 17), person, old.getId()));
    }
    @Test void manualValidationChecksAllContractsInsteadOfTheFirstRecord() {
        schedule(shift(monday,9,15));
        var loose=Employment.builder().contractType(ContractType.builder().maxWeeklyHours(48).build()).build();
        var strict=Employment.builder().contractType(ContractType.builder().maxWeeklyHours(8).build()).build();
        Shift addition=shift(monday.plusDays(1),9,12);
        when(employments.findByUserIdAndStatus(person,EmploymentStatus.ACTIVE)).thenReturn(List.of(loose,strict));
        assertThrows(BusinessException.class,()->validator.validateNoOverlapAndWeeklyHours(addition,person,null));
        when(employments.findByUserIdAndStatus(person,EmploymentStatus.ACTIVE)).thenReturn(List.of(strict,loose));
        assertThrows(BusinessException.class,()->validator.validateNoOverlapAndWeeklyHours(addition,person,null));
        addition.setEndTime(LocalTime.of(11,0));
        assertDoesNotThrow(()->validator.validateNoOverlapAndWeeklyHours(addition,person,null));
    }
    @Test void midnightEndBelongsOnlyToPrecedingWeek() {
        Shift night = shift(monday.minusDays(1), 22, 0);
        assertEquals(2, ShiftTimeRange.hoursInWeek(night, monday.minusDays(1)));
        assertEquals(0, ShiftTimeRange.hoursInWeek(night, monday));
    }
    @Test void minuteSizedAssignmentsAtExactLimitAreNotRejectedByRounding() {
        contract.setMaxWeeklyHours(1);
        Shift[] existing = new Shift[59];
        for (int minute = 0; minute < existing.length; minute++) {
            existing[minute] = Shift.builder().id(UUID.randomUUID()).shiftDate(monday)
                    .startTime(LocalTime.of(9,0).plusMinutes(minute))
                    .endTime(LocalTime.of(9,0).plusMinutes(minute + 1)).build();
        }
        schedule(existing);
        Shift finalMinute = Shift.builder().store(com.shiftsync.store.entity.Store.builder().id(storeId).build()).shiftDate(monday).startTime(LocalTime.of(9,59)).endTime(LocalTime.of(10,0)).build();
        assertDoesNotThrow(() -> validator.validateNoOverlapAndWeeklyHours(finalMinute, person, null));
    }
    @Test void automaticSchedulingChecksBothWeeksOfNewNightShift() {
        var data = new AutoScheduleService.StaffData();
        data.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(8).build()).build());
        data.setCurrentSchedule(new ArrayList<>(List.of(shift(monday.plusDays(8), 9, 12))));
        data.setSkills(List.of()); data.setApprovedLeaveDates(Set.of()); data.setBlackoutDates(List.of());
        data.setAvailabilities(List.of(com.shiftsync.availability.entity.Availability.builder()
                .dayOfWeek((short)0).startTime(LocalTime.of(22,0)).endTime(LocalTime.of(6,0)).build()));
        var service = new AutoScheduleService(null,null,null,null,null,null,null,null);
        assertTrue(service.findValidCandidates(new AutoScheduleService.Slot(shift(monday.plusDays(6),22,6),null),List.of(data),8).isEmpty());
        data.getCurrentSchedule().clear();
        assertEquals(1, service.findValidCandidates(new AutoScheduleService.Slot(shift(monday.plusDays(6),22,6),null),List.of(data),8).size());
    }
}
