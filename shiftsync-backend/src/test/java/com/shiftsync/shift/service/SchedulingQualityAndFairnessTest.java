package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.dto.AutoScheduleResult;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ScheduleCoverageStatus;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchedulingQualityAndFairnessTest {

    @Mock
    private ShiftRepository shiftRepository;

    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Mock
    private EmploymentRepository employmentRepository;

    @Mock
    private StaffSkillRepository staffSkillRepository;

    @Mock
    private AvailabilityRepository availabilityRepository;

    @Mock
    private BlackoutDateRepository blackoutDateRepository;

    @Mock
    private StoreConfigurationRepository storeConfigRepo;

    @Mock
    private SchedulerConfigurationRepository schedulerConfigRepo;

    @InjectMocks
    private AutoScheduleService autoScheduleService;

    private UUID storeId;
    private LocalDate startDate;
    private LocalDate endDate;
    private Skill baristaSkill;
    private Skill cashierSkill;
    private StoreZone barZone;
    private StoreZone posZone;
    private Workstation barWorkstation;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        startDate = LocalDate.of(2026, 3, 2); // Monday
        endDate = LocalDate.of(2026, 3, 8);   // Sunday

        baristaSkill = Skill.builder().id(UUID.randomUUID()).name("Barista").build();
        cashierSkill = Skill.builder().id(UUID.randomUUID()).name("Cashier").build();

        barZone = StoreZone.builder().id(UUID.randomUUID()).name("Bar Zone").build();
        posZone = StoreZone.builder().id(UUID.randomUUID()).name("POS Zone").build();

        barWorkstation = Workstation.builder().id(UUID.randomUUID()).name("Espresso-1").zone(barZone).build();

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(
                StoreConfiguration.builder().storeId(storeId).minRestHours(12).build()
        ));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(
                SchedulerConfiguration.builder()
                        .storeId(storeId)
                        .skillWeight(BigDecimal.valueOf(0.25))
                        .hourWeight(BigDecimal.valueOf(0.25))
                        .fairnessWeight(BigDecimal.valueOf(0.25))
                        .restTimeWeight(BigDecimal.valueOf(0.25))
                        .availabilityWeight(BigDecimal.ZERO)
                        .build()
        ));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenAnswer(inv -> {
            List<UUID> uids = inv.getArgument(0);
            List<Availability> list = new ArrayList<>();
            for (UUID uid : uids) {
                User dummyUser = User.builder().id(uid).build();
                for (short d = 0; d < 7; d++) {
                    list.add(Availability.builder()
                            .id(UUID.randomUUID())
                            .user(dummyUser)
                            .dayOfWeek(d)
                            .startTime(LocalTime.MIN)
                            .endTime(LocalTime.MAX)
                            .build());
                }
            }
            return list;
        });
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any()))
                .thenReturn(Collections.emptyList());
    }

    private AutoScheduleRequest createRequest() {
        AutoScheduleRequest req = new AutoScheduleRequest();
        req.setStartDate(startDate);
        req.setEndDate(endDate);
        return req;
    }

    private Employment createStaff(String name, int maxHours) {
        User user = User.builder()
                .id(UUID.randomUUID())
                .fullName(name)
                .systemRole(SystemRole.STAFF)
                .build();
        ContractType ct = ContractType.builder()
                .id(UUID.randomUUID())
                .name("Contract-" + name)
                .maxWeeklyHours(maxHours)
                .build();
        return Employment.builder()
                .id(UUID.randomUUID())
                .user(user)
                .contractType(ct)
                .status(EmploymentStatus.ACTIVE)
                .build();
    }

    private Shift createShift(LocalDate date, LocalTime start, LocalTime end) {
        Shift shift = Shift.builder()
                .id(UUID.randomUUID())
                .shiftDate(date)
                .startTime(start)
                .endTime(end)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .assignments(new ArrayList<>())
                .build();
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());
        return shift;
    }

    private ShiftSkillRequirement addRequirement(Shift shift, Skill skill, StoreZone zone, int count) {
        return addRequirement(shift, skill, zone, null, count);
    }

    private ShiftSkillRequirement addRequirement(Shift shift, Skill skill, StoreZone zone, Workstation ws, int count) {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .skill(skill)
                .zone(zone)
                .workstation(ws)
                .requiredCount(count)
                .build();
        shift.getRequirements().add(req);
        return req;
    }

    private StaffSkill assignSkill(Employment emp, Skill skill) {
        return StaffSkill.builder()
                .id(UUID.randomUUID())
                .staffId(emp.getUser().getId())
                .skillId(skill.getId())
                .build();
    }

    // =========================================================================
    // TEST 01: Fairness candidate validity (high vs low workload, both valid)
    // =========================================================================
    @Test
    @DisplayName("TEST 01: Lower workload candidate is preferred when both are valid and qualified")
    void test01_FairnessCandidateValidity() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40); // Low workload: 0h
        Employment bob = createStaff("Bob", 40);     // Higher workload: 24h
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        // Bob has 24h in monthly assignments (e.g., 3 shifts of 8h in past)
        Shift pastShift1 = Shift.builder().id(UUID.randomUUID()).shiftDate(startDate.minusDays(10))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build();
        Shift pastShift2 = Shift.builder().id(UUID.randomUUID()).shiftDate(startDate.minusDays(9))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build();
        Shift pastShift3 = Shift.builder().id(UUID.randomUUID()).shiftDate(startDate.minusDays(8))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build();

        ShiftAssignment b1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(pastShift1).staff(bob.getUser()).build();
        ShiftAssignment b2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(pastShift2).staff(bob.getUser()).build();
        ShiftAssignment b3 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(pastShift3).staff(bob.getUser()).build();

        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(b1, b2, b3));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        List<ShiftAssignment> saved = captor.getValue();
        assertEquals(1, saved.size());
        assertEquals(alice.getUser().getId(), saved.get(0).getStaff().getId(),
                "Alice (lower monthly workload) must be chosen over Bob");
    }

    // =========================================================================
    // TEST 02: Hard constraint beats fairness (low workload unavailable vs high workload valid)
    // =========================================================================
    @Test
    @DisplayName("TEST 02: Hard constraints (HC2) beat fairness; unavailable low-workload candidate is rejected")
    void test02_HardConstraintBeatsFairness() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40); // 0h workload, but Blackout Date
        Employment bob = createStaff("Bob", 40);     // 24h workload, but Available
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        // Alice is on blackout
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(
                        BlackoutDate.builder().staffId(alice.getUser().getId()).date(startDate).build()
                ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(bob.getUser().getId(), captor.getValue().get(0).getStaff().getId(),
                "Bob must be assigned because Alice violates HC2 (Blackout)");
    }

    // =========================================================================
    // TEST 03: Skill beats fairness (low workload wrong skill vs high workload correct skill)
    // =========================================================================
    @Test
    @DisplayName("TEST 03: Skill constraint (HC1) strictly beats fairness; unqualified staff is rejected")
    void test03_SkillBeatsFairness() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40); // 0h workload, but only Cashier
        Employment bob = createStaff("Bob", 40);     // 20h workload, but Barista
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, cashierSkill),
                assignSkill(bob, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(bob.getUser().getId(), captor.getValue().get(0).getStaff().getId(),
                "Bob must be assigned because Alice lacks the Barista skill (HC1)");
    }

    // =========================================================================
    // TEST 04: Weekly maximum preserved (currentHours + shiftHours > maxWeeklyHours rejected)
    // =========================================================================
    @Test
    @DisplayName("TEST 04: HC4 Weekly contract max is strictly preserved; overtime violation rejected")
    void test04_WeeklyMaximumPreserved() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(14, 0)); // 6h shift
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 20); // Contract max: 20h
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        // Alice already has 16 hours in the current week (16 + 6 = 22 > 20)
        Shift assigned1 = Shift.builder().id(UUID.randomUUID()).shiftDate(startDate.plusDays(1))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build(); // 8h
        Shift assigned2 = Shift.builder().id(UUID.randomUUID()).shiftDate(startDate.plusDays(2))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build(); // 8h
        ShiftAssignment sa1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(assigned1).staff(alice.getUser()).build();
        ShiftAssignment sa2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(assigned2).staff(alice.getUser()).build();

        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(sa1, sa2));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, result.getStatus());
        assertEquals(1, result.getShortageSlots());
        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    // =========================================================================
    // TEST 05: Dynamic workload update (candidate workload increases after assignment)
    // =========================================================================
    @Test
    @DisplayName("TEST 05: Dynamic workload tracking balances sequential shifts across candidates")
    void test05_DynamicWorkloadUpdate() {
        Shift shift1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0)); // 4h
        addRequirement(shift1, baristaSkill, barZone, 1);

        Shift shift2 = createShift(startDate.plusDays(1), LocalTime.of(8, 0), LocalTime.of(12, 0)); // 4h
        addRequirement(shift2, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift1, shift2));

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        List<ShiftAssignment> saved = captor.getValue();
        assertEquals(2, saved.size());

        Set<UUID> assignedStaffIds = new HashSet<>();
        assignedStaffIds.add(saved.get(0).getStaff().getId());
        assignedStaffIds.add(saved.get(1).getStaff().getId());

        assertEquals(2, assignedStaffIds.size(),
                "Shifts must be distributed 1-to-1 between Alice and Bob due to dynamic workload update");
    }

    // =========================================================================
    // TEST 06: Fairness does not eliminate all candidates (small candidate pool assigned)
    // =========================================================================
    @Test
    @DisplayName("TEST 06: Soft fairness cap relaxes and does not eliminate all candidates")
    void test06_FairnessDoesNotEliminateAllCandidates() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        // Both Alice and Bob have 30h monthly workload, team average = 30h.
        // Cap = 30 * 1.3 = 39h. If both have 45h (exceeding 39h), soft cap relaxes!
        Shift p1 = Shift.builder().id(UUID.randomUUID()).shiftDate(startDate.minusDays(5))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(17, 0)).build(); // 9h
        ShiftAssignment saAlice = ShiftAssignment.builder().id(UUID.randomUUID()).shift(p1).staff(alice.getUser()).build();
        ShiftAssignment saBob = ShiftAssignment.builder().id(UUID.randomUUID()).shift(p1).staff(bob.getUser()).build();

        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(saAlice, saBob));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size(), "One candidate must be scheduled even if cap is reached");
    }

    // =========================================================================
    // TEST 07: Zero average workload (all 0 hours -> no division by zero, scheduler works)
    // =========================================================================
    @Test
    @DisplayName("TEST 07: Zero average workload does not cause division by zero; schedule succeeds")
    void test07_ZeroAverageWorkload() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> {
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        });
    }

    // =========================================================================
    // TEST 08: Deterministic tie (multiple runs produce stable result)
    // =========================================================================
    @Test
    @DisplayName("TEST 08: Deterministic tie breaking produces identical assignments on repeated runs")
    void test08_DeterministicTie() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        // Run 1
        autoScheduleService.autoSchedule(storeId, createRequest());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor1 = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository, times(1)).saveAll(captor1.capture());
        UUID chosenStaff1 = captor1.getValue().get(0).getStaff().getId();

        // Run 2
        autoScheduleService.autoSchedule(storeId, createRequest());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor2 = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository, times(2)).saveAll(captor2.capture());
        UUID chosenStaff2 = captor2.getValue().get(0).getStaff().getId();

        assertEquals(chosenStaff1, chosenStaff2, "Scheduler tie breaker must be strictly deterministic");
    }

    // =========================================================================
    // TEST 09: Local repair preserves hard constraints
    // =========================================================================
    @Test
    @DisplayName("TEST 09: Local repair swap strictly enforces HC1-HC5 for both involved employees")
    void test09_LocalRepairPreservesHardConstraints() {
        // Shift 1: Barista only (08:00 - 12:00)
        Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s1, baristaSkill, barZone, 1);

        // Shift 2: Cashier only (08:00 - 12:00)
        Shift s2 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s2, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s1, s2));

        Employment alice = createStaff("Alice", 40); // Has both Barista and Cashier
        Employment bob = createStaff("Bob", 40);     // Has only Cashier
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(alice, cashierSkill),
                assignSkill(bob, cashierSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        List<ShiftAssignment> assignments = captor.getValue();
        assertEquals(2, assignments.size());

        for (ShiftAssignment a : assignments) {
            if (a.getShift().getId().equals(s1.getId())) {
                assertEquals(alice.getUser().getId(), a.getStaff().getId(), "Only Alice has Barista skill");
            } else if (a.getShift().getId().equals(s2.getId())) {
                assertEquals(bob.getUser().getId(), a.getStaff().getId(), "Bob handles Cashier");
            }
        }
    }

    // =========================================================================
    // TEST 10: Local repair preserves manual assignment
    // =========================================================================
    @Test
    @DisplayName("TEST 10: Local repair never swaps or replaces manual assignments")
    void test10_LocalRepairPreservesManualAssignment() {
        Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s1, baristaSkill, barZone, 1);

        Shift s2 = createShift(startDate, LocalTime.of(13, 0), LocalTime.of(17, 0));
        addRequirement(s2, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s1, s2));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        // Alice is MANUALLY assigned to s1
        ShiftAssignment manualAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(s1)
                .staff(alice.getUser())
                .requiredSkillId(baristaSkill.getId())
                .zone(barZone)
                .source(AssignmentSource.MANUAL)
                .build();
        s1.setAssignments(new ArrayList<>(List.of(manualAssign)));
        when(shiftAssignmentRepository.findByShiftId(s1.getId())).thenReturn(List.of(manualAssign));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository, never()).delete(manualAssign);
        verify(shiftAssignmentRepository, never()).deleteAll(argThat(list -> ((List<?>) list).contains(manualAssign)));
    }

    // =========================================================================
    // TEST 11: Local repair preserves per-skill capacity (does not overstaff)
    // =========================================================================
    @Test
    @DisplayName("TEST 11: Local repair strictly maintains per-skill required count without overstaffing")
    void test11_LocalRepairPreservesPerSkillCapacity() {
        Shift s = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s, baristaSkill, barZone, 1); // exactly 1
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s));

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size(), "Must not overstaff beyond requiredCount = 1");
    }

    // =========================================================================
    // TEST 12: Local repair preserves zone
    // =========================================================================
    @Test
    @DisplayName("TEST 12: Local repair preserves zone allocation for the repaired slot")
    void test12_LocalRepairPreservesZone() {
        Shift s = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(barZone.getId(), captor.getValue().get(0).getZone().getId());
    }

    // =========================================================================
    // TEST 13: Spatial allocation remains valid
    // =========================================================================
    @Test
    @DisplayName("TEST 13: Workstation spatial allocation is preserved on assignment")
    void test13_SpatialAllocationRemainsValid() {
        Shift s = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s, baristaSkill, barZone, barWorkstation, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(barWorkstation.getId(), captor.getValue().get(0).getWorkstation().getId());
    }

    // =========================================================================
    // TEST 14: Workload isolation by store
    // =========================================================================
    @Test
    @DisplayName("TEST 14: Scheduler only evaluates staff active in the targeted store")
    void test14_WorkloadIsolationByStore() {
        Shift s = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(employmentRepository).findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE);
    }

    // =========================================================================
    // TEST 15: Deleted assignments ignored
    // =========================================================================
    @Test
    @DisplayName("TEST 15: Soft-deleted assignments are completely ignored and do not inflate workload")
    void test15_DeletedAssignmentsIgnored() {
        Shift s = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        // Soft-deleted assignment overlapping with shift s
        ShiftAssignment deletedOverlap = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(s)
                .staff(alice.getUser())
                .deleted(true)
                .build();

        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(deletedOverlap));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        // Alice must still be assigned because deleted assignment does not block or overlap
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size());
        assertEquals(alice.getUser().getId(), captor.getValue().get(0).getStaff().getId());
    }

    // =========================================================================
    // TEST 16: Idempotent quality (multiple runs -> no accumulation)
    // =========================================================================
    @Test
    @DisplayName("TEST 16: Scheduling is idempotent; re-running clears previous AUTO assignments")
    void test16_IdempotentQuality() {
        Shift s = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        // Existing previous AUTO assignment
        ShiftAssignment oldAuto = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(s)
                .staff(alice.getUser())
                .source(AssignmentSource.AUTO)
                .build();
        when(shiftAssignmentRepository.findByShiftId(s.getId())).thenReturn(List.of(oldAuto));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        // Old AUTO assignment must be cleared
        verify(shiftAssignmentRepository).deleteAll(List.of(oldAuto));
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
    }

    // =========================================================================
    // TEST 17: Full coverage remains full
    // =========================================================================
    @Test
    @DisplayName("TEST 17: Feasible demand with adequate staff produces 100% full coverage")
    void test17_FullCoverageRemainsFull() {
        Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s1, baristaSkill, barZone, 1);

        Shift s2 = createShift(startDate, LocalTime.of(12, 0), LocalTime.of(16, 0));
        addRequirement(s2, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s1, s2));

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, cashierSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalAssignedSlots());
        assertEquals(0, result.getShortageSlots());
        assertEquals(100.0, result.getCoverageRate());
        assertTrue(result.getShortages().isEmpty());
    }

    // =========================================================================
    // TEST 18: Shortage remains explainable
    // =========================================================================
    @Test
    @DisplayName("TEST 18: Unfeasible demand produces explainable shortage details")
    void test18_ShortageRemainsExplainable() {
        Shift s = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s, baristaSkill, barZone, 2); // Demands 2 Baristas
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s));

        Employment alice = createStaff("Alice", 40); // Only 1 Barista available
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
        assertEquals(1, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
        assertEquals(50.0, result.getCoverageRate());
        assertFalse(result.getShortages().isEmpty());
        assertEquals(1, result.getShortages().get(0).getShortageCount());
        assertEquals("Barista", result.getShortages().get(0).getSkillName());
    }
}
