package com.shiftsync.attendance.service;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExplicitSelfieTest {
    @Test void retryDoesNotBecomeCheckoutAndPreservesCaptureTime() {
        var attendance = mock(AttendanceRepository.class);
        var assignments = mock(ShiftAssignmentRepository.class);
        var configs = mock(StoreConfigurationRepository.class);
        var now = OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).withNano(0);
        var store = Store.builder().id(UUID.randomUUID()).latitude(BigDecimal.TEN).longitude(BigDecimal.valueOf(106)).build();
        var shift = Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(now.toLocalDate()).startTime(now.toLocalTime()).endTime(now.plusHours(4).toLocalTime()).status(ShiftStatus.PUBLISHED).build();
        var staff = User.builder().id(UUID.randomUUID()).build();
        var assignment = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(staff).build();
        when(assignments.findWithLockByShiftIdAndStaffId(shift.getId(), staff.getId())).thenReturn(Optional.of(assignment));
        when(configs.findByStoreId(store.getId())).thenReturn(Optional.of(StoreConfiguration.builder().build()));
        when(attendance.save(any())).thenAnswer(call -> call.getArgument(0));
        var service = new AttendanceService(attendance, assignments, mock(ShiftRepository.class), configs,
                mock(com.shiftsync.shared.security.JwtTokenProvider.class), mock(com.shiftsync.shared.websocket.RealtimeEventPublisher.class), null);
        com.shiftsync.support.TestStoreLock.installAttendance(service);
        when(attendance.findByShiftAssignmentId(assignment.getId())).thenReturn(Optional.empty());
        var first = service.submitSelfieExplicit(staff.getId(), shift.getId(), 10, 106, new byte[]{1}, "CHECK_IN", now);
        assertEquals(now.toInstant(), first.getCheckInTime().toInstant());
        when(attendance.findByShiftAssignmentId(assignment.getId())).thenReturn(Optional.of(first));
        assertSame(first, service.submitSelfieExplicit(staff.getId(), shift.getId(), 10, 106, new byte[]{1}, "CHECK_IN", now));
        assertNull(first.getCheckOutTime());
        assertThrows(BusinessException.class, () -> service.submitSelfieExplicit(staff.getId(), shift.getId(), 10, 106, new byte[]{2}, "CHECK_IN", now));
        assertThrows(BusinessException.class, () -> service.submitSelfieExplicit(staff.getId(), shift.getId(), 10, 106, new byte[]{1}, "CHECK_IN", now.plusSeconds(1)));
        verify(attendance, times(1)).save(any());
    }

    @Test void acknowledgesIdenticalRetryWithoutReopeningPayroll() {
        var repository = mock(AttendanceRepository.class);
        var assignments = mock(ShiftAssignmentRepository.class);
        var payroll = mock(com.shiftsync.payroll.service.PayrollCalculationService.class);
        var now = OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).withNano(0);
        var staff = UUID.randomUUID(); var shiftId = UUID.randomUUID(); var assignmentId = UUID.randomUUID();
        var assignment = ShiftAssignment.builder().id(assignmentId).build();
        var saved = Attendance.builder().shiftAssignment(assignment).checkInTime(now).checkInLat(10.0).checkInLng(106.0).checkInPhoto(new byte[]{1}).status(AttendanceStatus.PRESENT).build();
        when(assignments.findWithLockByShiftIdAndStaffId(shiftId, staff)).thenReturn(Optional.of(assignment));
        when(repository.findByShiftAssignmentId(assignmentId)).thenReturn(Optional.of(saved));
        var service = new AttendanceService(repository, assignments, mock(ShiftRepository.class), mock(StoreConfigurationRepository.class),
                mock(com.shiftsync.shared.security.JwtTokenProvider.class), mock(com.shiftsync.shared.websocket.RealtimeEventPublisher.class), payroll);
        assertSame(saved, service.submitSelfieExplicit(staff,shiftId,10,106,new byte[]{1},"CHECK_IN",now));
        verifyNoInteractions(payroll);
        verify(repository,never()).save(any());
    }

    @Test void rejectsMissingActionOrFutureCaptureBeforeDatabaseAccess() {
        var repository = mock(AttendanceRepository.class);
        var assignment = mock(ShiftAssignmentRepository.class);
        var service = new AttendanceService(repository, assignment, mock(ShiftRepository.class), mock(StoreConfigurationRepository.class),
                mock(com.shiftsync.shared.security.JwtTokenProvider.class), mock(com.shiftsync.shared.websocket.RealtimeEventPublisher.class), null);
        var user = UUID.randomUUID(); var shift = UUID.randomUUID();
        assertThrows(BusinessException.class, () -> service.submitSelfieExplicit(user, shift, 10, 106, new byte[]{1}, null, OffsetDateTime.now()));
        assertThrows(BusinessException.class, () -> service.submitSelfieExplicit(user, shift, 10, 106, new byte[]{1}, "CHECK_IN", OffsetDateTime.now().plusHours(1)));
        verifyNoInteractions(assignment);
    }
}
