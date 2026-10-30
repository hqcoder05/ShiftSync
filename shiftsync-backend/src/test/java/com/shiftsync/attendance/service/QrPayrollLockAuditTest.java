package com.shiftsync.attendance.service;

import com.shiftsync.attendance.dto.QrScanRequestDTO;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.JwtTokenProvider;
import com.shiftsync.shared.websocket.RealtimeEventPublisher;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.store.entity.*;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class QrPayrollLockAuditTest {
    @Test void lockedPayrollRejectsSelfieButQrStillWritesCheckout() {
        var attendance=mock(AttendanceRepository.class);
        var assignments=mock(ShiftAssignmentRepository.class);
        var config=mock(StoreConfigurationRepository.class);
        var jwt=mock(JwtTokenProvider.class);
        var payroll=mock(PayrollCalculationService.class);
        var zone=ZoneId.of("Asia/Ho_Chi_Minh");
        var now=LocalDateTime.now(zone);
        var begin=now.minusHours(4);
        var store=Store.builder().id(UUID.randomUUID()).latitude(BigDecimal.TEN).longitude(BigDecimal.valueOf(106)).build();
        var shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(begin.toLocalDate())
                .startTime(begin.toLocalTime()).endTime(now.toLocalTime()).status(ShiftStatus.PUBLISHED).build();
        var person=User.builder().id(UUID.randomUUID()).build();
        var assignment=ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(person).build();
        var row=Attendance.builder().id(UUID.randomUUID()).shiftAssignment(assignment)
                .checkInTime(begin.atZone(zone).toOffsetDateTime()).status(AttendanceStatus.PRESENT).build();
        when(assignments.findByShiftIdAndStaffId(shift.getId(),person.getId())).thenReturn(Optional.of(assignment));
        when(payroll.isDateLocked(store.getId(),shift.getShiftDate())).thenReturn(true);
        when(config.findByStoreId(store.getId())).thenReturn(Optional.of(StoreConfiguration.builder().build()));
        when(jwt.getShiftIdFromQrToken("valid-qr")).thenReturn(shift.getId().toString());
        when(attendance.findByShiftAssignmentId(assignment.getId())).thenReturn(Optional.of(row));
        when(attendance.save(any())).thenAnswer(call->call.getArgument(0));
        var service=new AttendanceService(attendance,assignments,mock(ShiftRepository.class),config,jwt,
                mock(RealtimeEventPublisher.class),payroll);
        var rejected=assertThrows(BusinessException.class,()->service.submitSelfie(person.getId(),shift.getId(),10,106,new byte[]{1}));
        assertTrue(rejected.getMessage().contains("Payroll"));
        verify(attendance,never()).save(any());
        clearInvocations(payroll);
        var request=new QrScanRequestDTO();request.setQrToken("valid-qr");request.setLatitude(10.0);request.setLongitude(106.0);
        var result=service.scanQr(person.getId(),request);
        assertNotNull(result.getCheckOutTime());
        verify(attendance).save(row);
        verifyNoInteractions(payroll);
    }
}
