package com.shiftsync.attendance.service;

import com.shiftsync.shift.entity.Shift;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.core.convert.support.DefaultConversionService;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Regression tests for attendance validation. */
class AttendanceGeofenceAuditTest {
    @Test void draftShiftRejectsSelfieCheckin() {
        var attendance=mock(com.shiftsync.attendance.repository.AttendanceRepository.class);
        var assignments=mock(com.shiftsync.shift.repository.ShiftAssignmentRepository.class);
        var configs=mock(com.shiftsync.store.repository.StoreConfigurationRepository.class);
        var now=java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        var store=Store.builder().id(java.util.UUID.randomUUID()).latitude(BigDecimal.TEN).longitude(BigDecimal.valueOf(106)).build();
        var shift=Shift.builder().id(java.util.UUID.randomUUID()).store(store).shiftDate(now.toLocalDate())
                .startTime(now.toLocalTime()).endTime(now.plusHours(4).toLocalTime()).status(com.shiftsync.shift.enums.ShiftStatus.DRAFT).build();
        var staff=java.util.UUID.randomUUID();
        var assignment=com.shiftsync.shift.entity.ShiftAssignment.builder().id(java.util.UUID.randomUUID()).shift(shift)
                .staff(com.shiftsync.auth.entity.User.builder().id(staff).build()).build();
        when(assignments.findByShiftIdAndStaffId(shift.getId(),staff)).thenReturn(java.util.Optional.of(assignment));
        when(configs.findByStoreId(store.getId())).thenReturn(java.util.Optional.of(StoreConfiguration.builder().build()));
        when(attendance.save(any())).thenAnswer(invocation->invocation.getArgument(0));
        var service=new AttendanceService(attendance,assignments,mock(com.shiftsync.shift.repository.ShiftRepository.class),configs,
                mock(com.shiftsync.shared.security.JwtTokenProvider.class),mock(com.shiftsync.shared.websocket.RealtimeEventPublisher.class),null);
        com.shiftsync.support.TestStoreLock.installAttendance(service);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                () -> service.submitSelfie(staff,shift.getId(),10.0,106.0,new byte[]{1}));
        verify(attendance,never()).save(any());
    }

    @Test void multipartNaNCoordinateIsRejected() {
        double latitude=DefaultConversionService.getSharedInstance().convert("NaN",Double.class);
        var store=Store.builder().latitude(BigDecimal.valueOf(10)).longitude(BigDecimal.valueOf(106)).build();
        var shift=Shift.builder().store(store).build();
        var config=StoreConfiguration.builder().geofenceRadiusM(100).build();
        var service=mock(AttendanceService.class,CALLS_REAL_METHODS);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->ReflectionTestUtils.invokeMethod(service,"validateGeofence",shift,config,latitude,0.0));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->ReflectionTestUtils.invokeMethod(service,"validateGeofence",shift,config,Double.POSITIVE_INFINITY,106.0));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->ReflectionTestUtils.invokeMethod(service,"validateGeofence",shift,config,0.0,0.0));
        assertDoesNotThrow(()->ReflectionTestUtils.invokeMethod(service,"validateGeofence",shift,config,10.0,106.0));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->ReflectionTestUtils.invokeMethod(service,"validateGeofence",shift,config,91.0,106.0));
    }
}
