package com.shiftsync.availability.service;

import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.AvailabilityRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WeeklyAvailabilitySelectionTest {
    @Test
    void sundayShiftCanContinueIntoTheNextWeekSnapshot() {
        var repository = mock(AvailabilityRepository.class);
        var staff = UUID.randomUUID();
        var sunday = LocalDate.of(2026, 11, 15);
        var nextMonday = sunday.plusDays(1);
        var lateSunday = Availability.builder().dayOfWeek((short) 0).startTime(LocalTime.of(22, 0)).endTime(LocalTime.MIDNIGHT).build();
        var monday = mock(AvailabilityRepository.WeeklySlot.class);
        when(monday.getDayOfWeek()).thenReturn((short) 1);
        when(monday.getStartTime()).thenReturn(LocalTime.MIDNIGHT);
        when(monday.getEndTime()).thenReturn(LocalTime.of(3, 0));
        when(repository.findWeeklySlots(staff, nextMonday)).thenReturn(List.of(monday));
        var selected = AvailabilityRepository.forDate(repository, staff, sunday, List.of(lateSunday));
        assertTrue(AvailabilityCoverage.covers(selected, sunday, LocalTime.of(23, 0), LocalTime.of(2, 0), 0));
    }

    @Test
    void recurringTemplateIsUsedForWeeksWithoutSubmission() {
        var repository = mock(AvailabilityRepository.class);
        var staff = UUID.randomUUID();
        var monday = LocalDate.of(2026, 11, 16);
        var template = Availability.builder().dayOfWeek((short) 1).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build();
        var selected = AvailabilityRepository.forDate(repository, staff, monday, List.of(template));
        assertTrue(AvailabilityCoverage.covers(selected, monday, LocalTime.of(9, 0), LocalTime.of(10, 0), 0));
        verify(repository).findWeeklySlots(staff, monday);
    }

    @Test
    void registeredWeekOverridesRecurringTemplate() {
        var repository = mock(AvailabilityRepository.class);
        var staff = UUID.randomUUID();
        var monday = LocalDate.of(2026, 11, 16);
        var template = Availability.builder().dayOfWeek((short) 1).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build();
        var slot = mock(AvailabilityRepository.WeeklySlot.class);
        when(slot.getDayOfWeek()).thenReturn((short) 1);
        when(slot.getStartTime()).thenReturn(LocalTime.of(14, 0));
        when(slot.getEndTime()).thenReturn(LocalTime.of(20, 0));
        when(repository.findWeeklySlots(staff, monday)).thenReturn(List.of(slot));
        var selected = AvailabilityRepository.forDate(repository, staff, monday, List.of(template));
        assertTrue(AvailabilityCoverage.covers(selected, monday, LocalTime.of(15, 0), LocalTime.of(19, 0), 0));
        assertFalse(AvailabilityCoverage.covers(selected, monday, LocalTime.of(8, 0), LocalTime.of(10, 0), 0));
    }

    @Test
    void selectsSundayFromPreviousWeekAndMondayFromCurrentWeek() {
        var repository = mock(AvailabilityRepository.class);
        var staff = UUID.randomUUID();
        var monday = LocalDate.of(2026, 11, 16);
        var sunday = Availability.builder().dayOfWeek((short) 0).startTime(LocalTime.of(22, 0)).endTime(LocalTime.of(2, 0)).build();
        var mondayTemplate = Availability.builder().dayOfWeek((short) 1).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build();
        when(repository.findWeeklySlots(staff, monday)).thenReturn(List.of(mock(AvailabilityRepository.WeeklySlot.class)));
        var selected = AvailabilityRepository.forDate(repository, staff, monday, List.of(sunday, mondayTemplate));
        assertEquals(List.of(sunday), selected, "An explicitly empty weekly submission must replace the recurring Monday template");
        assertTrue(AvailabilityCoverage.covers(selected, monday, LocalTime.MIDNIGHT, LocalTime.of(1, 0), 0));
        assertFalse(AvailabilityCoverage.covers(selected, monday, LocalTime.of(9, 0), LocalTime.of(10, 0), 0));
    }
}
