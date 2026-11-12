package com.shiftsync.availability.controller;

import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.dto.AvailabilityRequest;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WeeklyAvailabilityControllerTest {
    private final EntityManager db = mock(EntityManager.class);
    private final WeeklyAvailabilityController controller = new WeeklyAvailabilityController(db, mock(UserRepository.class));
    private final Authentication auth = mock(Authentication.class);

    @Test void rejectsNonMondayBeforeReadingDatabase() {
        assertThrows(BusinessException.class, () -> controller.get(LocalDate.of(2026, 11, 17), auth));
        verifyNoInteractions(db);
    }

    @Test void rejectsPastWeekBeforeWritingDatabase() {
        var input = new WeeklyAvailabilityController.SaveRequest(0L, List.of());
        assertThrows(BusinessException.class, () -> controller.save(LocalDate.of(2020, 1, 6), input, auth));
        verifyNoInteractions(db);
    }

    @Test void rejectsOverlappingSlotsWhenRegistrationIsOpen() {
        // Friday and weekends are after the deadline; the open window is Monday through Friday.
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        org.junit.jupiter.api.Assumptions.assumeTrue(today.getDayOfWeek().getValue() <= 5);
        LocalDate next = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusWeeks(1);
        var a = new AvailabilityRequest(); a.setDayOfWeek((short) 1); a.setStartTime(LocalTime.of(8, 0)); a.setEndTime(LocalTime.of(12, 0));
        var b = new AvailabilityRequest(); b.setDayOfWeek((short) 1); b.setStartTime(LocalTime.of(11, 0)); b.setEndTime(LocalTime.of(14, 0));
        assertThrows(BusinessException.class, () -> controller.save(next, new WeeklyAvailabilityController.SaveRequest(0L, List.of(a, b)), auth));
        verifyNoInteractions(db);
    }
}
