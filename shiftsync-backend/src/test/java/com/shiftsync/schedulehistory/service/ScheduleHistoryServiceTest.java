package com.shiftsync.schedulehistory.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.schedulehistory.dto.ScheduleHistoryDTOs.ShiftSnapshot;
import com.shiftsync.schedulehistory.entity.ScheduleChange;
import com.shiftsync.schedulehistory.repository.ScheduleChangeRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleHistoryServiceTest {
    @Mock ScheduleChangeRepository repository;
    @Mock EmploymentRepository employments;
    @Mock UserRepository users;
    @InjectMocks ScheduleHistoryService service;
    UUID storeId = UUID.randomUUID(), shiftId = UUID.randomUUID(), userId = UUID.randomUUID();
    LocalDate date = LocalDate.of(2026, 10, 28);
    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }
    ShiftSnapshot state(LocalDate date, String status) { return new ShiftSnapshot(date, LocalTime.of(8, 0), LocalTime.of(16, 0), status, List.of(), List.of()); }
    @Test void noOpEditCreatesNoHistory() {
        service.record(storeId, shiftId, state(date, "PUBLISHED"), state(date, "PUBLISHED"), "Điều chỉnh");
        verifyNoInteractions(repository);
    }
    @Test void actualChangePreservesBeforeAfterManagerAndTruthfulMissingReason() {
        User manager = User.builder().id(userId).fullName("Quản lý").systemRole(SystemRole.MANAGER).build();
        CustomUserDetails principal = new CustomUserDetails(manager);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        ShiftSnapshot before = state(date, "PUBLISHED"), after = state(date.plusDays(1), "PUBLISHED");
        service.record(storeId, shiftId, before, after, "  ");
        ArgumentCaptor<ScheduleChange> saved = ArgumentCaptor.forClass(ScheduleChange.class);
        verify(repository).save(saved.capture());
        assertEquals(before, saved.getValue().getBefore());
        assertEquals(after, saved.getValue().getAfter());
        assertEquals(userId, saved.getValue().getActorId());
        assertEquals("Quản lý", saved.getValue().getActorName());
        assertEquals("Không ghi lý do", saved.getValue().getReason());
        assertTrue(saved.getValue().isEmployeeVisible());
        assertNotNull(saved.getValue().getChangedAt());
    }
    @Test void draftOnlyChangesAreHiddenFromEmployeesAndDeletionSurvivesAsNullAfter() {
        service.record(storeId, shiftId, state(date, "DRAFT"), null, "Xóa ca nháp");
        ArgumentCaptor<ScheduleChange> saved = ArgumentCaptor.forClass(ScheduleChange.class);
        verify(repository).save(saved.capture());
        assertFalse(saved.getValue().isEmployeeVisible());
        assertNull(saved.getValue().getAfter());
        assertEquals(date, saved.getValue().getBeforeDate());
    }
    @Test void storeAndWeekAreScopedAndStaffQueryHidesDraftChanges() {
        when(users.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).systemRole(SystemRole.STAFF).build()));
        when(employments.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(repository.history(storeId, date, date.plusDays(6), false)).thenReturn(List.of());
        assertTrue(service.history(storeId, userId, date, date.plusDays(6)).isEmpty());
        verify(repository).history(storeId, date, date.plusDays(6), false);
        assertThrows(BusinessException.class, () -> service.history(storeId, userId, date, date.plusDays(31)));
        assertThrows(BusinessException.class, () -> service.history(storeId, userId, date, date.minusDays(1)));
    }
    @Test void managerCannotReadOtherStore() {
        when(users.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).systemRole(SystemRole.MANAGER).build()));
        assertThrows(BusinessException.class, () -> service.history(storeId, userId, date, date.plusDays(6)));
        verifyNoInteractions(repository);
    }
}
