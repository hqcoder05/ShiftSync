package com.shiftsync.shift.service;

import com.shiftsync.availability.repository.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.skill.entity.*;
import com.shiftsync.skill.repository.*;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AvailabilityOverrideSafetyTest {
    private final UUID person=UUID.randomUUID();
    private final ShiftAssignmentRepository assignments=mock(ShiftAssignmentRepository.class);
    private final StaffSkillRepository skills=mock(StaffSkillRepository.class);
    private final SkillRepository knownSkills=mock(SkillRepository.class);
    private final ShiftAssignmentValidator validator=new ShiftAssignmentValidator(mock(AvailabilityRepository.class),mock(BlackoutDateRepository.class),assignments,skills,knownSkills,mock(ShiftValidationService.class));
    private final Skill barista=Skill.builder().id(UUID.randomUUID()).name("Barista").build();
    private final Skill cashier=Skill.builder().id(UUID.randomUUID()).name("Cashier").build();
    private Shift shift;
    @BeforeEach void setup(){
        shift=Shift.builder().id(UUID.randomUUID()).shiftDate(LocalDate.of(2030,11,4)).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0))
                .requirements(List.of(ShiftSkillRequirement.builder().skill(barista).requiredCount(1).build(),ShiftSkillRequirement.builder().skill(cashier).requiredCount(1).build())).build();
    }
    private void cashierSkill(LocalDate expiry){when(skills.findByStaffId(person)).thenReturn(List.of(StaffSkill.builder().skillId(cashier.getId()).expirationDate(expiry).build()));}
    @Test void voluntaryClaimCanSkipAvailabilityButSelectsMatchingVacancy(){
        cashierSkill(null);
        assertDoesNotThrow(()->validator.validateEligibility(shift,person,true));
        assertEquals(cashier.getId(),validator.selectClaimSkill(shift,person));
        assertThrows(BusinessException.class,()->validator.validateEligibility(shift,person,false));
    }
    @Test void overrideCannotBypassMissingSkill(){
        assertThrows(BusinessException.class,()->validator.validateEligibility(shift,person,true));
        assertThrows(BusinessException.class,()->validator.selectClaimSkill(shift,person));
    }
    @Test void overrideCannotBypassExpiredSkill(){
        cashierSkill(shift.getShiftDate().minusDays(1));
        assertThrows(BusinessException.class,()->validator.validateEligibility(shift,person,true));
        assertThrows(BusinessException.class,()->validator.selectClaimSkill(shift,person));
    }
    @Test void overrideCannotTakeAnotherRoleWhenOnlyMatchingRoleIsFull(){
        cashierSkill(null);
        when(assignments.findByShiftId(shift.getId())).thenReturn(List.of(ShiftAssignment.builder().requiredSkillId(cashier.getId()).build()));
        when(assignments.countByShiftId(shift.getId())).thenReturn(1L);
        assertThrows(BusinessException.class,()->validator.validateEligibility(shift,person,true));
        assertThrows(BusinessException.class,()->validator.selectClaimSkill(shift,person));
    }
    @Test void overrideCannotExceedTotalCapacity(){
        cashierSkill(null);when(assignments.countByShiftId(shift.getId())).thenReturn(2L);
        assertThrows(BusinessException.class,()->validator.validateEligibility(shift,person,true));
    }
    @Test void genericShiftStillHasOneSlotWhenAvailabilityIsOverridden(){
        shift=Shift.builder().id(UUID.randomUUID()).shiftDate(shift.getShiftDate())
                .startTime(shift.getStartTime()).endTime(shift.getEndTime()).build();
        when(assignments.countByShiftId(shift.getId())).thenReturn(1L);
        assertThrows(BusinessException.class,()->validator.validateEligibility(shift,person,true));
    }
    @Test void equivalentSkillNameStillResolvesTargetStoreRole(){
        UUID external=UUID.randomUUID();
        when(skills.findByStaffId(person)).thenReturn(List.of(StaffSkill.builder().skillId(external).build()));
        when(knownSkills.findById(external)).thenReturn(Optional.of(Skill.builder().id(external).name(" cashier ").build()));
        assertDoesNotThrow(()->validator.validateEligibility(shift,person,true));
        assertEquals(cashier.getId(),validator.selectClaimSkill(shift,person));
    }
}
