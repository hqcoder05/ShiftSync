package com.shiftsync.attendance.service;

import com.shiftsync.attendance.dto.AttendanceUpdateRequest;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.shift.entity.*;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class AttendanceEditStatusAuditTest {
    Attendance edit(AttendanceStatus oldStatus,int oldOut,int newOut) {
        var repository=mock(AttendanceRepository.class);
        var store=Store.builder().id(UUID.randomUUID()).build();var date=LocalDate.of(2030,11,4);
        var shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(date)
                .startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).build();
        var assignment=ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(User.builder().id(UUID.randomUUID()).build()).build();
        var row=Attendance.builder().id(UUID.randomUUID()).shiftAssignment(assignment).status(oldStatus)
                .checkInTime(date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)))
                .checkOutTime(date.atTime(oldOut,0).atOffset(ZoneOffset.ofHours(7))).build();
        when(repository.findById(row.getId())).thenReturn(Optional.of(row));
        when(repository.save(any())).thenAnswer(call->call.getArgument(0));
        var service=new AttendanceService(repository,null,null,mock(StoreConfigurationRepository.class),null,
                mock(com.shiftsync.shared.websocket.RealtimeEventPublisher.class),
                mock(com.shiftsync.payroll.service.PayrollCalculationService.class));
        var request=new AttendanceUpdateRequest();request.setCheckOutTime(date.atTime(newOut,0).atOffset(ZoneOffset.ofHours(7)));
        service.updateAttendance(store.getId(),row.getId(),request);
        verify(repository).save(row);return row;
    }
    @Test void correctingEarlyCheckoutToShiftEndRetainsEarlyLeaveStatus() {
        var row=edit(AttendanceStatus.EARLY_LEAVE,15,17);
        assertEquals(17,row.getCheckOutTime().getHour());assertEquals(AttendanceStatus.EARLY_LEAVE,row.getStatus());
    }
    @Test void editingCheckoutToTwoHoursEarlyStillReportsPresent() {
        var row=edit(AttendanceStatus.PRESENT,17,15);
        assertEquals(15,row.getCheckOutTime().getHour());assertEquals(AttendanceStatus.PRESENT,row.getStatus());
    }
}
