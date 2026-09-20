package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.SkillLevel;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ScheduleCoverageStatus;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class P1AlgorithmCorrectnessRegressionTest {
    @Mock ShiftRepository shiftRepository;
    @Mock ShiftAssignmentRepository assignmentRepository;
    @Mock EmploymentRepository employmentRepository;
    @Mock StaffSkillRepository staffSkillRepository;
    @Mock AvailabilityRepository availabilityRepository;
    @Mock BlackoutDateRepository blackoutDateRepository;
    @Mock StoreConfigurationRepository storeConfigurationRepository;
    @Mock SchedulerConfigurationRepository schedulerConfigurationRepository;
    @InjectMocks AutoScheduleService service;

    private final UUID storeId = UUID.randomUUID();
    private final UUID skillId = UUID.randomUUID();
    private final LocalDate date = LocalDate.of(2026, 9, 21);

    private AutoScheduleService.StaffData staff(LocalTime start, LocalTime end) {
        User user = User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        Employment employment = Employment.builder().user(user)
                .contractType(ContractType.builder().maxWeeklyHours(40).build()).build();
        AutoScheduleService.StaffData data = new AutoScheduleService.StaffData();
        data.setEmployment(employment);
        data.setSkills(List.of(StaffSkill.builder().staffId(user.getId()).skillId(skillId).level(SkillLevel.EXPERT).build()));
        data.setAvailabilities(List.of(Availability.builder().dayOfWeek((short) 1).startTime(start).endTime(end).build()));
        data.setBlackoutDates(List.of());
        data.setApprovedLeaveDates(Set.of());
        data.setCurrentSchedule(new ArrayList<>());
        return data;
    }

    @Test
    void overnightAvailabilityUsesDateAwareIntervals() {
        record Case(String name, LocalTime availabilityStart, LocalTime availabilityEnd,
                    LocalTime shiftStart, LocalTime shiftEnd, boolean expected) {}
        List<Case> cases = List.of(
                new Case("partial-overlap", LocalTime.of(20, 0), LocalTime.of(23, 0), LocalTime.of(22, 0), LocalTime.of(6, 0), false),
                new Case("full-overnight", LocalTime.of(22, 0), LocalTime.of(6, 0), LocalTime.of(22, 0), LocalTime.of(6, 0), true),
                new Case("nested-overnight", LocalTime.of(22, 0), LocalTime.of(6, 0), LocalTime.of(23, 0), LocalTime.of(2, 0), true),
                new Case("overnight-incomplete", LocalTime.of(22, 0), LocalTime.of(23, 0), LocalTime.of(23, 0), LocalTime.of(2, 0), false),
                new Case("starts-before-availability", LocalTime.of(23, 0), LocalTime.of(6, 0), LocalTime.of(22, 0), LocalTime.of(2, 0), false),
                new Case("normal-full", LocalTime.of(8, 0), LocalTime.of(18, 0), LocalTime.of(9, 0), LocalTime.of(17, 0), true),
                new Case("normal-insufficient", LocalTime.of(10, 0), LocalTime.of(18, 0), LocalTime.of(9, 0), LocalTime.of(17, 0), false)
        );
        for (Case c : cases) {
            Shift shift = Shift.builder().id(UUID.randomUUID()).shiftDate(date).startTime(c.shiftStart).endTime(c.shiftEnd).build();
            boolean actual = !service.findValidCandidates(new AutoScheduleService.Slot(shift, skillId),
                    List.of(staff(c.availabilityStart, c.availabilityEnd)), 0, 0.0).isEmpty();
            assertEquals(c.expected, actual, c.name);
        }
    }

    @Test
    void wrongSkillManualAssignmentDoesNotInflateOverallCoverage() {
        Skill requiredSkill = Skill.builder().id(skillId).name("Required").build();
        UUID wrongSkillId = UUID.randomUUID();
        User user = User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        Employment employment = Employment.builder().user(user).store(Store.builder().id(storeId).build())
                .status(EmploymentStatus.ACTIVE).contractType(ContractType.builder().maxWeeklyHours(40).build()).build();
        Shift shift = shiftWithRequirement(ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(requiredSkill).requiredCount(1).build());
        ShiftAssignment manual = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(user)
                .requiredSkillId(wrongSkillId).source(AssignmentSource.MANUAL).build();
        stubSchedule(shift, employment, List.of(), List.of(manual));

        var result = service.autoSchedule(storeId, request());
        assertEquals(0, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
        assertNotEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(1, result.getRequirementCoverages().get(0).getShortageCount());
    }

    @Test
    void correctSkillAndZoneManualAssignmentIsCountedOnce() {
        Skill requiredSkill = Skill.builder().id(skillId).name("Required").build();
        StoreZone zone = StoreZone.builder().id(UUID.randomUUID()).name("Zone").build();
        User user = User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        Employment employment = Employment.builder().user(user).store(Store.builder().id(storeId).build())
                .status(EmploymentStatus.ACTIVE).contractType(ContractType.builder().maxWeeklyHours(40).build()).build();
        ShiftSkillRequirement req = ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(requiredSkill).zone(zone).requiredCount(1).build();
        Shift shift = shiftWithRequirement(req);
        ShiftAssignment manual = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(user)
                .requiredSkillId(skillId).zone(zone).source(AssignmentSource.MANUAL).build();
        stubSchedule(shift, employment, List.of(StaffSkill.builder().staffId(user.getId()).skillId(skillId).level(SkillLevel.EXPERT).build()), List.of(manual));

        var result = service.autoSchedule(storeId, request());
        assertEquals(1, result.getTotalAssignedSlots());
        assertEquals(0, result.getShortageSlots());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(0, result.getRequirementCoverages().get(0).getShortageCount());
    }

    @Test
    void wrongOrNullZoneDoesNotSatisfyZoneRequirement() {
        Skill requiredSkill = Skill.builder().id(skillId).name("Required").build();
        StoreZone requiredZone = StoreZone.builder().id(UUID.randomUUID()).name("Required").build();
        StoreZone wrongZone = StoreZone.builder().id(UUID.randomUUID()).name("Wrong").build();
        User user = User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        Employment employment = Employment.builder().user(user).store(Store.builder().id(storeId).build())
                .status(EmploymentStatus.ACTIVE).contractType(ContractType.builder().maxWeeklyHours(40).build()).build();
        ShiftSkillRequirement req = ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(requiredSkill).zone(requiredZone).requiredCount(1).build();
        Shift shift = shiftWithRequirement(req);
        ShiftAssignment wrong = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(user)
                .requiredSkillId(skillId).zone(wrongZone).source(AssignmentSource.MANUAL).build();
        stubSchedule(shift, employment, List.of(StaffSkill.builder().staffId(user.getId()).skillId(skillId).level(SkillLevel.EXPERT).build()), List.of(wrong));

        var result = service.autoSchedule(storeId, request());
        assertEquals(0, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
        assertNotEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(1, result.getRequirementCoverages().get(0).getShortageCount());
    }

    private Shift shiftWithRequirement(ShiftSkillRequirement requirement) {
        return Shift.builder().id(UUID.randomUUID()).shiftDate(date).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.DRAFT).requirements(List.of(requirement)).build();
    }

    private AutoScheduleRequest request() {
        AutoScheduleRequest request = new AutoScheduleRequest();
        request.setStartDate(date);
        request.setEndDate(date);
        return request;
    }

    private void stubSchedule(Shift shift, Employment employment, List<StaffSkill> skills, List<ShiftAssignment> assignments) {
        when(storeConfigurationRepository.findByStoreId(storeId)).thenReturn(Optional.of(StoreConfiguration.builder().minRestHours(0).build()));
        when(schedulerConfigurationRepository.findByStoreId(storeId)).thenReturn(Optional.of(SchedulerConfiguration.builder()
                .skillWeight(BigDecimal.ZERO).hourWeight(BigDecimal.ZERO).fairnessWeight(BigDecimal.ZERO)
                .restTimeWeight(BigDecimal.ZERO).availabilityWeight(BigDecimal.ONE).build()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, date, date)).thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(employment));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(skills);
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(Availability.builder()
                .user(employment.getUser()).dayOfWeek((short) 1).startTime(LocalTime.MIN).endTime(LocalTime.MAX).build()));
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any())).thenReturn(List.of());
        when(assignmentRepository.findByShiftId(shift.getId())).thenReturn(assignments);
        when(assignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any())).thenReturn(assignments);
    }
}
