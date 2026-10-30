package com.shiftsync.shift.service;

import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.shift.entity.Shift;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

/** Regression checks for fixed leave boundaries, plus explicit remaining policy characterizations. */
class SchedulingReadinessCharacterizationTest {
    private final AutoScheduleService service = new AutoScheduleService(null, null, null, null, null, null, null, null);
    private final LocalDate sunday = LocalDate.of(2026, 11, 1);

    private AutoScheduleService.StaffData person(LocalDate date, LocalTime from, LocalTime to) {
        var data = new AutoScheduleService.StaffData();
        data.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(48).build()).build());
        data.setSkills(List.of());
        data.setAvailabilities(List.of(Availability.builder().dayOfWeek((short)(date.getDayOfWeek().getValue() % 7)).startTime(from).endTime(to).build()));
        data.setBlackoutDates(List.of());
        data.setApprovedLeaveDates(Set.of());
        data.setCurrentSchedule(new ArrayList<>());
        return data;
    }
    private Shift shift(LocalDate date, LocalTime from, LocalTime to) {
        return Shift.builder().shiftDate(date).startTime(from).endTime(to).build();
    }
    @Test void overnightShiftRejectedWhenEndDateHasApprovedLeave() {
        var person = person(sunday, LocalTime.of(22, 0), LocalTime.of(6, 0));
        person.setApprovedLeaveDates(Set.of(sunday.plusDays(1)));
        var shift = shift(sunday, LocalTime.of(22, 0), LocalTime.of(6, 0));
        assertTrue(service.findValidCandidates(new AutoScheduleService.Slot(shift, null), List.of(person), 8).isEmpty(),
            "Monday leave must block work from Sunday 22:00 to Monday 06:00");
        person.setApprovedLeaveDates(Set.of(sunday));
        assertTrue(service.findValidCandidates(new AutoScheduleService.Slot(shift, null), List.of(person), 8).isEmpty());
    }
    @Test void overnightShiftRejectedWhenEndDateHasBlackout() {
        var person = person(sunday, LocalTime.of(22, 0), LocalTime.of(6, 0));
        person.setBlackoutDates(List.of(BlackoutDate.builder().date(sunday.plusDays(1)).build()));
        assertTrue(service.findValidCandidates(new AutoScheduleService.Slot(shift(sunday, LocalTime.of(22, 0), LocalTime.of(6, 0)), null), List.of(person), 8).isEmpty());
    }
    @Test void midnightEndDoesNotWorkOnFollowingDate() {
        var person = person(sunday, LocalTime.of(22, 0), LocalTime.MIDNIGHT);
        person.setApprovedLeaveDates(Set.of(sunday.plusDays(1)));
        person.setBlackoutDates(List.of(BlackoutDate.builder().date(sunday.plusDays(1)).build()));
        assertEquals(1, service.findValidCandidates(new AutoScheduleService.Slot(shift(sunday, LocalTime.of(22, 0), LocalTime.MIDNIGHT), null), List.of(person), 8).size());
    }
    @Test void availabilityIsExactUnlessToleranceIsExplicitlyConfigured() {
        var person = person(sunday, LocalTime.of(9, 0), LocalTime.of(17, 0));
        assertTrue(service.findValidCandidates(new AutoScheduleService.Slot(shift(sunday, LocalTime.of(8, 30), LocalTime.of(17, 30)), null), List.of(person), 8).isEmpty());
        person.setAvailabilityToleranceMinutes(30);
        assertEquals(1, service.findValidCandidates(new AutoScheduleService.Slot(shift(sunday, LocalTime.of(8, 30), LocalTime.of(17, 30)), null), List.of(person), 8).size());
        assertTrue(service.findValidCandidates(new AutoScheduleService.Slot(shift(sunday, LocalTime.of(8, 29), LocalTime.of(17, 30)), null), List.of(person), 8).isEmpty());
    }
    @Test void overnightHoursAreSplitAtTheWeekBoundary() {
        var person = person(sunday, LocalTime.of(22, 0), LocalTime.of(6, 0));
        person.getCurrentSchedule().add(shift(sunday, LocalTime.of(22, 0), LocalTime.of(6, 0)));
        assertEquals(2.0, service.getWeeklyHours(person, sunday));
        assertEquals(6.0, service.getWeeklyHours(person, sunday.plusDays(1)));
    }
}
