package com.shiftsync.job;

import com.shiftsync.auth.entity.User;
import com.shiftsync.notification.entity.NotificationType;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class ReminderAuditTest {
    @Test void midnightWindowUsesBothDatesAndFiltersCancelledShifts() {
        var configs=mock(StoreConfigurationRepository.class);
        var assignments=mock(ShiftAssignmentRepository.class);
        var notifications=mock(NotificationService.class);
        var store=UUID.randomUUID();var staff=UUID.randomUUID();
        when(configs.findAll()).thenReturn(List.of(StoreConfiguration.builder().storeId(store).shiftReminderHours(2).build()));
        var published=ShiftAssignment.builder().staff(User.builder().id(staff).build())
                .shift(Shift.builder().status(ShiftStatus.PUBLISHED).startTime(LocalTime.of(0,5)).build()).build();
        var cancelled=ShiftAssignment.builder().staff(User.builder().id(UUID.randomUUID()).build())
                .shift(Shift.builder().status(ShiftStatus.CANCELLED).startTime(LocalTime.of(23,55)).build()).build();
        var now=LocalDateTime.of(2030,11,4,21,55);
        when(assignments.findPublishedReminders(store,LocalDate.of(2030,11,4),LocalTime.of(23,55),
                LocalDate.of(2030,11,5),LocalTime.of(0,10))).thenReturn(List.of(published,cancelled));
        new ShiftReminderJob(configs,assignments,notifications).sendShiftRemindersAt(now);
        verify(notifications).sendNotification(eq(staff),eq(NotificationType.SHIFT_REMINDER),anyString(),anyString(),isNull());
        verifyNoMoreInteractions(notifications);
    }
}
