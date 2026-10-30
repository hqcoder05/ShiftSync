package com.shiftsync.leave.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.*;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.websocket.RealtimeEventPublisher;
import com.shiftsync.shift.repository.*;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;

/** Evidence of existing defects, not acceptance tests for desired behavior. */
@ExtendWith(MockitoExtension.class)
class LeaveAuditCharacterizationTest {
    @Mock AuditLogService auditLogService;
    @Mock LeaveRequestRepository leaveRequestRepository;
    @Mock UserRepository userRepository;
    @Mock StoreRepository storeRepository;
    @Mock EmploymentRepository employmentRepository;
    @Mock BlackoutDateRepository blackoutDateRepository;
    @Mock ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock ShiftRepository shiftRepository;
    @Mock NotificationService notificationService;
    @Mock RealtimeEventPublisher realtimeEventPublisher;
    @Mock LeaveBalanceService leaveBalanceService;
    @InjectMocks LeaveRequestService service;

    @Test void approvalOmitsPreviousDayOvernightAssignmentsFromQuery() {
        var start=LocalDate.of(2030,11,4);
        var request=approve(start,start);
        // A shift starting Nov 3 at 22:00 is outside this query, despite working Nov 4.
        verify(shiftAssignmentRepository).findByStaffIdAndShift_ShiftDateBetween(request.getStaff().getId(),start,start);
        verify(shiftAssignmentRepository).deleteAll(List.of());
        verifyNoMoreInteractions(shiftAssignmentRepository);
    }

    @Test void crossYearApprovalChargesBothDaysToStartingYear() {
        var request=approve(LocalDate.of(2030,12,31),LocalDate.of(2031,1,1));
        verify(leaveBalanceService).deductAnnualLeave(request.getStore().getId(),request.getStaff().getId(),2030,2);
        verifyNoMoreInteractions(leaveBalanceService);
    }

    private LeaveRequest approve(LocalDate start,LocalDate end) {
        var store=Store.builder().id(UUID.randomUUID()).name("Audit store").build();
        var staff=User.builder().id(UUID.randomUUID()).fullName("Staff").build();
        var manager=User.builder().id(UUID.randomUUID()).fullName("Manager").build();
        var request=LeaveRequest.builder().id(UUID.randomUUID()).store(store).staff(staff)
                .leaveType(LeaveType.ANNUAL).status(LeaveStatus.PENDING).startDate(start).endDate(end).build();
        when(leaveRequestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(leaveRequestRepository.save(request)).thenReturn(request);
        service.approveLeaveRequest(store.getId(),request.getId(),manager.getId());
        return request;
    }
}
