package com.shiftsync.leave.service;

import com.shiftsync.activity.ActivityArchiveRecorder;
import com.shiftsync.auth.entity.User;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.*;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestActivityArchiveTest {
    @Mock LeaveRequestRepository repository;
    @Mock ActivityArchiveRecorder archive;
    @InjectMocks LeaveRequestService service;
    UUID staffId = UUID.randomUUID(), storeId = UUID.randomUUID(), leaveId = UUID.randomUUID();
    LeaveRequest leave;
    @BeforeEach void setup() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "activityArchiveRecorder", archive);
        leave = LeaveRequest.builder().id(leaveId).staff(User.builder().id(staffId).build()).store(Store.builder().id(storeId).build())
                .startDate(LocalDate.now().plusDays(10)).endDate(LocalDate.now().plusDays(11)).status(LeaveStatus.PENDING).leaveType(LeaveType.UNPAID).build();
        when(repository.findById(leaveId)).thenReturn(Optional.of(leave));
    }
    @Test void archivesBeforeHardDeletion() {
        service.cancelLeaveRequest(storeId, leaveId, staffId);
        InOrder order = inOrder(archive, repository);
        order.verify(archive).preserveCancelledLeave(eq(leave), eq(staffId), any());
        order.verify(repository).delete(leave);
    }
    @Test void archiveFailureStopsDeletion() {
        doThrow(new IllegalStateException("Archive unavailable")).when(archive).preserveCancelledLeave(eq(leave), eq(staffId), any());
        assertThrows(IllegalStateException.class, () -> service.cancelLeaveRequest(storeId, leaveId, staffId));
        verify(repository, never()).delete(any(LeaveRequest.class));
    }
    @Test void unauthorizedCancellationCreatesNoArchivedEvents() {
        assertThrows(BusinessException.class, () -> service.cancelLeaveRequest(storeId, leaveId, UUID.randomUUID()));
        verifyNoInteractions(archive);
        verify(repository, never()).delete(any(LeaveRequest.class));
    }
}
