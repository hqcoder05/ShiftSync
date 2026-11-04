package com.shiftsync.shift.service;

import com.shiftsync.store.repository.StoreConfigurationRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

/** Default registration deadline measured from the store's local shift start. */
public final class ShiftDeadlinePolicy {
    private ShiftDeadlinePolicy() {}

    public static ZonedDateTime calculate(StoreConfigurationRepository repository, UUID storeId, LocalDate date, LocalTime start) {
        int hours = repository.findByStoreId(storeId).map(config -> config.getAvailabilityDeadlineHours())
                .orElse(24);
        return date.atTime(start).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).minusHours(hours);
    }
}
