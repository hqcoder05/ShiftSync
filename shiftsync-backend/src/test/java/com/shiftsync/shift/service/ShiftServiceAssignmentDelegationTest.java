package com.shiftsync.shift.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.shift.dto.ShiftCreateRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftServiceAssignmentDelegationTest {
    @Mock private AuditLogService auditLogService;
    @Mock private ShiftRepository shiftRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private com.shiftsync.store.repository.StoreConfigurationRepository storeConfigurationRepository;
    @Mock private ShiftTemplateRepository shiftTemplateRepository;
    @Mock private com.shiftsync.skill.repository.SkillRepository skillRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private com.shiftsync.auth.repository.UserRepository userRepository;
    @Mock private com.shiftsync.payroll.repository.PayrollPeriodRepository payrollPeriodRepository;
    @Mock private com.shiftsync.notification.service.NotificationService notificationService;
    @Mock private com.shiftsync.layout.repository.StoreZoneRepository storeZoneRepository;
    @Mock private com.shiftsync.skill.repository.StaffSkillRepository staffSkillRepository;
    @Mock private com.shiftsync.employment.repository.EmploymentRepository employmentRepository;
    @Mock private ShiftAssignmentValidator shiftAssignmentValidator;
    @Mock private ShiftAssignmentService shiftAssignmentService;

    private UUID storeId;
    private UUID staffId;
    private ShiftService service;

    @BeforeEach
    void setUp() {
        service = new ShiftService(auditLogService, shiftRepository, storeRepository, storeConfigurationRepository,
                shiftTemplateRepository, skillRepository, shiftAssignmentRepository, userRepository,
                payrollPeriodRepository, notificationService, storeZoneRepository, staffSkillRepository,
                employmentRepository, shiftAssignmentValidator, shiftAssignmentService);
        storeId = UUID.randomUUID();
        staffId = UUID.randomUUID();
    }

    @Test
    void createShiftWithStaff_DelegatesToValidatedAssignmentService() {
        Store store = Store.builder().id(storeId).openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(22, 0)).build();
        Shift saved = Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(LocalDate.of(2026, 9, 21))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build();
        ShiftCreateRequest request = new ShiftCreateRequest();
        request.setShiftDate(saved.getShiftDate());
        request.setStartTime(saved.getStartTime());
        request.setEndTime(saved.getEndTime());
        request.setStaffId(staffId);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any()))
                .thenReturn(false);
        when(storeConfigurationRepository.findByStoreId(storeId)).thenReturn(Optional.empty());
        when(shiftRepository.save(any(Shift.class))).thenReturn(saved);

        service.createShift(storeId, request);

        verify(shiftAssignmentService).assignStaffToShift(storeId, saved.getId(), staffId);
        verify(shiftAssignmentRepository, never()).save(any());
    }
}
