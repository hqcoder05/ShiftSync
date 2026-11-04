package com.shiftsync.payroll.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class CompensationEffectiveDateTest {
    @Test void defaultsToTomorrowInVietnamAcrossUtcDateBoundary() {
        Clock clock = Clock.fixed(Instant.parse("2026-12-31T18:30:00Z"), ZoneOffset.UTC);
        assertEquals(LocalDate.of(2027, 1, 2), CompensationEffectiveDate.resolve(null, clock));
    }

    @Test void preservesDateSelectedByManager() {
        LocalDate selected = LocalDate.of(2026, 12, 15);
        assertEquals(selected, CompensationEffectiveDate.resolve(selected, Clock.systemUTC()));
    }
}
