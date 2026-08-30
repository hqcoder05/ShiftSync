package com.shiftsync.leave.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.store.entity.Store;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.dto.LeaveRequestDTO;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class LeaveRequestServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private com.shiftsync.auth.repository.UserRepository userRepository;

    @Mock
    private com.shiftsync.shift.repository.ShiftAssignmentRepository shiftAssignmentRepository;

    @Mock
    private com.shiftsync.availability.repository.BlackoutDateRepository blackoutDateRepository;

    @Mock
    private com.shiftsync.audit.service.AuditLogService auditLogService;

    @Mock
    private com.shiftsync.notification.service.NotificationService notificationService;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    @Test
    void getLeaveRequests_ShouldReturnList() {
        UUID storeId = UUID.randomUUID();
        User staff = new User();
        staff.setId(UUID.randomUUID());
        
        Store store = new Store();
        store.setId(storeId);
        
        LeaveRequest req = new LeaveRequest();
        req.setId(UUID.randomUUID());
        req.setStaff(staff);
        req.setStore(store);
        
        when(leaveRequestRepository.findByStoreId(storeId)).thenReturn(List.of(req));

        List<LeaveRequestDTO> result = leaveRequestService.getLeaveRequests(storeId, null);

        assertNotNull(result);
        assertFalse(result.isEmpty());
        verify(leaveRequestRepository).findByStoreId(storeId);
    }

    @Test
    void approveLeaveRequest_WhenConflictingShifts_ShouldReturnWarning() {
        UUID storeId = UUID.randomUUID();
        UUID leaveId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();

        User staff = new User();
        staff.setId(staffId);
        staff.setFullName("John Doe");

        Store store = new Store();
        store.setId(storeId);

        User manager = new User();
        manager.setId(managerId);

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setId(leaveId);
        leaveRequest.setStaff(staff);
        leaveRequest.setStore(store);
        leaveRequest.setStatus(com.shiftsync.leave.enums.LeaveStatus.PENDING);
        leaveRequest.setStartDate(java.time.LocalDate.now());
        leaveRequest.setEndDate(java.time.LocalDate.now().plusDays(2));
        leaveRequest.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);

        when(leaveRequestRepository.findById(leaveId)).thenReturn(java.util.Optional.of(leaveRequest));
        when(userRepository.findById(managerId)).thenReturn(java.util.Optional.of(manager));
        when(leaveRequestRepository.save(org.mockito.ArgumentMatchers.any())).thenReturn(leaveRequest);
        
        UUID shiftId = UUID.randomUUID();
        when(shiftAssignmentRepository.findConflictingPublishedShiftIds(staffId, leaveRequest.getStartDate(), leaveRequest.getEndDate()))
                .thenReturn(List.of(shiftId));

        com.shiftsync.leave.dto.LeaveApproveResponse response = leaveRequestService.approveLeaveRequest(storeId, leaveId, managerId);

        assertNotNull(response);
        org.junit.jupiter.api.Assertions.assertEquals(com.shiftsync.leave.enums.LeaveStatus.APPROVED, response.getLeaveRequest().getStatus());
        assertNotNull(response.getWarning());
        org.junit.jupiter.api.Assertions.assertTrue(response.getWarning().contains("conflicting with this leave"));
        
        verify(leaveRequestRepository).save(leaveRequest);
        verify(shiftAssignmentRepository).findConflictingPublishedShiftIds(staffId, leaveRequest.getStartDate(), leaveRequest.getEndDate());
        verify(notificationService).sendNotification(
            org.mockito.ArgumentMatchers.eq(staffId),
            org.mockito.ArgumentMatchers.eq(com.shiftsync.notification.entity.NotificationType.LEAVE_REQUEST_UPDATED),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.isNull()
        );
    }
}
