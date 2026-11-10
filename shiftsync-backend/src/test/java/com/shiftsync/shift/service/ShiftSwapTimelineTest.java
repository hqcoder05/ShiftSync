package com.shiftsync.shift.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.enums.SwapStatus;
import com.shiftsync.shift.repository.ShiftSwapRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftSwapTimelineTest {
    @Mock ShiftSwapRequestRepository repository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock AuditLogService auditLogService;
    @InjectMocks ShiftSwapService service;

    private ShiftSwapRequest pending() {
        return ShiftSwapRequest.builder().id(UUID.randomUUID()).status(SwapStatus.PENDING)
                .fromStaff(User.builder().id(UUID.randomUUID()).fullName("Sender").build())
                .toStaff(User.builder().id(UUID.randomUUID()).fullName("Recipient").build()).build();
    }

    @Test void colleagueResponseRecordsTimeAndCannotBeSubmittedTwice() {
        var request = pending();
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        service.respondToSwapRequest(request.getId(), request.getToStaff().getId(), true);
        assertTrue(request.isEmployeeAccepted());
        assertNotNull(request.getEmployeeRespondedAt());
        var originalTime = request.getEmployeeRespondedAt();
        assertThrows(BusinessException.class, () -> service.respondToSwapRequest(request.getId(), request.getToStaff().getId(), false));
        assertEquals(originalTime, request.getEmployeeRespondedAt());
        assertEquals(SwapStatus.PENDING, request.getStatus());
        verify(repository, times(1)).save(request);
    }

    @Test void cancellationPersistsActorAndTimeButDoesNotApproveSwap() {
        var request = pending();
        var owner = request.getFromStaff();
        owner.setSystemRole(SystemRole.STAFF);
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        service.cancelSwapRequest(request.getId(), owner.getId());
        assertEquals(SwapStatus.CANCELLED, request.getStatus());
        assertEquals(owner.getId(), request.getCancelledById());
        assertEquals(owner.getFullName(), request.getCancelledByName());
        assertNotNull(request.getCancelledAt());
        assertNull(request.getReviewedAt());
        verify(repository).save(request);
    }

    @Test void unrelatedStaffCannotCancel() {
        var request = pending();
        var outsider = User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(userRepository.findById(outsider.getId())).thenReturn(Optional.of(outsider));
        assertThrows(BusinessException.class, () -> service.cancelSwapRequest(request.getId(), outsider.getId()));
        assertEquals(SwapStatus.PENDING, request.getStatus());
        verify(repository, never()).save(request);
    }

    @Test void legacyResponseDoesNotInventTimestamps() {
        var request = pending();
        when(repository.findByFromStaffIdOrToStaffId(request.getFromStaff().getId(), request.getFromStaff().getId())).thenReturn(List.of(request));
        var dto = service.getMySwapRequests(request.getFromStaff().getId()).getFirst();
        assertNull(dto.getCreatedAt());
        assertNull(dto.getReviewedAt());
        assertNull(dto.getEmployeeRespondedAt());
    }
}
