package com.shiftsync.payroll.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/** Resolves the date selected for a compensation revision in the business timezone. */
public final class CompensationEffectiveDate {
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private CompensationEffectiveDate() {}

    public static LocalDate resolve(LocalDate selected, Clock clock) {
        return selected != null ? selected : LocalDate.now(clock.withZone(BUSINESS_ZONE)).plusDays(1);
    }
}
