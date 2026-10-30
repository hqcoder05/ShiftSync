package com.shiftsync.shift.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.shift.dto.ShiftCreateRequest;
import com.shiftsync.shift.dto.ShiftPublishResultDTO;
import com.shiftsync.shift.enums.ShiftStatus;
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

    @Test
    void createShiftPersistsNoteColorRoleAndTemplate() {
        Store store = Store.builder().id(storeId).openTime(LocalTime.of(6,0)).closeTime(LocalTime.of(23,0)).build();
        UUID skillId=UUID.randomUUID(),templateId=UUID.randomUUID();
        com.shiftsync.skill.entity.Skill skill=new com.shiftsync.skill.entity.Skill();
        skill.setId(skillId);skill.setName("Barista");
        com.shiftsync.shift.entity.ShiftTemplate template=new com.shiftsync.shift.entity.ShiftTemplate();template.setId(templateId);
        ShiftCreateRequest request=new ShiftCreateRequest();request.setShiftDate(LocalDate.of(2026,11,1));
        request.setStartTime(LocalTime.of(8,0));request.setEndTime(LocalTime.of(16,0));
        request.setNote("Bàn giao máy pha");request.setColor("#8DD9CC");request.setSkillId(skillId);request.setShiftTemplateId(templateId);
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(skillRepository.findByIdAndStoreId(skillId,storeId)).thenReturn(Optional.of(skill));
        when(shiftTemplateRepository.findByIdAndStoreId(templateId,storeId)).thenReturn(Optional.of(template));
        when(storeZoneRepository.findByStoreId(storeId)).thenReturn(java.util.List.of());
        when(shiftRepository.save(any())).thenAnswer(invocation->{Shift saved=invocation.getArgument(0);saved.setId(UUID.randomUUID());return saved;});
        com.shiftsync.shift.dto.ShiftDTO result=service.createShift(storeId,request);
        org.junit.jupiter.api.Assertions.assertEquals("Bàn giao máy pha",result.getNote());
        org.junit.jupiter.api.Assertions.assertEquals("#8DD9CC",result.getColor());
        org.junit.jupiter.api.Assertions.assertEquals(skillId,result.getSkillId());
        org.junit.jupiter.api.Assertions.assertEquals(templateId,result.getShiftTemplateId());
        org.junit.jupiter.api.Assertions.assertEquals(1,result.getRequiredStaff());
    }

    @Test
    void updateMultiStaffShiftMustNotDeleteOtherAssignments() {
        Store store=Store.builder().id(storeId).build();UUID shiftId=UUID.randomUUID();
        com.shiftsync.auth.entity.User first=new com.shiftsync.auth.entity.User();first.setId(UUID.randomUUID());
        com.shiftsync.auth.entity.User second=new com.shiftsync.auth.entity.User();second.setId(staffId);
        Shift shift=Shift.builder().id(shiftId).store(store).shiftDate(LocalDate.of(2026,11,1))
                .startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).build();
        var a=com.shiftsync.shift.entity.ShiftAssignment.builder().staff(first).shift(shift).build();
        var b=com.shiftsync.shift.entity.ShiftAssignment.builder().staff(second).shift(shift).build();
        shift.getAssignments().addAll(java.util.List.of(a,b));
        ShiftCreateRequest request=new ShiftCreateRequest();request.setShiftDate(shift.getShiftDate());
        request.setStartTime(shift.getStartTime());request.setEndTime(shift.getEndTime());request.setStaffId(staffId);
        when(shiftRepository.findByIdAndStoreId(shiftId,storeId)).thenReturn(Optional.of(shift));
        when(shiftRepository.save(any())).thenReturn(shift);
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(java.util.List.of(a,b));
        service.updateShift(storeId,shiftId,request);
        verify(shiftAssignmentRepository,never()).deleteAll(anyIterable());
        verify(shiftAssignmentService,never()).assignStaffToShift(any(),any(),any());
    }

    @Test
    void publishShiftsReturnsChangedAndAlreadyPublishedCountsWithoutDuplicateNotifications() {
        Store store = Store.builder().id(storeId).openTime(LocalTime.of(6, 0)).closeTime(LocalTime.of(23, 0)).build();
        LocalDate date = LocalDate.of(2026, 11, 1);
        Shift draft = Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(date)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).status(ShiftStatus.DRAFT).build();
        Shift published = Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(date)
                .startTime(LocalTime.of(16, 0)).endTime(LocalTime.of(22, 0)).status(ShiftStatus.PUBLISHED).build();

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, date, date)).thenReturn(java.util.List.of(draft, published));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any()))
                .thenReturn(false);
        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(storeId, date, date)).thenReturn(java.util.List.of());

        ShiftPublishResultDTO result = service.publishShifts(storeId, date, date, UUID.randomUUID());

        org.junit.jupiter.api.Assertions.assertEquals(2, result.getTotalShifts());
        org.junit.jupiter.api.Assertions.assertEquals(1, result.getPublishedCount());
        org.junit.jupiter.api.Assertions.assertEquals(1, result.getAlreadyPublishedCount());
        org.junit.jupiter.api.Assertions.assertEquals(0, result.getNotifiedStaffCount());
        org.junit.jupiter.api.Assertions.assertEquals(ShiftStatus.PUBLISHED, draft.getStatus());
        verify(shiftRepository).saveAll(java.util.List.of(draft, published));
        verify(notificationService, never()).sendNotification(any(), any(), any(), any(), any());
    }


}
