package com.shiftsync.availability.service;

import com.shiftsync.availability.entity.Availability;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class AvailabilityCoverageTest {
    private final LocalDate monday = LocalDate.of(2030,11,4);
    private Availability slot(int dow, String start, String end) {
        return Availability.builder().id(UUID.randomUUID()).dayOfWeek((short)dow)
                .startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).build();
    }
    private boolean covers(List<Availability> slots, String start, String end, int tolerance) {
        return AvailabilityCoverage.covers(slots,monday,LocalTime.parse(start),LocalTime.parse(end),tolerance);
    }
    @Test void exactCoverageAcceptsEndpointsButRejectsEvenOneSecondOutside() {
        var slots=List.of(slot(1,"09:00","17:00"));
        assertTrue(covers(slots,"09:00","17:00",0));
        assertFalse(covers(slots,"08:59:59","17:00",0));
        assertFalse(covers(slots,"09:00","17:00:01",0));
    }
    @Test void toleranceHasAnInclusiveExplicitBoundary() {
        var slots=List.of(slot(1,"09:00","17:00"));
        assertTrue(covers(slots,"08:30","17:30",30));
        assertFalse(covers(slots,"08:29:59","17:30",30));
        assertFalse(covers(slots,"08:30","17:30:01",30));
    }
    @Test void daytimeAvailabilityCannotFalselyCoverANightShift() {
        assertFalse(covers(List.of(slot(1,"09:00","17:00")),"22:00","06:00",0));
    }
    @Test void overnightAvailabilityCoversBothNightAndFollowingMorning() {
        assertTrue(covers(List.of(slot(1,"22:00","06:00")),"22:00","06:00",0));
        assertTrue(covers(List.of(slot(0,"22:00","06:00")),"02:00","06:00",0));
        assertFalse(covers(List.of(slot(0,"22:00","06:00")),"02:00","06:01",0));
    }
    @Test void adjacentIntervalsCanTogetherCoverAShift() {
        assertTrue(covers(List.of(slot(1,"12:00","17:00"),slot(1,"09:00","12:00")),"09:00","17:00",0));
        assertTrue(covers(List.of(slot(1,"22:00","00:00"),slot(2,"00:00","06:00")),"22:00","06:00",0));
    }
    @Test void aGapInAvailabilityCannotBeFilledByCombiningDisjointSlots() {
        assertFalse(covers(List.of(slot(1,"09:00","12:00"),slot(1,"13:00","17:00")),"09:00","17:00",30));
    }
    @Test void toleranceCanReachBackAcrossMidnight() {
        assertTrue(covers(List.of(slot(2,"00:00","06:00")),"23:45","06:00",15));
        assertFalse(covers(List.of(slot(2,"00:00","06:00")),"23:44","06:00",15));
    }
    @Test void missingOrEqualTimeAvailabilityDoesNotMeanAllDay() {
        assertFalse(covers(List.of(),"09:00","17:00",0));
        assertFalse(covers(List.of(slot(1,"09:00","09:00")),"09:00","17:00",0));
        assertFalse(covers(List.of(slot(1,"09:00","17:00")),"09:00","09:00",0));
    }
    @Test void weeklyOverlapFindsCarryoverAcrossSaturdaySundayAndSundayMonday() {
        assertTrue(AvailabilityCoverage.overlaps(List.of(slot(6,"22:00","06:00")),(short)0,LocalTime.of(5,0),LocalTime.of(9,0),null));
        assertTrue(AvailabilityCoverage.overlaps(List.of(slot(0,"22:00","06:00")),(short)1,LocalTime.of(5,0),LocalTime.of(9,0),null));
        assertTrue(AvailabilityCoverage.overlaps(List.of(slot(0,"05:00","09:00")),(short)6,LocalTime.of(22,0),LocalTime.of(6,0),null));
    }
    @Test void adjacentWeeklySlotsAndExcludedUpdateAreAllowed() {
        var existing=slot(0,"22:00","06:00");
        assertFalse(AvailabilityCoverage.overlaps(List.of(existing),(short)1,LocalTime.of(6,0),LocalTime.of(9,0),null));
        assertFalse(AvailabilityCoverage.overlaps(List.of(existing),(short)0,LocalTime.of(22,0),LocalTime.of(6,0),existing.getId()));
        assertFalse(AvailabilityCoverage.overlaps(List.of(existing),(short)2,LocalTime.of(1,0),LocalTime.of(3,0),null));
    }
}
