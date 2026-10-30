package com.shiftsync.shift.service;

import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Passing characterizations of service defects; no database writes. */
class ShiftUpdateAuditTest {
    final ShiftRepository shifts=mock(ShiftRepository.class);
    final ShiftAssignmentRepository assignments=mock(ShiftAssignmentRepository.class);
    final StoreRepository stores=mock(StoreRepository.class);
    final AttendanceRepository attendance=mock(AttendanceRepository.class);
    final SkillRepository skills=mock(SkillRepository.class);
    final ShiftAssignmentService assignmentService=mock(ShiftAssignmentService.class);
    final com.shiftsync.payroll.repository.PayrollPeriodRepository payroll=mock(com.shiftsync.payroll.repository.PayrollPeriodRepository.class);
    final ShiftAssignmentValidator validator=new ShiftAssignmentValidator(null,null,assignments,null,skills,null);
    final Store store=Store.builder().id(UUID.randomUUID()).name("Audit")
            .openTime(LocalTime.of(6,0)).closeTime(LocalTime.of(23,0)).build();
    final User person=User.builder().id(UUID.randomUUID()).fullName("Original staff").build();
    final Shift shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(LocalDate.of(2030,11,4))
            .startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).status(ShiftStatus.PUBLISHED).build();
    final ShiftAssignment original=ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(person).build();

    ShiftService service() {
        shift.getAssignments().add(original);
        when(shifts.findByIdAndStoreId(shift.getId(),store.getId())).thenReturn(Optional.of(shift));
        when(shifts.save(any())).thenAnswer(call->call.getArgument(0));
        when(assignments.findByShiftId(shift.getId())).thenReturn(List.of(original));
        return new ShiftService(mock(AuditLogService.class),shifts,stores,mock(StoreConfigurationRepository.class),
                mock(ShiftTemplateRepository.class),skills,assignments,null,payroll,
                mock(com.shiftsync.notification.service.NotificationService.class),
                mock(com.shiftsync.layout.repository.StoreZoneRepository.class),null,null,validator,assignmentService,attendance);
    }

    @Test void replacingStaffThroughShiftUpdateBypassesExistingAttendanceGuard() {
        var service=service();
        when(attendance.existsByShiftAssignment_Shift_Id(shift.getId())).thenReturn(true);
        when(attendance.existsByShiftAssignmentId(original.getId())).thenReturn(true);
        when(assignments.findWithLockByShiftIdAndStaffId(shift.getId(),person.getId())).thenReturn(Optional.of(original));
        // The ordinary removal path correctly rejects exactly this original assignment.
        var removal=new ShiftAssignmentService(shifts,assignments,null,null,payroll,null,null,null,null,null,attendance);
        var rejected=assertThrows(BusinessException.class,()->removal.unassignStaffFromShift(store.getId(),shift.getId(),person.getId()));
        assertTrue(rejected.getMessage().contains("attendance"));
        verify(assignments,never()).delete(any());
        clearInvocations(attendance);
        var replacement=UUID.randomUUID();
        var request=new ShiftCreateRequest();request.setStaffId(replacement);
        request.setShiftDate(shift.getShiftDate());request.setStartTime(shift.getStartTime());request.setEndTime(shift.getEndTime());
        service.updateShift(store.getId(),shift.getId(),request);
        verify(assignments).deleteAll(List.of(original));
        verify(assignmentService).assignStaffToShift(store.getId(),shift.getId(),replacement);
        verifyNoInteractions(attendance);
    }

    @Test void changingAssignedShiftsTimeRejectsItsOwnExistingAssignment() {
        var service=service();
        when(assignments.existsByShiftIdAndStaffId(shift.getId(),person.getId())).thenReturn(true);
        var noteOnly=new ShiftCreateRequest();noteOnly.setNote("Only note");
        noteOnly.setShiftDate(shift.getShiftDate());noteOnly.setStartTime(shift.getStartTime());noteOnly.setEndTime(shift.getEndTime());
        assertDoesNotThrow(()->service.updateShift(store.getId(),shift.getId(),noteOnly));
        var request=new ShiftCreateRequest();request.setShiftDate(shift.getShiftDate());request.setStartTime(LocalTime.of(9,0));request.setEndTime(LocalTime.of(17,0));
        var rejected=assertThrows(BusinessException.class,()->service.updateShift(store.getId(),shift.getId(),request));
        assertEquals("Staff is already assigned to this shift",rejected.getMessage());
        verify(assignments).existsByShiftIdAndStaffId(shift.getId(),person.getId());
    }

    @Test void changingRequiredRoleReportsOldRoleAssignmentAsNewRoleCoverage() {
        var service=service();shift.setStatus(ShiftStatus.DRAFT);
        var oldRole=Skill.builder().id(UUID.randomUUID()).name("Cashier").build();
        var newRole=Skill.builder().id(UUID.randomUUID()).name("Kitchen").build();
        original.setRequiredSkillId(oldRole.getId());
        shift.getRequirements().add(ShiftSkillRequirement.builder().id(UUID.randomUUID()).shift(shift).skill(oldRole).requiredCount(1).build());
        when(skills.findByIdAndStoreId(newRole.getId(),store.getId())).thenReturn(Optional.of(newRole));
        var requirement=new ShiftRequirementRequest();requirement.setSkillId(newRole.getId());requirement.setRequiredCount(1);
        var result=service.setShiftRequirements(store.getId(),shift.getId(),List.of(requirement));
        assertEquals(oldRole.getId(),result.getShiftAssignments().get(0).getRequiredSkillId());
        assertEquals(newRole.getId(),result.getSkillRequirements().get(0).getSkillId());
        assertEquals(1,result.getSkillRequirements().get(0).getAssignedCount());
        assertEquals(0,result.getSkillRequirements().get(0).getShortageCount());
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        when(shifts.findByStoreIdAndShiftDateBetween(store.getId(),shift.getShiftDate(),shift.getShiftDate())).thenReturn(List.of(shift));
        service.publishShifts(store.getId(),shift.getShiftDate(),shift.getShiftDate(),UUID.randomUUID());
        assertEquals(ShiftStatus.PUBLISHED,shift.getStatus());
        assertEquals(oldRole.getId(),original.getRequiredSkillId());
    }
}
