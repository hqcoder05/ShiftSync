package com.shiftsync.shift.service;

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
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.dto.AutoScheduleResult;
import com.shiftsync.shift.dto.RequirementCoverageDTO;
import com.shiftsync.shift.dto.ShortageDetailDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.auth.entity.User;
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
class AutoScheduleFeasibilityAndShortageTest {

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

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        startDate = LocalDate.of(2026, 3, 2); // Monday
        endDate = LocalDate.of(2026, 3, 8);   // Sunday

        baristaSkill = Skill.builder().id(UUID.randomUUID()).name("Barista").build();
        cashierSkill = Skill.builder().id(UUID.randomUUID()).name("Cashier").build();

        barZone = StoreZone.builder().id(UUID.randomUUID()).name("Bar Zone").build();
        posZone = StoreZone.builder().id(UUID.randomUUID()).name("POS Zone").build();

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
                .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
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
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .skill(skill)
                .zone(zone)
                .requiredCount(count)
                .build();
        shift.getRequirements().add(req);
        return req;
    }

    // =========================================================================
    // SCENARIO 1: State A - FULLY_COVERED (100% coverage, 0 shortage)
    // =========================================================================
    @Test
    @DisplayName("Scenario 1: State A - FULLY_COVERED when all demanded slots are satisfied")
    void testStateA_FullyCovered() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment emp = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(StaffSkill.builder().staffId(emp.getUser().getId()).skillId(baristaSkill.getId()).build()));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result);
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(1, result.getTotalDemandSlots());
        assertEquals(1, result.getTotalAssignedSlots());
        assertEquals(0, result.getShortageSlots());
        assertEquals(100.0, result.getCoverageRate());
        assertTrue(result.getShortages().isEmpty());
        assertEquals(1, result.getRequirementCoverages().size());
        assertTrue(result.getRequirementCoverages().get(0).isFullyCovered());
        assertTrue(result.getMessage().contains("100%"));
    }

    // =========================================================================
    // SCENARIO 2: State B - PARTIALLY_COVERED (partial fulfillment, shortage > 0)
    // =========================================================================
    @Test
    @DisplayName("Scenario 2: State B - PARTIALLY_COVERED when demand is 2 but only 1 staff available")
    void testStateB_PartiallyCovered() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 2);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment emp = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(StaffSkill.builder().staffId(emp.getUser().getId()).skillId(baristaSkill.getId()).build()));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result);
        assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalDemandSlots());
        assertEquals(1, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
        assertEquals(50.0, result.getCoverageRate());
        assertEquals(1, result.getShortages().size());
        assertEquals(1, result.getShortages().get(0).getShortageCount());
        assertTrue(result.getMessage().contains("50.0%"));
        assertTrue(result.getMessage().contains("thiếu 1 vị trí"));
    }

    // =========================================================================
    // SCENARIO 3: State C - ZERO_COVERAGE (0 assignments, 100% shortage)
    // =========================================================================
    @Test
    @DisplayName("Scenario 3: State C - ZERO_COVERAGE when no staff can take the shift")
    void testStateC_ZeroCoverage() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 2);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        // Store has no active staff
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result);
        assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, result.getStatus());
        assertEquals(2, result.getTotalDemandSlots());
        assertEquals(0, result.getTotalAssignedSlots());
        assertEquals(2, result.getShortageSlots());
        assertEquals(0.0, result.getCoverageRate());
        assertEquals(1, result.getShortages().size());
        assertEquals(2, result.getShortages().get(0).getShortageCount());
        assertTrue(result.getMessage().contains("độ phủ 0%"));
    }

    // =========================================================================
    // SCENARIO 4: State D - NO_DEMAND (no draft shifts)
    // =========================================================================
    @Test
    @DisplayName("Scenario 4: State D - NO_DEMAND when no draft shifts in window")
    void testStateD_NoDemand() {
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(Collections.emptyList());

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result);
        assertEquals(ScheduleCoverageStatus.NO_DEMAND, result.getStatus());
        assertEquals(0, result.getTotalDemandSlots());
        assertEquals(0, result.getTotalAssignedSlots());
        assertEquals(0, result.getShortageSlots());
        assertEquals(100.0, result.getCoverageRate());
        assertTrue(result.getShortages().isEmpty());
    }

    // =========================================================================
    // SCENARIO 5: Non-negative shortage invariant
    // =========================================================================
    @Test
    @DisplayName("Scenario 5: Shortage is never negative even if manual assignments exceed requirement")
    void testShortageNeverNegative() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        // 2 manual assignments already on this shift
        Employment emp1 = createStaff("Alice", 40);
        Employment emp2 = createStaff("Bob", 40);
        ShiftAssignment m1 = ShiftAssignment.builder().shift(shift).staff(emp1.getUser()).requiredSkillId(baristaSkill.getId()).zone(barZone).source(AssignmentSource.MANUAL).build();
        ShiftAssignment m2 = ShiftAssignment.builder().shift(shift).staff(emp2.getUser()).requiredSkillId(baristaSkill.getId()).zone(barZone).source(AssignmentSource.MANUAL).build();
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(m1, m2));

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp1, emp2));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result);
        assertEquals(0, result.getShortageSlots());
        assertTrue(result.getShortages().isEmpty());
        assertEquals(0, result.getRequirementCoverages().get(0).getShortageCount());
    }

    // =========================================================================
    // SCENARIO 6: Traceable shortage metadata
    // =========================================================================
    @Test
    @DisplayName("Scenario 6: Shortage contains complete traceability (shift, time, skill, zone, workstation)")
    void testShortageTraceability() {
        Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
        Workstation ws = Workstation.builder().id(UUID.randomUUID()).name("Espresso Station 1").build();
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .skill(baristaSkill)
                .zone(barZone)
                .workstation(ws)
                .requiredCount(1)
                .build();
        shift.getRequirements().add(req);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(1, result.getShortages().size());
        ShortageDetailDTO detail = result.getShortages().get(0);
        assertEquals(storeId, detail.getStoreId());
        assertEquals(shift.getId(), detail.getShiftId());
        assertEquals(startDate, detail.getShiftDate());
        assertEquals(LocalTime.of(9, 0), detail.getStartTime());
        assertEquals(LocalTime.of(17, 0), detail.getEndTime());
        assertEquals(baristaSkill.getId(), detail.getSkillId());
        assertEquals("Barista", detail.getSkillName());
        assertEquals(barZone.getId(), detail.getZoneId());
        assertEquals("Bar Zone", detail.getZoneName());
        assertEquals(ws.getId(), detail.getWorkstationId());
        assertEquals("Espresso Station 1", detail.getWorkstationName());
        assertEquals(1, detail.getRequiredCount());
        assertEquals(0, detail.getAssignedCount());
        assertEquals(1, detail.getShortageCount());
    }

    // =========================================================================
    // SCENARIO 7: Multi-requirement coverage breakdown
    // =========================================================================
    @Test
    @DisplayName("Scenario 7: Multi-requirement shift breakdown - 1 satisfied, 1 short")
    void testMultiRequirementBreakdown() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        addRequirement(shift, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment barista = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(barista));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(StaffSkill.builder().staffId(barista.getUser().getId()).skillId(baristaSkill.getId()).build()));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalDemandSlots());
        assertEquals(1, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());

        List<RequirementCoverageDTO> coverages = result.getRequirementCoverages();
        assertEquals(2, coverages.size());

        RequirementCoverageDTO barCov = coverages.stream().filter(c -> baristaSkill.getId().equals(c.getSkillId())).findFirst().orElseThrow();
        assertEquals(1, barCov.getAssignedCount());
        assertEquals(0, barCov.getShortageCount());
        assertTrue(barCov.isFullyCovered());

        RequirementCoverageDTO posCov = coverages.stream().filter(c -> cashierSkill.getId().equals(c.getSkillId())).findFirst().orElseThrow();
        assertEquals(0, posCov.getAssignedCount());
        assertEquals(1, posCov.getShortageCount());
        assertFalse(posCov.isFullyCovered());
    }

    // =========================================================================
    // SCENARIO 8: Zone-level coverage isolation (same skill, different zones)
    // =========================================================================
    @Test
    @DisplayName("Scenario 8: Same skill across different zones does not conflate coverage")
    void testZoneCoverageIsolation() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        StoreZone zoneA = StoreZone.builder().id(UUID.randomUUID()).name("Bar Front").build();
        StoreZone zoneB = StoreZone.builder().id(UUID.randomUUID()).name("Bar Back").build();

        addRequirement(shift, baristaSkill, zoneA, 1);
        addRequirement(shift, baristaSkill, zoneB, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment emp = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(StaffSkill.builder().staffId(emp.getUser().getId()).skillId(baristaSkill.getId()).build()));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(1, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
        assertEquals(1, result.getShortages().size());
        UUID assignedZoneId = result.getRequirementCoverages().stream().filter(RequirementCoverageDTO::isFullyCovered).findFirst().get().getZoneId();
        UUID shortageZoneId = result.getShortages().get(0).getZoneId();
        assertNotEquals(assignedZoneId, shortageZoneId);
    }

    // =========================================================================
    // SCENARIO 9: Diagnostic NO_QUALIFIED_STAFF
    // =========================================================================
    @Test
    @DisplayName("Scenario 9: Diagnostic identifies NO_QUALIFIED_STAFF when no staff has the skill")
    void testDiagnostic_NoQualifiedStaff() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        // Staff exists, but only has Cashier skill
        Employment emp = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(StaffSkill.builder().staffId(emp.getUser().getId()).skillId(cashierSkill.getId()).build()));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(1, result.getShortages().size());
        ShortageDetailDTO shortage = result.getShortages().get(0);
        assertEquals("NO_QUALIFIED_STAFF", shortage.getPrimaryReason());
        assertTrue(shortage.getDiagnosticDetails().contains("Không có nhân sự đang hoạt động nào sở hữu kỹ năng yêu cầu"));
    }

    // =========================================================================
    // SCENARIO 10: Diagnostic CONSTRAINTS_VIOLATED (overlap / max hours)
    // =========================================================================
    @Test
    @DisplayName("Scenario 10: Diagnostic identifies CONSTRAINTS_VIOLATED when qualified staff violated HC")
    void testDiagnostic_ConstraintsViolated() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        // Alice has Barista skill, but max weekly hours = 2, and shift is 4 hours -> fails HC4
        Employment emp = createStaff("Alice", 2);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(StaffSkill.builder().staffId(emp.getUser().getId()).skillId(baristaSkill.getId()).build()));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(1, result.getShortages().size());
        ShortageDetailDTO shortage = result.getShortages().get(0);
        assertEquals("CONSTRAINTS_VIOLATED", shortage.getPrimaryReason());
        assertTrue(shortage.getDiagnosticDetails().contains("chạm trần giờ tuần"));
    }

    // =========================================================================
    // SCENARIO 11: Feasibility metrics calculation
    // =========================================================================
    @Test
    @DisplayName("Scenario 11: Feasibility diagnostics calculate theoretical capacity vs demand")
    void testFeasibilityCalculation() {
        Shift shift1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0)); // 4h
        addRequirement(shift1, baristaSkill, barZone, 1);
        Shift shift2 = createShift(startDate, LocalTime.of(13, 0), LocalTime.of(17, 0)); // 4h
        addRequirement(shift2, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift1, shift2));

        Employment emp1 = createStaff("Alice", 20);
        Employment emp2 = createStaff("Bob", 20);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp1, emp2));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                StaffSkill.builder().staffId(emp1.getUser().getId()).skillId(baristaSkill.getId()).build(),
                StaffSkill.builder().staffId(emp2.getUser().getId()).skillId(baristaSkill.getId()).build()
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result.getFeasibility());
        assertEquals(2, result.getFeasibility().getTotalActiveStaff());
        assertEquals(40.0, result.getFeasibility().getTheoreticalCapacityHours());
        assertEquals(8.0, result.getFeasibility().getTotalDemandHours());
        assertTrue(result.getFeasibility().isTheoreticalCapacitySufficient());
    }

    // =========================================================================
    // SCENARIO 12: Feasibility insufficient capacity
    // =========================================================================
    @Test
    @DisplayName("Scenario 12: Feasibility theoreticalCapacitySufficient is false when demand exceeds capacity")
    void testFeasibilityInsufficient() {
        Shift shift1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0)); // 8h
        addRequirement(shift1, baristaSkill, barZone, 2); // 16h demand

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift1));

        Employment emp1 = createStaff("Alice", 10); // only 10h contract
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp1));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                StaffSkill.builder().staffId(emp1.getUser().getId()).skillId(baristaSkill.getId()).build()
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result.getFeasibility());
        assertEquals(10.0, result.getFeasibility().getTheoreticalCapacityHours());
        assertEquals(16.0, result.getFeasibility().getTotalDemandHours());
        assertFalse(result.getFeasibility().isTheoreticalCapacitySufficient());
    }

    // =========================================================================
    // SCENARIO 13: Local repair diagnostics tracking
    // =========================================================================
    @Test
    @DisplayName("Scenario 13: Feasibility diagnostics track unassignedBeforeRepair, rescuedCount, and finalUnassigned")
    void testLocalRepairDiagnosticsTracking() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 2);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment emp1 = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp1));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                StaffSkill.builder().staffId(emp1.getUser().getId()).skillId(baristaSkill.getId()).build()
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertNotNull(result.getFeasibility());
        assertEquals(1, result.getFeasibility().getUnassignedSlotsBeforeRepair());
        assertEquals(0, result.getFeasibility().getLocalRepairRescuedCount());
        assertEquals(1, result.getFeasibility().getFinalUnassignedCount());
    }

    // =========================================================================
    // SCENARIO 14: ShiftService DTO mappings for shortage and assigned counts
    // =========================================================================
    @Test
    @DisplayName("Scenario 14: ShiftService mapToDTO correctly maps assignedStaffCount, shortageStaff, and shortageCount")
    void testShiftServiceDtoMappings() {
        ShiftService shiftService = mock(ShiftService.class);
        when(shiftService.mapToDTO(any())).thenCallRealMethod();

        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 2);
        addRequirement(shift, cashierSkill, posZone, 1);

        Employment emp = createStaff("Alice", 40);
        ShiftAssignment a1 = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(emp.getUser())
                .requiredSkillId(baristaSkill.getId())
                .zone(barZone)
                .source(AssignmentSource.AUTO)
                .build();
        shift.setAssignments(List.of(a1));

        com.shiftsync.shift.dto.ShiftDTO dto = shiftService.mapToDTO(shift);

        assertNotNull(dto);
        assertEquals(3, dto.getRequiredStaff());
        assertEquals(1, dto.getAssignedStaffCount());
        assertEquals(2, dto.getShortageStaff());

        assertEquals(2, dto.getSkillRequirements().size());
        com.shiftsync.shift.dto.ShiftSkillRequirementDTO r1 = dto.getSkillRequirements().stream()
                .filter(r -> baristaSkill.getId().equals(r.getSkillId()))
                .findFirst().orElseThrow();
        assertEquals(2, r1.getRequiredStaff());
        assertEquals(1, r1.getAssignedCount());
        assertEquals(1, r1.getShortageCount());

        com.shiftsync.shift.dto.ShiftSkillRequirementDTO r2 = dto.getSkillRequirements().stream()
                .filter(r -> cashierSkill.getId().equals(r.getSkillId()))
                .findFirst().orElseThrow();
        assertEquals(1, r2.getRequiredStaff());
        assertEquals(0, r2.getAssignedCount());
        assertEquals(1, r2.getShortageCount());
    }

    // =========================================================================
    // SCENARIO 15: ShiftController auto-schedule endpoint response
    // =========================================================================
    @Test
    @DisplayName("Scenario 15: ShiftController autoSchedule returns ResponseEntity<AutoScheduleResult> with 200 OK")
    void testShiftControllerAutoSchedule() {
        com.shiftsync.shift.controller.ShiftController controller =
                new com.shiftsync.shift.controller.ShiftController(null, autoScheduleService);

        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment emp = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                StaffSkill.builder().staffId(emp.getUser().getId()).skillId(baristaSkill.getId()).build()
        ));

        org.springframework.http.ResponseEntity<AutoScheduleResult> response =
                controller.autoSchedule(storeId, createRequest());

        assertNotNull(response);
        assertEquals(org.springframework.http.HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, response.getBody().getStatus());
        assertEquals(100.0, response.getBody().getCoverageRate());
    }
}
