package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftServiceQaTest {

    @Mock
    private ShiftRepository shiftRepository;

    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ShiftService shiftService;

    @Mock
    private com.shiftsync.payroll.repository.PayrollPeriodRepository payrollPeriodRepository;

    @Test
    void testDeleteShift_PublishedWithAssignments_TransitionsToCancelled() {
        UUID storeId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();

        Store store = Store.builder().id(storeId).build();
        Shift shift = Shift.builder()
                .id(shiftId)
                .store(store)
                .shiftDate(LocalDate.now().plusDays(1))
                .status(ShiftStatus.PUBLISHED)
                .build();

        ShiftAssignment sa = ShiftAssignment.builder()
                .shift(shift)
                .staff(User.builder().id(UUID.randomUUID()).build())
                .build();

        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(Collections.singletonList(sa));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);

        ShiftService serviceToTest = new ShiftService(
            mock(com.shiftsync.audit.service.AuditLogService.class),
            shiftRepository,
            mock(com.shiftsync.store.repository.StoreRepository.class),
            mock(com.shiftsync.store.repository.StoreConfigurationRepository.class),
            mock(com.shiftsync.shift.repository.ShiftTemplateRepository.class),
            mock(com.shiftsync.skill.repository.SkillRepository.class),
            shiftAssignmentRepository,
            mock(com.shiftsync.auth.repository.UserRepository.class),
            payrollPeriodRepository,
            notificationService,
            mock(com.shiftsync.layout.repository.StoreZoneRepository.class),
            mock(com.shiftsync.skill.repository.StaffSkillRepository.class),
            mock(com.shiftsync.employment.repository.EmploymentRepository.class),
            mock(com.shiftsync.shift.service.ShiftAssignmentValidator.class),
            mock(com.shiftsync.shift.service.ShiftAssignmentService.class),
            mock(com.shiftsync.attendance.repository.AttendanceRepository.class)
        );

        // Simulate notification failure
        doThrow(new RuntimeException("Notification service down")).when(notificationService)
                .sendNotification(any(), any(), any(), any(), any());

        assertDoesNotThrow(() -> serviceToTest.deleteShift(storeId, shiftId));

        // Verify status changed to cancelled and saved despite exception
        assertEquals(ShiftStatus.CANCELLED, shift.getStatus());
        verify(shiftRepository).save(shift);
        
        // Verify NO hard deletion occurred
        verify(shiftAssignmentRepository, never()).deleteAll(any());
        verify(shiftRepository, never()).delete(any());
        
        // Verify notification attempt
        verify(notificationService).sendNotification(any(), any(), any(), any(), any());
    }
}
