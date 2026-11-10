package com.shiftsync.request.service;

import com.shiftsync.request.entity.StaffRequest;
import com.shiftsync.request.enums.RequestStatus;
import com.shiftsync.request.repository.StaffRequestRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class StaffRequestTimelineTest {
    @Mock StaffRequestRepository repository;
    @InjectMocks StaffRequestService service;

    @Test void reviewPersistsRealActorTimeAndNote() {
        UUID id = UUID.randomUUID(), actor = UUID.randomUUID();
        var request = StaffRequest.builder().id(id).status(RequestStatus.PENDING).build();
        when(repository.findById(id)).thenReturn(Optional.of(request));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var before = OffsetDateTime.now();
        var result = service.updateRequestStatus(id, RequestStatus.REJECTED, actor, "Manager", "Choose another day");
        assertEquals(actor, result.getReviewedById());
        assertEquals("Manager", result.getReviewedByName());
        assertEquals("Choose another day", result.getManagerNote());
        assertFalse(result.getReviewedAt().isBefore(before));
        assertNull(result.getCreatedAt());
        assertNull(result.getRequestDate());
    }

    @Test void retryPreservesOriginalDecisionMetadata() {
        UUID id = UUID.randomUUID(), actor = UUID.randomUUID();
        var timestamp = OffsetDateTime.now().minusHours(1);
        var request = StaffRequest.builder().id(id).status(RequestStatus.APPROVED).reviewedById(actor)
                .reviewedAt(timestamp).managerNote("Original note").build();
        when(repository.findById(id)).thenReturn(Optional.of(request));
        var result = service.updateRequestStatus(id, RequestStatus.APPROVED, UUID.randomUUID(), "Another manager", "Retry");
        assertEquals(actor, result.getReviewedById());
        assertEquals(timestamp, result.getReviewedAt());
        assertEquals("Original note", result.getManagerNote());
        verify(repository, never()).save(any());
    }

    @Test void terminalDecisionCannotBeReversed() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(StaffRequest.builder().id(id).status(RequestStatus.REJECTED).build()));
        assertThrows(BusinessException.class, () -> service.updateRequestStatus(id, RequestStatus.APPROVED));
        verify(repository, never()).save(any());
    }
}
