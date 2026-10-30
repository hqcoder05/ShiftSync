package com.shiftsync.workforce.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.shift.service.*;
import com.shiftsync.skill.entity.*;
import com.shiftsync.skill.repository.*;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.*;
import com.shiftsync.workforce.dto.WorkforceProposalCreateDTO;
import com.shiftsync.workforce.entity.*;
import com.shiftsync.workforce.enums.*;
import com.shiftsync.workforce.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Actual workforce, assignment and time validation services; repositories simulated. */
class WorkforceRoleStateAuditTest {
    final WorkforceRequestRepository requests=mock(WorkforceRequestRepository.class);
    final WorkforceProposalRepository proposals=mock(WorkforceProposalRepository.class);
    final ShiftAssignmentRepository assignments=mock(ShiftAssignmentRepository.class);
    final EmploymentRepository employment=mock(EmploymentRepository.class);
    final ShiftRepository shifts=mock(ShiftRepository.class);
    final StoreConfigurationRepository configs=mock(StoreConfigurationRepository.class);
    final SkillRepository skills=mock(SkillRepository.class);
    final StaffSkillRepository qualifications=mock(StaffSkillRepository.class);
    final UserRepository users=mock(UserRepository.class);
    final AvailabilityRepository availability=mock(AvailabilityRepository.class);
    final Store requesting=Store.builder().id(UUID.randomUUID()).name("Requesting").build();
    final Store target=Store.builder().id(UUID.randomUUID()).name("Target").build();
    final User manager=User.builder().id(UUID.randomUUID()).fullName("Manager").systemRole(SystemRole.MANAGER).build();
    final User staff=User.builder().id(UUID.randomUUID()).fullName("Cashier only").systemRole(SystemRole.STAFF).build();
    final Skill cashier=Skill.builder().id(UUID.randomUUID()).store(requesting).name("Cashier").build();
    final Skill kitchen=Skill.builder().id(UUID.randomUUID()).store(requesting).name("Kitchen").build();
    final LocalDate date=LocalDate.of(2030,11,3);
    final Shift shift=Shift.builder().id(UUID.randomUUID()).store(requesting).shiftDate(date)
            .startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).status(ShiftStatus.PUBLISHED).build();
    final WorkforceRequest request=WorkforceRequest.builder().id(UUID.randomUUID()).requestingStore(requesting)
            .targetStore(target).shift(shift).skill(kitchen).createdBy(manager).neededCount(1).status(WorkforceRequestStatus.PENDING).build();
    final List<ShiftAssignment> saved=new ArrayList<>();
    final Map<UUID,WorkforceProposal> proposed=new HashMap<>();

    WorkforceRequestService service() {
        when(users.findById(staff.getId())).thenReturn(Optional.of(staff));
        when(users.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(requests.findById(request.getId())).thenReturn(Optional.of(request));
        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));
        when(requests.save(any())).thenAnswer(call->call.getArgument(0));
        when(employment.existsByUserIdAndStoreIdAndStatus(eq(staff.getId()),eq(target.getId()),any())).thenReturn(true);
        when(employment.findByUserIdAndStatus(eq(staff.getId()),any())).thenReturn(List.of(Employment.builder()
                .user(staff).store(target).contractType(ContractType.builder().maxWeeklyHours(48).build()).build()));
        when(availability.findByUserId(staff.getId())).thenReturn(List.of(Availability.builder().user(staff)
                .dayOfWeek((short)0).startTime(LocalTime.of(6,0)).endTime(LocalTime.of(23,0)).build()));
        when(qualifications.findByStaffId(staff.getId())).thenReturn(List.of(StaffSkill.builder()
                .staffId(staff.getId()).skillId(cashier.getId()).level(SkillLevel.EXPERT).build()));
        when(skills.findById(cashier.getId())).thenReturn(Optional.of(cashier));
        when(assignments.countByShiftId(shift.getId())).thenAnswer(call->(long)saved.size());
        when(assignments.findByShiftId(shift.getId())).thenAnswer(call->new ArrayList<>(saved));
        when(assignments.save(any())).thenAnswer(call->{ShiftAssignment row=call.getArgument(0);saved.add(row);return row;});
        when(proposals.save(any())).thenAnswer(call->{WorkforceProposal row=call.getArgument(0);
            if(row.getId()==null)row.setId(UUID.randomUUID());proposed.put(row.getId(),row);return row;});
        when(proposals.findById(any())).thenAnswer(call->Optional.ofNullable(proposed.get(call.getArgument(0))));
        when(proposals.countByWorkforceRequestIdAndStatus(request.getId(),WorkforceProposalStatus.ACCEPTED))
                .thenAnswer(call->proposed.values().stream().filter(p->p.getStatus()==WorkforceProposalStatus.ACCEPTED).count());
        var time=new ShiftValidationService(shifts,employment,configs);
        var validator=new ShiftAssignmentValidator(availability,mock(BlackoutDateRepository.class),assignments,
                qualifications,skills,time,null,configs);
        return new WorkforceRequestService(requests,proposals,mock(StoreRepository.class),shifts,users,employment,
                validator,assignments,mock(AuditLogService.class),mock(NotificationService.class),skills);
    }
    ShiftSkillRequirement requirement(Skill skill,int count){return ShiftSkillRequirement.builder()
            .id(UUID.randomUUID()).shift(shift).skill(skill).requiredCount(count).build();}
    UUID propose(WorkforceRequestService service) {
        var dto=new WorkforceProposalCreateDTO();dto.setStaffId(staff.getId());
        return service.proposeStaff(target.getId(),request.getId(),dto,manager.getId()).getId();
    }

    @Test void kitchenSupportRequestAcceptsCashierOnlyStaffAndSavesNoRequiredRole() {
        shift.getRequirements().addAll(List.of(requirement(cashier,1),requirement(kitchen,1)));
        var service=service();var proposal=propose(service);
        service.respondToProposal(proposal,true,staff.getId());
        assertEquals(WorkforceRequestStatus.COMPLETED,request.getStatus());
        assertEquals(WorkforceProposalStatus.ACCEPTED,proposed.get(proposal).getStatus());
        assertEquals(kitchen.getId(),request.getSkill().getId());
        assertEquals(1,saved.size());
        assertEquals(staff.getId(),saved.get(0).getStaff().getId());
        assertNull(saved.get(0).getRequiredSkillId());
    }

    @Test void pendingProposalStillCreatesAssignmentAfterShiftIsCancelled() {
        request.setSkill(cashier);shift.getRequirements().add(requirement(cashier,2));
        saved.add(ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).requiredSkillId(cashier.getId())
                .staff(User.builder().id(UUID.randomUUID()).build()).build());
        var service=service();var proposal=propose(service);
        // Cancellation of a staffed published shift retains original assignments in production.
        shift.setStatus(ShiftStatus.CANCELLED);
        service.respondToProposal(proposal,true,staff.getId());
        assertEquals(ShiftStatus.CANCELLED,shift.getStatus());
        assertEquals(WorkforceRequestStatus.COMPLETED,request.getStatus());
        assertEquals(2,saved.size());
        assertEquals(staff.getId(),saved.get(1).getStaff().getId());
        verify(assignments).save(saved.get(1));
    }
}
