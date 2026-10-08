package com.shiftsync.leave.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestServiceQaTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private LeaveBalanceService leaveBalanceService;

    @Mock
    private BlackoutDateRepository blackoutDateRepository;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    @Test
    void testCancelLeaveRequest_InThePast_AllowsCancellation() {
        UUID storeId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        UUID leaveId = UUID.randomUUID();

        Store store = Store.builder().id(storeId).build();
        User staff = User.builder().id(staffId).build();

        // Approved leave in the past (e.g. 1 year ago)
        LeaveRequest pastLeave = LeaveRequest.builder()
                .id(leaveId)
                .store(store)
                .staff(staff)
                .status(LeaveStatus.APPROVED)
                .leaveType(LeaveType.ANNUAL)
                .startDate(LocalDate.now().minusDays(365))
                .endDate(LocalDate.now().minusDays(365))
                .build();

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(pastLeave));

        // Action: Staff cancels their own past leave
        // This SHOULD throw an exception in a proper system, but our audit claims it doesn't.
        BusinessException ex = assertThrows(BusinessException.class, () -> {
            leaveRequestService.cancelLeaveRequest(storeId, leaveId, staffId);
        });

        assertEquals("Cannot cancel a leave request that has already started or occurred in the past.", ex.getMessage());

        // Verify that the balance is NOT refunded and request is NOT deleted
        verify(leaveBalanceService, never()).reverseAnnualLeave(any(), any(), anyInt(), anyInt());
        verify(leaveRequestRepository, never()).delete(any());
    }
}
