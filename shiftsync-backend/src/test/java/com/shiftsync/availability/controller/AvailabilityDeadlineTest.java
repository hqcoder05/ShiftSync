package com.shiftsync.availability.controller;

import com.shiftsync.availability.service.AvailabilityDeadline;
import static org.junit.jupiter.api.Assertions.*;
import java.time.ZonedDateTime;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AvailabilityDeadlineTest {
    @Test void keepsEntireFridayMinuteOpenThenLocksWeekend() {
        assertFalse(AvailabilityDeadline.isClosed(ZonedDateTime.parse("2026-10-23T23:59:59.999999999+07:00")));
        assertTrue(AvailabilityDeadline.isClosed(ZonedDateTime.parse("2026-10-24T00:00:00+07:00")));
        assertTrue(AvailabilityDeadline.isClosed(ZonedDateTime.parse("2026-10-25T23:59:59+07:00")));
        assertFalse(AvailabilityDeadline.isClosed(ZonedDateTime.parse("2026-10-26T00:00:00+07:00")));
    }
    @Test void appliesVietnamTimeRegardlessOfCallerZone() {
        assertTrue(AvailabilityDeadline.isClosed(ZonedDateTime.parse("2026-10-23T17:00:00Z")));
        assertFalse(AvailabilityDeadline.isClosed(ZonedDateTime.parse("2026-10-25T17:00:00Z")));
    }
    @Test void limitsEditsToTheActualNextWeekAndDoesNotAllowFutureWeekBypass() {
        LocalDate nextMonday = LocalDate.parse("2026-10-26");
        ZonedDateTime fridayLastInstant = ZonedDateTime.parse("2026-10-23T23:59:59.999999999+07:00");
        assertTrue(AvailabilityDeadline.isEditable(nextMonday, fridayLastInstant));
        assertFalse(AvailabilityDeadline.isEditable(nextMonday, fridayLastInstant.plusNanos(1)));
        assertFalse(AvailabilityDeadline.isEditable(nextMonday.plusWeeks(1), fridayLastInstant));
        assertFalse(AvailabilityDeadline.isEditable(nextMonday.minusWeeks(1), fridayLastInstant));
        assertEquals(nextMonday, AvailabilityDeadline.nextWeekStart(ZonedDateTime.parse("2026-10-23T16:59:59Z")));
        assertEquals("2026-10-23T23:59:59.999999999+07:00[Asia/Ho_Chi_Minh]", AvailabilityDeadline.deadlineAt(nextMonday).toString());
    }
}
