package com.shiftsync.job;

import com.shiftsync.auth.entity.User;
import com.shiftsync.notification.entity.NotificationType;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Characterizes wrong local-time query and missing shift-status filtering. */
class ReminderAuditTest {
    @Test void midnightWrappingWindowQueriesAnImpossibleSameDayTimeRange() {
        var configs=mock(StoreConfigurationRepository.class);
        var assignments=mock(ShiftAssignmentRepository.class);
        var notifications=mock(NotificationService.class);
        var store=UUID.randomUUID();
        when(configs.findAll()).thenReturn(List.of(StoreConfiguration.builder().storeId(store).shiftReminderHours(2).build()));
        var fixed=OffsetDateTime.parse("2030-11-04T21:45:00Z");
        var shift=Shift.builder().shiftDate(fixed.toLocalDate()).startTime(LocalTime.of(23,50)).status(ShiftStatus.PUBLISHED).build();
        var assignment=ShiftAssignment.builder().staff(User.builder().id(UUID.randomUUID()).build()).shift(shift).build();
        when(assignments.findByShift_Store_IdAndShift_ShiftDateAndShift_StartTimeBetween(any(),any(),any(),any()))
                .thenAnswer(call->{LocalTime low=call.getArgument(2),high=call.getArgument(3);
                    return !shift.getStartTime().isBefore(low)&&!shift.getStartTime().isAfter(high)?List.of(assignment):List.of();});
        try(var clock=mockStatic(OffsetDateTime.class)) {
            clock.when(()->OffsetDateTime.now(ZoneOffset.UTC)).thenReturn(fixed);
            new ShiftReminderJob(configs,assignments,notifications).sendShiftReminders();
        }
        verify(assignments).findByShift_Store_IdAndShift_ShiftDateAndShift_StartTimeBetween(
                store,fixed.toLocalDate(),LocalTime.of(23,45),LocalTime.MIDNIGHT);
        var expectedWindow=fixed.plusHours(2).toLocalDateTime();
        var shiftStart=shift.getShiftDate().atTime(shift.getStartTime());
        assertTrue(!shiftStart.isBefore(expectedWindow)&&shiftStart.isBefore(expectedWindow.plusMinutes(15)));
        verifyNoInteractions(notifications);
    }

    @Test void reminderQueriesUtcWallClockAndNotifiesCancelledShift() {
        var configs=mock(StoreConfigurationRepository.class);
        var assignments=mock(ShiftAssignmentRepository.class);
        var notifications=mock(NotificationService.class);
        var store=UUID.randomUUID();var staff=UUID.randomUUID();
        when(configs.findAll()).thenReturn(List.of(StoreConfiguration.builder().storeId(store).shiftReminderHours(2).build()));
        var shift=Shift.builder().status(ShiftStatus.CANCELLED).startTime(LocalTime.of(9,0)).build();
        var assignment=ShiftAssignment.builder().staff(User.builder().id(staff).build()).shift(shift).build();
        when(assignments.findByShift_Store_IdAndShift_ShiftDateAndShift_StartTimeBetween(any(),any(),any(),any()))
                .thenReturn(List.of(assignment));
        var before=OffsetDateTime.now(ZoneOffset.UTC).plusHours(2);
        new ShiftReminderJob(configs,assignments,notifications).sendShiftReminders();
        var date=ArgumentCaptor.forClass(LocalDate.class);
        var start=ArgumentCaptor.forClass(LocalTime.class);
        verify(assignments).findByShift_Store_IdAndShift_ShiftDateAndShift_StartTimeBetween(eq(store),date.capture(),start.capture(),any());
        assertTrue(Math.abs(Duration.between(before.toLocalDateTime(),LocalDateTime.of(date.getValue(),start.getValue())).toSeconds())<30);
        assertTrue(Math.abs(Duration.between(before.atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime(),
                LocalDateTime.of(date.getValue(),start.getValue())).toHours())>=6);
        verify(notifications).sendNotification(eq(staff),eq(NotificationType.SHIFT_REMINDER),anyString(),anyString(),isNull());
    }
}
