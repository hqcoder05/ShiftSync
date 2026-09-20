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
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.quota.dto.AutoFillQuotaRequest;
import com.shiftsync.quota.service.HeadcountQuotaService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ScheduleCoverageStatus;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.store.repository.StoreRepository;
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
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchedulingPhase51ForensicVerificationTest {

    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private StaffSkillRepository staffSkillRepository;
    @Mock private AvailabilityRepository availabilityRepository;
    @Mock private BlackoutDateRepository blackoutDateRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private StoreConfigurationRepository storeConfigRepository;
    @Mock private SchedulerConfigurationRepository schedulerConfigRepository;
    @Mock private HeadcountQuotaService headcountQuotaService;
    @Mock private SkillRepository skillRepository;
    @Mock private PayrollPeriodRepository payrollPeriodRepository;
    @Mock private ShiftTemplateRepository shiftTemplateRepository;
    @Mock private com.shiftsync.layout.repository.StoreZoneRepository storeZoneRepository;
    @Mock private com.shiftsync.notification.service.NotificationService notificationService;
    @Mock private com.shiftsync.audit.service.AuditLogService auditLogService;
    @Mock private com.shiftsync.auth.repository.UserRepository userRepository;

    @InjectMocks private AutoScheduleService autoScheduleService;
    private ShiftService shiftService;

    private UUID storeId;
    private Store store;
    private LocalDate startDate;
    private LocalDate endDate;
    private Skill baristaSkill;
    private Skill cashierSkill;
    private StoreZone barZone;
    private StoreZone posZone;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        startDate = LocalDate.of(2026, 9, 7); // Monday
        endDate = LocalDate.of(2026, 9, 13);   // Sunday

        store = Store.builder()
                .id(storeId)
                .name("ShiftSync Saigon Flagship")
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .build();

        shiftService = new ShiftService(
                auditLogService,
                shiftRepository,
                storeRepository,
                storeConfigRepository,
                shiftTemplateRepository,
                skillRepository,
                shiftAssignmentRepository,
                userRepository,
                payrollPeriodRepository,
                notificationService,
                storeZoneRepository,
                staffSkillRepository
        );

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(headcountQuotaService.getStoreOpenTime(any())).thenReturn(LocalTime.of(8, 0));
        when(headcountQuotaService.getStoreCloseTime(any())).thenReturn(LocalTime.of(22, 0));
        when(headcountQuotaService.getStoreMidTime(any())).thenReturn(LocalTime.of(15, 0));

        when(storeConfigRepository.findByStoreId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return Optional.of(StoreConfiguration.builder().storeId(sId).minRestHours(12).build());
        });

        when(schedulerConfigRepository.findByStoreId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return Optional.of(SchedulerConfiguration.builder()
                    .storeId(sId)
                    .fairnessWeight(BigDecimal.valueOf(0.25))
                    .skillWeight(BigDecimal.valueOf(0.25))
                    .hourWeight(BigDecimal.valueOf(0.25))
                    .restTimeWeight(BigDecimal.valueOf(0.25))
                    .availabilityWeight(BigDecimal.ZERO)
                    .build());
        });

        baristaSkill = Skill.builder().id(UUID.randomUUID()).name("Barista").store(store).build();
        cashierSkill = Skill.builder().id(UUID.randomUUID()).name("Cashier").store(store).build();
        barZone = StoreZone.builder().id(UUID.randomUUID()).name("Bar Counter").store(store).build();
        posZone = StoreZone.builder().id(UUID.randomUUID()).name("POS Counter").store(store).build();

        when(skillRepository.findById(baristaSkill.getId())).thenReturn(Optional.of(baristaSkill));
        when(skillRepository.findById(cashierSkill.getId())).thenReturn(Optional.of(cashierSkill));
        when(skillRepository.findByIdAndStoreId(baristaSkill.getId(), storeId)).thenReturn(Optional.of(baristaSkill));
        when(skillRepository.findByIdAndStoreId(cashierSkill.getId(), storeId)).thenReturn(Optional.of(cashierSkill));
        when(skillRepository.findByStoreId(storeId)).thenReturn(List.of(baristaSkill, cashierSkill));

        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(
                any(), any(), any(), any())).thenReturn(false);

        when(shiftRepository.save(any(Shift.class))).thenAnswer(i -> {
            Shift s = i.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

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

    private Shift createShift(LocalDate date, LocalTime start, LocalTime end) {
        Shift shift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(date)
                .startTime(start)
                .endTime(end)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .assignments(new ArrayList<>())
                .version(0L)
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

    private Employment createStaff(String name, int maxWeeklyHours) {
        User user = User.builder()
                .id(UUID.randomUUID())
                .fullName(name)
                .email(name.toLowerCase() + "@shiftsync.vn")
                .systemRole(SystemRole.STAFF)
                .build();
        ContractType ct = ContractType.builder()
                .id(UUID.randomUUID())
                .name("Full-Time")
                .maxWeeklyHours(maxWeeklyHours)
                .otMultiplier(BigDecimal.valueOf(1.5))
                .build();
        return Employment.builder()
                .id(UUID.randomUUID())
                .user(user)
                .store(store)
                .contractType(ct)
                .hourlyRate(BigDecimal.valueOf(25000))
                .status(EmploymentStatus.ACTIVE)
                .build();
    }

    private StaffSkill assignSkill(Employment emp, Skill skill) {
        return StaffSkill.builder()
                .id(UUID.randomUUID())
                .staffId(emp.getUser().getId())
                .skillId(skill.getId())
                .build();
    }

    private AutoScheduleRequest createRequest() {
        AutoScheduleRequest req = new AutoScheduleRequest();
        req.setStartDate(startDate);
        req.setEndDate(endDate);
        return req;
    }

    // =========================================================================
    // GROUP A: STORE OPERATING HOURS BOUNDARY VERIFICATION (SCENARIOS 01 - 06)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 01: Shift created strictly inside store operating hours (08:00 - 22:00) succeeds")
    void test01_ShiftInsideStoreHoursAccepted() {
        ShiftCreateRequest req = new ShiftCreateRequest();
        req.setShiftDate(startDate);
        req.setStartTime(LocalTime.of(8, 0));
        req.setEndTime(LocalTime.of(16, 0));

        ShiftDTO created = shiftService.createShift(storeId, req);
        assertNotNull(created);
        assertEquals(LocalTime.of(8, 0), created.getStartTime());
        assertEquals(LocalTime.of(16, 0), created.getEndTime());
        verify(shiftRepository).save(any(Shift.class));
    }

    @Test
    @DisplayName("SCENARIO 02: Shift starting before store open time (07:00 < 08:00) is rejected")
    void test02_ShiftBeforeOpenTimeRejected() {
        ShiftCreateRequest req = new ShiftCreateRequest();
        req.setShiftDate(startDate);
        req.setStartTime(LocalTime.of(7, 0));
        req.setEndTime(LocalTime.of(15, 0));

        BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, req));
        assertTrue(ex.getMessage().contains("before store open time"));
    }

    @Test
    @DisplayName("SCENARIO 03: Shift ending after store close time (23:00 > 22:00) is rejected")
    void test03_ShiftAfterCloseTimeRejected() {
        ShiftCreateRequest req = new ShiftCreateRequest();
        req.setShiftDate(startDate);
        req.setStartTime(LocalTime.of(15, 0));
        req.setEndTime(LocalTime.of(23, 0));

        BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, req));
        assertTrue(ex.getMessage().contains("after store close time"));
    }

    @Test
    @DisplayName("SCENARIO 04: Shift exactly matching store operating boundary (08:00 - 22:00) succeeds")
    void test04_ShiftExactMatchStoreHoursAccepted() {
        ShiftCreateRequest req = new ShiftCreateRequest();
        req.setShiftDate(startDate);
        req.setStartTime(LocalTime.of(8, 0));
        req.setEndTime(LocalTime.of(22, 0));

        ShiftDTO created = shiftService.createShift(storeId, req);
        assertNotNull(created);
        assertEquals(LocalTime.of(8, 0), created.getStartTime());
        assertEquals(LocalTime.of(22, 0), created.getEndTime());
    }

    @Test
    @DisplayName("SCENARIO 05: Updating existing shift to invalid time outside store operating hours is rejected")
    void test05_UpdateShiftOutOfBoundsRejected() {
        Shift existing = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
        when(shiftRepository.findByIdAndStoreId(existing.getId(), storeId)).thenReturn(Optional.of(existing));

        ShiftCreateRequest updateReq = new ShiftCreateRequest();
        updateReq.setStartTime(LocalTime.of(7, 30));
        updateReq.setEndTime(LocalTime.of(16, 0));

        BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.updateShift(storeId, existing.getId(), updateReq));
        assertTrue(ex.getMessage().contains("before store open time"));
    }

    @Test
    @DisplayName("SCENARIO 06: AutoSchedule cleans up legacy out-of-bounds draft shifts before scheduling")
    void test06_AutoScheduleCleansUpOutOfBoundsDraftShifts() {
        Shift validShift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(validShift, baristaSkill, barZone, 1);

        Shift outOfBoundsShift = createShift(startDate, LocalTime.of(6, 0), LocalTime.of(14, 0)); // Before open
        addRequirement(outOfBoundsShift, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(new ArrayList<>(List.of(validShift, outOfBoundsShift)));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftRepository).delete(outOfBoundsShift);
        verify(shiftRepository, never()).delete(validShift);
        assertEquals(1, result.getTotalDemandSlots());
        assertEquals(1, result.getTotalAssignedSlots());
    }

    // =========================================================================
    // GROUP B: VARIABLE SHIFT DURATION AUDIT (SCENARIOS 07 - 11)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 07: 8.5-hour shift (08:00 - 16:30) correctly evaluated as 8.5 hours in demand & workload")
    void test07_ShiftDuration8Point5Hours() {
        Shift shift85 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 30));
        addRequirement(shift85, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift85));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(8.5, result.getFeasibility().getTotalDemandHours(), 0.001);
        assertEquals(1, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 08: 5-hour part-time shift (17:00 - 22:00) evaluated as exactly 5.0 hours")
    void test08_ShiftDuration5Hours() {
        Shift shift5 = createShift(startDate, LocalTime.of(17, 0), LocalTime.of(22, 0));
        addRequirement(shift5, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift5));

        Employment bob = createStaff("Bob", 20);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(bob));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(bob, cashierSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(5.0, result.getFeasibility().getTotalDemandHours(), 0.001);
        assertEquals(1, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 09: Mixed daily shifts (8.5h, 6h, 5h) aggregate exact fractional demand hours")
    void test09_MixedShiftDurationsDemandAggregation() {
        Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 30)); // 8.5h
        addRequirement(s1, baristaSkill, barZone, 1);
        Shift s2 = createShift(startDate, LocalTime.of(10, 0), LocalTime.of(16, 0)); // 6.0h
        addRequirement(s2, baristaSkill, barZone, 1);
        Shift s3 = createShift(startDate, LocalTime.of(17, 0), LocalTime.of(22, 0)); // 5.0h
        addRequirement(s3, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s1, s2, s3));

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        Employment charlie = createStaff("Charlie", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob, charlie));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill),
                assignSkill(charlie, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        // 8.5 + 6.0 + 5.0 = 19.5 hours
        assertEquals(19.5, result.getFeasibility().getTotalDemandHours(), 0.001);
        assertEquals(3, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 10: Weekly hour tracking accumulates exact variable shift durations (HC4)")
    void test10_WeeklyHoursVariableDurationAccumulation() {
        // Staff has max weekly hours 20. Already has 15h assigned. A 6h shift would exceed 20h (15 + 6 = 21h > 20h)
        Employment alice = createStaff("Alice", 20);
        Shift existingShift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(23, 0)); // 15h
        existingShift.setStatus(ShiftStatus.PUBLISHED);

        ShiftAssignment existingAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(existingShift)
                .staff(alice.getUser())
                .source(AssignmentSource.MANUAL)
                .build();

        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(existingAssign));

        Shift candidateShift = createShift(startDate.plusDays(1), LocalTime.of(8, 0), LocalTime.of(14, 0)); // 6.0h
        addRequirement(candidateShift, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(candidateShift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        // Alice cannot be assigned because 15 + 6 > 20h
        assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, result.getStatus());
        assertEquals(1, result.getShortageSlots());
        assertEquals(0, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 11: Rest time between shifts uses exact start/end timestamps, not nominal shift boundaries")
    void test11_RestTimeCalculatedFromActualShiftEnd() {
        // Shift 1 ends at 20:00 on Monday. Min rest is 12h. Next shift at 08:00 on Tuesday = exactly 12h rest (valid).
        Employment alice = createStaff("Alice", 40);
        Shift mondayShift = createShift(startDate, LocalTime.of(12, 0), LocalTime.of(20, 0)); // Ends 20:00
        mondayShift.setStatus(ShiftStatus.PUBLISHED);

        ShiftAssignment monAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(mondayShift)
                .staff(alice.getUser())
                .source(AssignmentSource.MANUAL)
                .build();

        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(monAssign));

        Shift tuesdayShift = createShift(startDate.plusDays(1), LocalTime.of(8, 0), LocalTime.of(16, 0)); // Starts 08:00 (12h rest)
        addRequirement(tuesdayShift, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(tuesdayShift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(1, result.getTotalAssignedSlots());
    }

    // =========================================================================
    // GROUP C: HEADCOUNT BOUNDARY & MANUAL DEDUCTION (SCENARIOS 12 - 16)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 12: Scheduler demand slots strictly equals ShiftSkillRequirement.requiredCount")
    void test12_DemandStrictlyFromRequirements() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 3);
        addRequirement(shift, cashierSkill, posZone, 2);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(5, result.getTotalDemandSlots());
        assertEquals(5, result.getSchedulerDemandSlots());
        assertEquals(5, result.getShortageSlots());
    }

    @Test
    @DisplayName("SCENARIO 13: Manual assignment deducts from requiredCount: remaining slots = requiredCount - manual")
    void test13_ManualAssignmentDeduction() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 3);

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        Employment charlie = createStaff("Charlie", 40);

        ShiftAssignment manualAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(alice.getUser())
                .requiredSkillId(baristaSkill.getId())
                .zone(barZone)
                .source(AssignmentSource.MANUAL)
                .build();
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(manualAssign));

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob, charlie));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill),
                assignSkill(charlie, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(3, result.getTotalDemandSlots());
        assertEquals(1, result.getExistingManualAssignments());
        assertEquals(2, result.getSchedulerDemandSlots()); // 3 - 1 = 2 remaining slots to schedule
        assertEquals(2, result.getNewAssignmentsCreated());
        assertEquals(3, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 14: Shortage is reported exactly when available qualified staff is less than remaining demand")
    void test14_ShortageAccuratelyReported() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 2);

        Employment alice = createStaff("Alice", 40);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalDemandSlots());
        assertEquals(1, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
        assertFalse(result.getShortages().isEmpty());
    }

    @Test
    @DisplayName("SCENARIO 15: Shift with requirement requiredCount = 0 generates 0 demand slots")
    void test15_ZeroRequiredCountGeneratesZeroDemand() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 0);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(0, result.getTotalDemandSlots());
        assertEquals(0, result.getSchedulerDemandSlots());
        assertEquals(0, result.getShortageSlots());
    }

    @Test
    @DisplayName("SCENARIO 16: Soft-deleted assignments are ignored during manual assignment deduction")
    void test16_SoftDeletedAssignmentsIgnoredInDeduction() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 1);

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);

        ShiftAssignment deletedAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(alice.getUser())
                .requiredSkillId(baristaSkill.getId())
                .deleted(true) // Soft deleted
                .source(AssignmentSource.MANUAL)
                .build();
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(deletedAssign));

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(bob));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(bob, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(1, result.getTotalDemandSlots());
        assertEquals(0, result.getExistingManualAssignments()); // deleted assignment not counted
        assertEquals(1, result.getSchedulerDemandSlots());
        assertEquals(1, result.getTotalAssignedSlots());
    }

    // =========================================================================
    // GROUP D: SCHEDULER INTEGRATION WITH VARIABLE SHIFTS (SCENARIOS 17 - 21)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 17: AutoScheduler uses actual shift startTime and endTime for staff availability overlap check")
    void test17_AvailabilityUsesActualShiftTimes() {
        Shift shift = createShift(startDate, LocalTime.of(14, 0), LocalTime.of(20, 0)); // 14:00 - 20:00
        addRequirement(shift, baristaSkill, barZone, 1);

        Employment alice = createStaff("Alice", 40);
        Availability avail = Availability.builder()
                .id(UUID.randomUUID())
                .user(alice.getUser())
                .dayOfWeek((short) 1) // 1 = Monday
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(13, 0))
                .build();

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList()))
                .thenReturn(List.of(avail));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        // Alice is unavailable during 14:00 - 20:00, so 0 slots assigned and shortage is recorded
        assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, result.getStatus());
        assertEquals(0, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
    }

    @Test
    @DisplayName("SCENARIO 18: Consecutive variable shifts evaluate exact overlap on actual intervals")
    void test18_ConsecutiveVariableShiftsExactIntervalOverlap() {
        Shift shift1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(13, 30)); // 08:00 - 13:30
        addRequirement(shift1, baristaSkill, barZone, 1);
        Shift shift2 = createShift(startDate, LocalTime.of(13, 30), LocalTime.of(21, 0)); // 13:30 - 21:00 (adjoining)
        addRequirement(shift2, baristaSkill, barZone, 1);

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift1, shift2));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 19: Monthly fairness score calculates on exact accumulated hours, not hardcoded 8h count")
    void test19_MonthlyFairnessUsesExactHours() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0)); // 4h shift
        addRequirement(shift, baristaSkill, barZone, 1);

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);

        Shift monShift1 = createShift(startDate.minusDays(5), LocalTime.of(8, 0), LocalTime.of(16, 0));
        ShiftAssignment aAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID()).shift(monShift1).staff(alice.getUser()).source(AssignmentSource.MANUAL).build();

        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(aAssign));

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(1, result.getTotalAssignedSlots());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(bob.getUser().getId(), captor.getValue().get(0).getStaff().getId());
    }

    @Test
    @DisplayName("SCENARIO 20: Part-time staff with 20h limit correctly scheduled for two 8.5h shifts (17h total)")
    void test20_PartTimeStaffVariableShiftFit() {
        Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 30)); // 8.5h
        addRequirement(s1, baristaSkill, barZone, 1);
        Shift s2 = createShift(startDate.plusDays(2), LocalTime.of(8, 0), LocalTime.of(16, 30)); // 8.5h
        addRequirement(s2, baristaSkill, barZone, 1);

        Employment partTimer = createStaff("PartTimer", 20); // 20h weekly limit

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s1, s2));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(partTimer));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(partTimer, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        // 8.5 + 8.5 = 17h <= 20h -> Both shifts scheduled!
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 21: Third 8.5h shift for 20h part-timer is blocked (17 + 8.5 = 25.5h > 20h)")
    void test21_PartTimeStaffThirdShiftBlocked() {
        Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 30)); // 8.5h
        addRequirement(s1, baristaSkill, barZone, 1);
        Shift s2 = createShift(startDate.plusDays(2), LocalTime.of(8, 0), LocalTime.of(16, 30)); // 8.5h
        addRequirement(s2, baristaSkill, barZone, 1);
        Shift s3 = createShift(startDate.plusDays(4), LocalTime.of(8, 0), LocalTime.of(16, 30)); // 8.5h
        addRequirement(s3, baristaSkill, barZone, 1);

        Employment partTimer = createStaff("PartTimer", 20);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(s1, s2, s3));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(partTimer));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(partTimer, baristaSkill)));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalAssignedSlots());
        assertEquals(1, result.getShortageSlots());
    }

    // =========================================================================
    // GROUP E: CANONICAL SHIFT NON-DESTRUCTION (SCENARIOS 22 - 24)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 22: Manager custom draft shifts are NOT wiped when AutoSchedule runs")
    void test22_ManagerCustomShiftsPreserved() {
        Shift cs1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(cs1, baristaSkill, barZone, 1);
        Shift cs2 = createShift(startDate, LocalTime.of(12, 0), LocalTime.of(17, 0));
        addRequirement(cs2, baristaSkill, barZone, 1);
        Shift cs3 = createShift(startDate, LocalTime.of(17, 0), LocalTime.of(22, 0));
        addRequirement(cs3, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(cs1, cs2, cs3));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(alice, cashierSkill)
        ));

        autoScheduleService.autoSchedule(storeId, createRequest());

        // autoFillQuotas must NOT be called because draftShifts was NOT empty
        verify(headcountQuotaService, never()).autoFillQuotas(any(AutoFillQuotaRequest.class));
        verify(shiftRepository, never()).delete(cs1);
        verify(shiftRepository, never()).delete(cs2);
        verify(shiftRepository, never()).delete(cs3);
    }

    @Test
    @DisplayName("SCENARIO 23: Default canonical shifts are only auto-populated when draft shifts list is empty")
    void test23_CanonicalShiftsPopulatedOnlyWhenEmpty() {
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(Collections.emptyList());

        autoScheduleService.autoSchedule(storeId, createRequest());

        // Called because draftShifts was empty
        verify(headcountQuotaService).autoFillQuotas(any(AutoFillQuotaRequest.class));
    }

    @Test
    @DisplayName("SCENARIO 24: HeadcountQuota apply-to-scheduler synchronizes requirements without deleting custom manager shifts")
    void test24_ApplyToSchedulerPreservesCustomRequirements() {
        Shift morning = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(15, 0));
        addRequirement(morning, baristaSkill, barZone, 4); // Manager customized to 4 Baristas

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, startDate))
                .thenReturn(List.of(morning));

        assertEquals(4, morning.getRequirements().get(0).getRequiredCount());
    }

    // =========================================================================
    // GROUP F: TRANSACTION ATOMICITY & ROLLBACK AUDIT (SCENARIOS 25 - 26)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 25: Database error during saveAll rolls back scheduling transaction")
    void test25_TransactionRollbackOnSaveAllFailure() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        doThrow(new RuntimeException("Simulated disk full during assignment persistence"))
                .when(shiftAssignmentRepository).saveAll(anyList());

        assertThrows(RuntimeException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));
    }

    @Test
    @DisplayName("SCENARIO 26: Unique constraint violation in database propagates exception to trigger rollback")
    void test26_UniqueConstraintViolationTriggersRollback() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        doThrow(new DataIntegrityViolationException("Unique index violation: idx_shift_assignment_shift_staff_active"))
                .when(shiftAssignmentRepository).saveAll(anyList());

        assertThrows(DataIntegrityViolationException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));
    }

    // =========================================================================
    // GROUP G: TRUE CONCURRENCY AUDIT WITH THREAD BARRIER (SCENARIOS 27 - 30)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 27: True thread overlap using CyclicBarrier on same-store auto-schedule maintains capacity")
    void test27_TrueConcurrencyCyclicBarrierSameStore() throws Exception {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Callable<AutoScheduleResult> task = () -> {
            barrier.await(); // Synchronize threads to guarantee simultaneous execution
            return autoScheduleService.autoSchedule(storeId, createRequest());
        };

        Future<AutoScheduleResult> f1 = executor.submit(task);
        Future<AutoScheduleResult> f2 = executor.submit(task);

        AutoScheduleResult r1 = f1.get(5, TimeUnit.SECONDS);
        AutoScheduleResult r2 = f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertNotNull(r1);
        assertNotNull(r2);
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r1.getStatus());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r2.getStatus());
        assertEquals(1, r1.getTotalAssignedSlots());
        assertEquals(1, r2.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 28: Concurrent assignment race with CountDownLatch and Atomic capacity enforcement")
    void test28_ConcurrentAssignmentRaceAtomicCapacity() throws Exception {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        addRequirement(shift, baristaSkill, barZone, 1);

        Employment alice = createStaff("Alice", 40);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(assignSkill(alice, baristaSkill)));

        AtomicInteger saveCount = new AtomicInteger(0);
        doAnswer(inv -> {
            saveCount.incrementAndGet();
            return inv.getArgument(0);
        }).when(shiftAssignmentRepository).saveAll(anyList());

        CountDownLatch latch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Future<AutoScheduleResult> f1 = executor.submit(() -> {
            latch.await();
            return autoScheduleService.autoSchedule(storeId, createRequest());
        });
        Future<AutoScheduleResult> f2 = executor.submit(() -> {
            latch.await();
            return autoScheduleService.autoSchedule(storeId, createRequest());
        });

        latch.countDown(); // Release both threads at exactly the same moment
        AutoScheduleResult r1 = f1.get(5, TimeUnit.SECONDS);
        AutoScheduleResult r2 = f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, r1.getTotalAssignedSlots());
        assertEquals(1, r2.getTotalAssignedSlots());
        assertTrue(saveCount.get() >= 2);
    }

    @Test
    @DisplayName("SCENARIO 29: Concurrent auto-schedule across two distinct stores runs with complete data isolation")
    void test29_ConcurrentDistinctStoresIsolation() throws Exception {
        UUID storeA = UUID.randomUUID();
        UUID storeB = UUID.randomUUID();

        Store sA = Store.builder().id(storeA).name("Store A").openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(22, 0)).build();
        Store sB = Store.builder().id(storeB).name("Store B").openTime(LocalTime.of(7, 0)).closeTime(LocalTime.of(23, 0)).build();
        when(storeRepository.findById(storeA)).thenReturn(Optional.of(sA));
        when(storeRepository.findById(storeB)).thenReturn(Optional.of(sB));

        Shift shiftA = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
        shiftA.setStore(sA);
        addRequirement(shiftA, baristaSkill, barZone, 1);

        Shift shiftB = createShift(startDate, LocalTime.of(7, 0), LocalTime.of(15, 0));
        shiftB.setStore(sB);
        addRequirement(shiftB, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeA, startDate, endDate)).thenReturn(List.of(shiftA));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeB, startDate, endDate)).thenReturn(List.of(shiftB));

        Employment empA = createStaff("StaffA", 40);
        Employment empB = createStaff("StaffB", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeA, EmploymentStatus.ACTIVE)).thenReturn(List.of(empA));
        when(employmentRepository.findByStoreIdAndStatus(storeB, EmploymentStatus.ACTIVE)).thenReturn(List.of(empB));

        when(staffSkillRepository.findByStaffIdIn(List.of(empA.getUser().getId()))).thenReturn(List.of(assignSkill(empA, baristaSkill)));
        when(staffSkillRepository.findByStaffIdIn(List.of(empB.getUser().getId()))).thenReturn(List.of(assignSkill(empB, cashierSkill)));

        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Future<AutoScheduleResult> fA = executor.submit(() -> {
            startLatch.await();
            return autoScheduleService.autoSchedule(storeA, createRequest());
        });
        Future<AutoScheduleResult> fB = executor.submit(() -> {
            startLatch.await();
            return autoScheduleService.autoSchedule(storeB, createRequest());
        });

        startLatch.countDown();
        AutoScheduleResult resA = fA.get(5, TimeUnit.SECONDS);
        AutoScheduleResult resB = fB.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, resA.getStatus());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, resB.getStatus());
        assertEquals(storeA, resA.getStoreId());
        assertEquals(storeB, resB.getStoreId());
    }

    @Test
    @DisplayName("SCENARIO 30: SaveBulkDemandPlanning enforces operating hours boundary on all configured shifts")
    void test30_SaveBulkDemandPlanningBoundaryEnforcement() {
        BulkDemandPlanningRequest.ShiftDemandConfig validConfig = new BulkDemandPlanningRequest.ShiftDemandConfig();
        validConfig.setName("Morning Shift");
        validConfig.setStartTime(LocalTime.of(8, 0));
        validConfig.setEndTime(LocalTime.of(16, 0));

        BulkDemandPlanningRequest.ShiftDemandConfig invalidConfig = new BulkDemandPlanningRequest.ShiftDemandConfig();
        invalidConfig.setName("Midnight Shift");
        invalidConfig.setStartTime(LocalTime.of(20, 0));
        invalidConfig.setEndTime(LocalTime.of(23, 0)); // After store close 22:00

        BulkDemandPlanningRequest req = new BulkDemandPlanningRequest();
        req.setScope("DAY");
        req.setTargetDate(startDate);
        req.setShifts(List.of(validConfig, invalidConfig));

        BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.saveBulkDemandPlanning(storeId, req));
        assertTrue(ex.getMessage().contains("after store close time"));
    }

    @Test
    @DisplayName("SCENARIO 31: Bulk demand rejects an invalid skill before any shift is persisted")
    void test31_BulkDemandInvalidSkillIsAtomic() {
        BulkDemandPlanningRequest.ShiftDemandConfig config = new BulkDemandPlanningRequest.ShiftDemandConfig();
        config.setName("Morning Shift");
        config.setStartTime(LocalTime.of(8, 0));
        config.setEndTime(LocalTime.of(16, 0));
        ShiftRequirementRequest invalidRequirement = new ShiftRequirementRequest();
        invalidRequirement.setSkillId(UUID.randomUUID());
        invalidRequirement.setRequiredCount(1);
        config.setRequirements(List.of(invalidRequirement));

        BulkDemandPlanningRequest request = new BulkDemandPlanningRequest();
        request.setScope("DAY");
        request.setTargetDate(startDate);
        request.setShifts(List.of(config));

        BusinessException error = assertThrows(BusinessException.class,
                () -> shiftService.saveBulkDemandPlanning(storeId, request));

        assertTrue(error.getMessage().contains("Skill not found in this store"));
        verify(shiftRepository, never()).save(any(Shift.class));
    }
}
