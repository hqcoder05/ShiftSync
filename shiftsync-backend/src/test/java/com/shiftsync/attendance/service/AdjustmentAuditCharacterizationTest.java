package com.shiftsync.attendance.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.attendance.entity.*;
import com.shiftsync.attendance.enums.*;
import com.shiftsync.attendance.repository.*;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.repository.*;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.shared.security.SystemRole;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Passing tests document existing bugs in approval. */
@ExtendWith(MockitoExtension.class)
class AdjustmentAuditCharacterizationTest {
    @Mock AuditLogService auditLogService;
    @Mock AttendanceAdjustmentRequestRepository requestRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock ShiftRepository shiftRepository;
    @Mock ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock UserRepository userRepository;
    @Mock PayrollPeriodRepository payrollPeriodRepository;
    @Mock StoreConfigurationRepository storeConfigurationRepository;
    @Mock EmploymentRepository employmentRepository;
    @Mock NotificationService notificationService;
    @InjectMocks AttendanceAdjustmentService service;

    @Test void approvalPersistsCheckoutEarlierThanExistingCheckin() {
        var attendance=approve(null,OffsetDateTime.parse("2030-11-04T08:00:00+07:00"));
        assertTrue(attendance.getCheckOutTime().isBefore(attendance.getCheckInTime()));
        verify(attendanceRepository).save(attendance);
    }

    @Test void utcCheckinAtTenLocalIsMarkedPresentForNineLocalShift() {
        var attendance=approve(OffsetDateTime.parse("2030-11-04T03:00:00Z"),null);
        assertEquals(10,attendance.getCheckInTime().atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).getHour());
        assertEquals(AttendanceStatus.PRESENT,attendance.getStatus());
    }

    @Test void checkoutApprovalLosesLateStatusWhenAttendanceAppearedAfterSubmission() {
        var attendance=approveCheckout("09:10","17:00",AttendanceStatus.LATE,false,"17:00");
        assertEquals(10,attendance.getCheckInTime().getMinute());
        assertEquals(AttendanceStatus.PRESENT,attendance.getStatus());
    }

    @Test void approvedEarlyCheckoutIsStillMarkedPresent() {
        var attendance=approveCheckout("09:00","17:00",AttendanceStatus.PRESENT,true,"15:00");
        assertEquals(15,attendance.getCheckOutTime().getHour());
        assertEquals(AttendanceStatus.PRESENT,attendance.getStatus());
    }

    private Attendance approveCheckout(String existingIn,String existingOut,AttendanceStatus status,boolean linked,String requestedOut) {
        var date=LocalDate.of(2030,11,4);
        var store=Store.builder().id(UUID.randomUUID()).build();
        var staff=User.builder().id(UUID.randomUUID()).fullName("Staff").build();
        var manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.ADMIN).build();
        var shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(date).startTime(LocalTime.of(9,0))
                .endTime(LocalTime.of(17,0)).status(com.shiftsync.shift.enums.ShiftStatus.PUBLISHED).build();
        var assignment=ShiftAssignment.builder().id(UUID.randomUUID()).staff(staff).shift(shift).build();
        var attendance=Attendance.builder().id(UUID.randomUUID()).shiftAssignment(assignment).status(status)
                .checkInTime(date.atTime(LocalTime.parse(existingIn)).atOffset(ZoneOffset.ofHours(7)))
                .checkOutTime(date.atTime(LocalTime.parse(existingOut)).atOffset(ZoneOffset.ofHours(7))).build();
        var request=AttendanceAdjustmentRequest.builder().id(UUID.randomUUID()).shift(shift).staff(staff)
                .attendance(linked?attendance:null).status(AdjustmentStatus.PENDING)
                .requestedCheckOut(date.atTime(LocalTime.parse(requestedOut)).atOffset(ZoneOffset.ofHours(7))).build();
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(attendanceRepository.save(attendance)).thenReturn(attendance);
        when(requestRepository.save(request)).thenReturn(request);
        if(!linked) {
            when(shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(),staff.getId())).thenReturn(Optional.of(assignment));
            when(attendanceRepository.findByShiftAssignmentId(assignment.getId())).thenReturn(Optional.of(attendance));
        }
        service.approveRequest(store.getId(),request.getId(),manager.getId());
        verify(attendanceRepository).save(attendance);
        assertEquals(AdjustmentStatus.APPROVED,request.getStatus());
        return attendance;
    }

    private Attendance approve(OffsetDateTime checkin,OffsetDateTime checkout) {
        var store=Store.builder().id(UUID.randomUUID()).build();
        var staff=User.builder().id(UUID.randomUUID()).fullName("Staff").build();
        var manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.ADMIN).build();
        var shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(LocalDate.of(2030,11,4)).startTime(LocalTime.of(9,0)).build();
        var attendance=Attendance.builder().id(UUID.randomUUID()).shiftAssignment(ShiftAssignment.builder().staff(staff).shift(shift).build())
                .checkInTime(OffsetDateTime.parse("2030-11-04T09:00:00+07:00"))
                .checkOutTime(OffsetDateTime.parse("2030-11-04T17:00:00+07:00")).build();
        var request=AttendanceAdjustmentRequest.builder().id(UUID.randomUUID()).shift(shift).staff(staff).attendance(attendance)
                .status(AdjustmentStatus.PENDING).requestedCheckIn(checkin).requestedCheckOut(checkout).build();
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(attendanceRepository.save(attendance)).thenReturn(attendance);
        when(requestRepository.save(request)).thenReturn(request);
        service.approveRequest(store.getId(),request.getId(),manager.getId());
        return attendance;
    }
}
