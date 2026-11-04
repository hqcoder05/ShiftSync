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
    @Mock com.shiftsync.attendance.repository.AttendanceRepository attendanceRepository;
    @Mock com.shiftsync.payroll.service.PayrollCalculationService payrollCalculationService;
    @InjectMocks LeaveRequestService service;

    @org.junit.jupiter.api.BeforeEach void storeLock() {
        lenient().when(storeRepository.findByIdForUpdate(any())).thenAnswer(call -> Optional.of(Store.builder().id(call.getArgument(0)).build()));
    }

    @Test void approvalChecksPreviousDayForOvernightAssignments() {
        var start=LocalDate.of(2030,11,4);
        var request=approve(start,start);
        verify(shiftAssignmentRepository).findByStaffIdAndShift_ShiftDateBetween(request.getStaff().getId(),start.minusDays(1),start);
        verify(shiftAssignmentRepository).deleteAll(List.of());
        verifyNoMoreInteractions(shiftAssignmentRepository);
    }

    @Test void crossYearApprovalChargesEachYearSeparately() {
        var request=approve(LocalDate.of(2030,12,31),LocalDate.of(2031,1,1));
        verify(leaveBalanceService).deductAnnualLeave(request.getStore().getId(),request.getStaff().getId(),2030,1);
        verify(leaveBalanceService).deductAnnualLeave(request.getStore().getId(),request.getStaff().getId(),2031,1);
        verifyNoMoreInteractions(leaveBalanceService);
    }

    @Test void retrospectiveApprovalRejectsCompletedShift() {
        var day = LocalDate.now().minusDays(3);
        var store = Store.builder().id(UUID.randomUUID()).name("Audit store").build();
        var staff = User.builder().id(UUID.randomUUID()).fullName("Staff").build();
        var manager = User.builder().id(UUID.randomUUID()).fullName("Manager").build();
        var request = LeaveRequest.builder().id(UUID.randomUUID()).store(store).staff(staff)
                .leaveType(LeaveType.SICK).status(LeaveStatus.PENDING).startDate(day).endDate(day).build();
        var shift = com.shiftsync.shift.entity.Shift.builder().id(UUID.randomUUID()).store(store)
                .shiftDate(day).startTime(java.time.LocalTime.of(8, 0)).endTime(java.time.LocalTime.of(16, 0))
                .status(com.shiftsync.shift.enums.ShiftStatus.COMPLETED).build();
        var assignment = com.shiftsync.shift.entity.ShiftAssignment.builder().id(UUID.randomUUID())
                .shift(shift).staff(staff).build();
        when(leaveRequestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(shiftAssignmentRepository.findByStaffIdAndShift_ShiftDateBetween(staff.getId(), day.minusDays(1), day))
                .thenReturn(List.of(assignment));

        org.junit.jupiter.api.Assertions.assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                () -> service.approveLeaveRequest(store.getId(), request.getId(), manager.getId()));
        verify(shiftAssignmentRepository, never()).deleteAll(any());
        verifyNoInteractions(blackoutDateRepository);
        verifyNoInteractions(shiftRepository);
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
