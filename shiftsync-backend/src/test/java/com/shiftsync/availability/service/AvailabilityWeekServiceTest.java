package com.shiftsync.availability.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.dto.*;
import com.shiftsync.availability.entity.*;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AvailabilityWeekServiceTest {
    AvailabilityWeekRepository weeks = mock(AvailabilityWeekRepository.class);
    AvailabilityRepository recurring = mock(AvailabilityRepository.class);
    UserRepository users = mock(UserRepository.class);
    EmploymentRepository employments = mock(EmploymentRepository.class);
    AvailabilityWeekService service = new AvailabilityWeekService(weeks, recurring, users, employments);
    User user = new User();
    LocalDate monday = LocalDate.parse("2026-10-26");
    Map<LocalDate, AvailabilityWeek> stored = new HashMap<>();

    @BeforeEach void setup() {
        user.setId(UUID.randomUUID());
        user.setEmail("weekly@example.com");
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recurring.findByUserId(user.getId())).thenReturn(List.of(Availability.builder()
                .id(UUID.randomUUID()).user(user).dayOfWeek((short) 1)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(14, 0)).build()));
        when(weeks.findByUserIdAndWeekStart(eq(user.getId()), any())).thenAnswer(call -> Optional.ofNullable(stored.get(call.getArgument(1))));
        when(weeks.saveAndFlush(any())).thenAnswer(call -> {
            AvailabilityWeek week = call.getArgument(0);
            stored.put(week.getWeekStart(), week);
            return week;
        });
        ReflectionTestUtils.setField(service, "entityManager", mock(EntityManager.class));
        time("2026-10-22T15:00:00+07:00");
    }

    void time(String value) {
        ReflectionTestUtils.setField(service, "clock", Clock.fixed(OffsetDateTime.parse(value).toInstant(), AvailabilityDeadline.BUSINESS_ZONE));
    }
    AvailabilityRequest slot(int day, int start, int end) {
        AvailabilityRequest result = new AvailabilityRequest();
        result.setDayOfWeek((short) day); result.setStartTime(LocalTime.of(start, 0)); result.setEndTime(LocalTime.of(end, 0));
        return result;
    }
    AvailabilityWeekRequest request(long revision, AvailabilityRequest... slots) {
        AvailabilityWeekRequest request = new AvailabilityWeekRequest();
        request.setRevision(revision); request.setSlots(List.of(slots)); return request;
    }

    @Test void doesNotInventHistoricalSnapshotsFromCurrentTemplate() {
        assertEquals("TEMPLATE", service.getMine(user.getEmail(), monday).getSource());
        AvailabilityWeekResponse old = service.getMine(user.getEmail(), monday.minusWeeks(1));
        assertEquals("UNRECORDED", old.getSource()); assertTrue(old.getSlots().isEmpty());
        assertFalse(old.isEditable());
        verify(weeks, never()).saveAndFlush(any());
    }
    @Test void registersSeparateWeeksAndKeepsOldSnapshotUnchanged() {
        AvailabilityWeekResponse first = service.saveMine(user.getEmail(), monday, request(0, slot(1, 8, 12)));
        assertEquals(1, first.getRevision()); assertEquals("REGISTERED", first.getSource());
        assertNotNull(first.getSubmittedAt());
        time("2026-10-26T09:00:00+07:00");
        service.saveMine(user.getEmail(), monday.plusWeeks(1), request(0, slot(1, 15, 19)));
        AvailabilityWeekResponse old = service.getMine(user.getEmail(), monday);
        assertEquals(LocalTime.of(8, 0), old.getSlots().getFirst().getStartTime());
        assertFalse(old.isEditable());
        assertEquals(LocalTime.of(15, 0), service.getMine(user.getEmail(), monday.plusWeeks(1)).getSlots().getFirst().getStartTime());
    }
    @Test void persistsEmptyWeeksAndDoesNotResurrectLegacySlotsDuringAssignment() {
        service.saveMine(user.getEmail(), monday, request(0));
        assertEquals("REGISTERED", service.getMine(user.getEmail(), monday).getSource());
        assertTrue(service.getMine(user.getEmail(), monday).getSlots().isEmpty());
        assertFalse(service.coversShift(user.getId(), monday, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        verify(recurring, never()).coversShiftTime(any(), anyShort(), any(), any());
    }
    @Test void rejectsStaleRevisionWithoutOverwritingAnotherDevicesSave() {
        service.saveMine(user.getEmail(), monday, request(0, slot(1, 8, 12)));
        assertThrows(BusinessException.class, () -> service.saveMine(user.getEmail(), monday, request(0, slot(1, 15, 19))));
        assertEquals(LocalTime.of(8, 0), service.getMine(user.getEmail(), monday).getSlots().getFirst().getStartTime());
        verify(weeks, times(1)).saveAndFlush(any());
    }
    @Test void serverRejectsExpiredPastAndNotYetOpenWeeks() {
        assertThrows(BusinessException.class, () -> service.saveMine(user.getEmail(), monday.minusWeeks(1), request(0)));
        assertThrows(BusinessException.class, () -> service.saveMine(user.getEmail(), monday.plusWeeks(1), request(0)));
        time("2026-10-24T00:00:00+07:00");
        assertThrows(BusinessException.class, () -> service.saveMine(user.getEmail(), monday, request(0)));
        verify(weeks, never()).saveAndFlush(any());
    }
    @Test void acceptsFridayFinalMinuteButRejectsOverlapsAndNonMondayContext() {
        time("2026-10-23T23:59:59.999999999+07:00");
        assertThrows(BusinessException.class, () -> service.saveMine(user.getEmail(), monday, request(0, slot(1, 8, 12), slot(1, 11, 14))));
        assertThrows(BusinessException.class, () -> service.saveMine(user.getEmail(), monday.plusDays(1), request(0)));
        assertEquals(1, service.saveMine(user.getEmail(), monday, request(0, slot(1, 8, 12), slot(1, 12, 14))).getRevision());
    }
    @Test void managerReadsExactlyTheRegisteredWeekForActiveStoreStaff() {
        UUID storeId = UUID.randomUUID();
        Employment employment = new Employment(); employment.setUser(user);
        when(employments.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(employment));
        service.saveMine(user.getEmail(), monday, request(0, slot(2, 10, 16)));
        AvailabilityWeekResponse managerView = service.getForStore(storeId, monday).getFirst();
        assertEquals(user.getId(), managerView.getStaffId());
        assertEquals("REGISTERED", managerView.getSource());
        assertEquals((short) 2, managerView.getSlots().getFirst().getDayOfWeek());
    }
    @Test void usesWeeklyHoursRatherThanLegacyTemplateAndFallsBackOnlyWhenNoWeeklyRegistration() {
        service.saveMine(user.getEmail(), monday, request(0, slot(1, 15, 19)));
        assertFalse(service.coversShift(user.getId(), monday, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        assertTrue(service.coversShift(user.getId(), monday, LocalTime.of(16, 0), LocalTime.of(18, 0)));
        when(recurring.coversShiftTime(user.getId(), (short) 1, LocalTime.of(8, 0), LocalTime.of(12, 0))).thenReturn(true);
        assertTrue(service.coversShift(user.getId(), monday.plusWeeks(1), LocalTime.of(8, 0), LocalTime.of(12, 0)));
    }
}
