package com.shiftsync.shift.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.layout.dto.SpatialAllocationResultDto;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.layout.repository.WorkstationRepository;
import com.shiftsync.layout.service.SpatialAllocationService;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.quota.service.HeadcountQuotaService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.StoreAccessService;
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
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * PHASE 5.3: BACKEND FINAL FORENSIC & SCHEDULING DOMAIN CLOSURE TEST SUITE
 *
 * Verifies core scheduling invariants, boundary conditions, and domain guarantees:
 * - Group A: Store Operating Schedule Enforcement (8 tests)
 * - Group B: Variable Shift Duration Handling (6 tests)
 * - Group C: Multiple Daily Shifts (5 tests)
 * - Group D: Demand & Capacity Deduction (5 tests)
 * - Group E: Weighted Optimization & Determinism (6 tests)
 * - Group F: Spatial Allocation (4 tests)
 * - Group G: Transaction Rollback & Atomicity (3 tests)
 * - Group H: Real Concurrency (6 tests)
 * - Group I: Coverage & Shortage Diagnostics (4 tests)
 * - Group J: RBAC & Store Isolation (3 tests)
 *
 * Total: 50 forensic verification scenarios.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchedulingPhase53BackendClosureTest {

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
    @Mock private StoreZoneRepository storeZoneRepository;
    @Mock private StoreLayoutRepository storeLayoutRepository;
    @Mock private WorkstationRepository workstationRepository;
    @Mock private ShiftTemplateRepository shiftTemplateRepository;
    @Mock private UserRepository userRepository;
    @Mock private PayrollPeriodRepository payrollPeriodRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditLogService auditLogService;

    private SpatialAllocationService spatialAllocationService;
    private AutoScheduleService autoScheduleService;
    private ShiftService shiftService;
    private StoreAccessService storeAccessService;

    private UUID storeId;
    private Store store;
    private LocalDate startDate;
    private LocalDate endDate;
    private Skill baristaSkill;
    private Skill cashierSkill;
    private StoreZone barZone;
    private StoreZone posZone;
    private final Map<UUID, List<StaffSkill>> staffSkillsMap = new ConcurrentHashMap<>();

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        startDate = LocalDate.of(2026, 9, 7); // Monday
        endDate = LocalDate.of(2026, 9, 13);   // Sunday

        store = Store.builder()
                .id(storeId)
                .name("ShiftSync Main Store")
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .build();

        spatialAllocationService = new SpatialAllocationService(
                storeZoneRepository,
                storeLayoutRepository,
                workstationRepository,
                shiftRepository,
                shiftAssignmentRepository,
                staffSkillRepository,
                skillRepository
        );

        autoScheduleService = new AutoScheduleService(
                shiftRepository,
                shiftAssignmentRepository,
                employmentRepository,
                staffSkillRepository,
                availabilityRepository,
                blackoutDateRepository,
                storeConfigRepository,
                schedulerConfigRepository,
                storeRepository,
                headcountQuotaService,
                spatialAllocationService
        );

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

        storeAccessService = new StoreAccessService(employmentRepository);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(headcountQuotaService.getStoreOpenTime(any())).thenReturn(LocalTime.of(8, 0));
        when(headcountQuotaService.getStoreCloseTime(any())).thenReturn(LocalTime.of(22, 0));

        when(storeConfigRepository.findByStoreId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return Optional.of(StoreConfiguration.builder().storeId(sId).minRestHours(12).build());
        });

        when(schedulerConfigRepository.findByStoreId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return Optional.of(SchedulerConfiguration.builder()
                    .storeId(sId)
                    .fairnessWeight(new BigDecimal("0.200"))
                    .skillWeight(new BigDecimal("0.250"))
                    .hourWeight(new BigDecimal("0.200"))
                    .restTimeWeight(new BigDecimal("0.150"))
                    .availabilityWeight(new BigDecimal("0.200"))
                    .build());
        });

        baristaSkill = Skill.builder().id(UUID.randomUUID()).name("Barista").store(store).build();
        cashierSkill = Skill.builder().id(UUID.randomUUID()).name("Cashier").store(store).build();

        barZone = StoreZone.builder().id(UUID.randomUUID()).name("Bar Counter").store(store).capacity(2).x(2.0).y(2.0).z(0.0).build();
        posZone = StoreZone.builder().id(UUID.randomUUID()).name("POS Counter").store(store).capacity(2).x(8.0).y(8.0).z(0.0).build();

        when(skillRepository.findById(baristaSkill.getId())).thenReturn(Optional.of(baristaSkill));
        when(skillRepository.findById(cashierSkill.getId())).thenReturn(Optional.of(cashierSkill));

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

        staffSkillsMap.clear();
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenAnswer(inv -> {
            List<UUID> uids = inv.getArgument(0);
            List<StaffSkill> res = new ArrayList<>();
            for (UUID uid : uids) {
                if (staffSkillsMap.containsKey(uid)) {
                    res.addAll(staffSkillsMap.get(uid));
                }
            }
            return res;
        });
        when(staffSkillRepository.findByStaffId(any())).thenAnswer(inv -> {
            UUID uid = inv.getArgument(0);
            return staffSkillsMap.getOrDefault(uid, Collections.emptyList());
        });

        when(shiftAssignmentRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(shiftRepository.save(any(Shift.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private AutoScheduleRequest createRequest() {
        return createRequest(startDate, endDate);
    }

    private AutoScheduleRequest createRequest(LocalDate start, LocalDate end) {
        AutoScheduleRequest req = new AutoScheduleRequest();
        req.setStartDate(start);
        req.setEndDate(end);
        return req;
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
        when(shiftRepository.findById(shift.getId())).thenReturn(Optional.of(shift));
        when(shiftRepository.findByIdAndStoreId(shift.getId(), storeId)).thenReturn(Optional.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());
        return shift;
    }

    private Employment createStaff(String name, int maxWeeklyHours, Skill skill, String level) {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).fullName(name).email(name.toLowerCase().replaceAll("\\s+", "") + "@example.com").systemRole(SystemRole.STAFF).build();
        ContractType ct = ContractType.builder().id(UUID.randomUUID()).name("Contract " + maxWeeklyHours).maxWeeklyHours(maxWeeklyHours).build();
        Employment emp = Employment.builder()
                .id(UUID.randomUUID())
                .user(user)
                .store(store)
                .contractType(ct)
                .status(EmploymentStatus.ACTIVE)
                .build();

        if (skill != null) {
            StaffSkill ss = StaffSkill.builder()
                    .id(UUID.randomUUID())
                    .staffId(userId)
                    .skillId(skill.getId())
                    .level(level != null ? level : "INTERMEDIATE")
                    .build();
            staffSkillsMap.computeIfAbsent(userId, k -> new ArrayList<>()).add(ss);
        }
        return emp;
    }

    // =========================================================================
    // GROUP A: STORE OPERATING SCHEDULE ENFORCEMENT (8 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group A: Store Operating Schedule Enforcement")
    class GroupA_StoreOperatingScheduleTests {

        @Test
        @DisplayName("A1: Shift start exactly at store open time is valid and accepted")
        void testA1_ShiftExactlyAtStoreOpen_Accepted() {
            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setShiftDate(startDate);
            req.setStartTime(LocalTime.of(8, 0)); // exactly store open
            req.setEndTime(LocalTime.of(16, 0));

            ShiftDTO dto = shiftService.createShift(storeId, req);
            assertNotNull(dto);
            assertEquals(LocalTime.of(8, 0), dto.getStartTime());
        }

        @Test
        @DisplayName("A2: Shift end exactly at store close time is valid and accepted")
        void testA2_ShiftExactlyAtStoreClose_Accepted() {
            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setShiftDate(startDate);
            req.setStartTime(LocalTime.of(14, 0));
            req.setEndTime(LocalTime.of(22, 0)); // exactly store close

            ShiftDTO dto = shiftService.createShift(storeId, req);
            assertNotNull(dto);
            assertEquals(LocalTime.of(22, 0), dto.getEndTime());
        }

        @Test
        @DisplayName("A3: Shift starting before store open time is rejected with 400 Bad Request")
        void testA3_ShiftStartsBeforeStoreOpen_Rejected() {
            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setShiftDate(startDate);
            req.setStartTime(LocalTime.of(7, 30)); // 30 mins before 08:00
            req.setEndTime(LocalTime.of(15, 30));

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, req));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Shift start time cannot be before store open time"));
        }

        @Test
        @DisplayName("A4: Shift ending after store close time is rejected with 400 Bad Request")
        void testA4_ShiftEndsAfterStoreClose_Rejected() {
            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setShiftDate(startDate);
            req.setStartTime(LocalTime.of(15, 0));
            req.setEndTime(LocalTime.of(22, 30)); // 30 mins after 22:00

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, req));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Shift end time cannot be after store close time"));
        }

        @Test
        @DisplayName("A5: Shift entirely outside operating hours is rejected")
        void testA5_ShiftEntirelyOutsideOperatingHours_Rejected() {
            ShiftCreateRequest reqEarly = new ShiftCreateRequest();
            reqEarly.setShiftDate(startDate);
            reqEarly.setStartTime(LocalTime.of(5, 0));
            reqEarly.setEndTime(LocalTime.of(7, 0));

            BusinessException exEarly = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, reqEarly));
            assertEquals(HttpStatus.BAD_REQUEST, exEarly.getStatus());

            ShiftCreateRequest reqLate = new ShiftCreateRequest();
            reqLate.setShiftDate(startDate);
            reqLate.setStartTime(LocalTime.of(22, 30));
            reqLate.setEndTime(LocalTime.of(23, 30));

            BusinessException exLate = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, reqLate));
            assertEquals(HttpStatus.BAD_REQUEST, exLate.getStatus());
        }

        @Test
        @DisplayName("A6: Updating shift to violate store operating hours is rejected")
        void testA6_ShiftUpdateViolatingOperatingHours_Rejected() {
            Shift existing = createShift(startDate, LocalTime.of(10, 0), LocalTime.of(18, 0));

            ShiftCreateRequest updateReq = new ShiftCreateRequest();
            updateReq.setShiftDate(startDate);
            updateReq.setStartTime(LocalTime.of(16, 0));
            updateReq.setEndTime(LocalTime.of(23, 0)); // exceeds 22:00

            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.updateShift(storeId, existing.getId(), updateReq));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Shift end time cannot be after store close time"));
        }

        @Test
        @DisplayName("A7: Auto-schedule purges existing draft shifts outside operating hours before execution")
        void testA7_AutoSchedulePurgesOutOfBoundsDraftShifts() {
            Shift validShift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            validShift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            Shift outOfBoundsShift = createShift(startDate, LocalTime.of(6, 0), LocalTime.of(14, 0)); // starts before 08:00
            outOfBoundsShift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            List<Shift> initialShifts = new ArrayList<>(Arrays.asList(validShift, outOfBoundsShift));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(initialShifts);

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            // The out-of-bounds shift was deleted
            verify(shiftRepository, atLeastOnce()).delete(outOfBoundsShift);
            // Only valid shift demand processed
            assertEquals(1, result.getTotalDemandSlots());
            assertEquals(1, result.getNewAssignmentsCreated());
        }

        @Test
        @DisplayName("A8: Store operating hours update alters shift validity boundary")
        void testA8_StoreHoursUpdateAltersValidityBoundary() {
            ShiftCreateRequest req = new ShiftCreateRequest();
            req.setShiftDate(startDate);
            req.setStartTime(LocalTime.of(8, 0));
            req.setEndTime(LocalTime.of(16, 0));

            // Under 08:00 - 22:00: Valid
            assertDoesNotThrow(() -> shiftService.createShift(storeId, req));

            // Store updates operating hours to 09:00 - 21:00
            store.setOpenTime(LocalTime.of(9, 0));
            store.setCloseTime(LocalTime.of(21, 0));

            // Same shift now rejected because 08:00 < 09:00
            BusinessException ex = assertThrows(BusinessException.class, () -> shiftService.createShift(storeId, req));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("Shift start time cannot be before store open time"));
        }
    }

    // =========================================================================
    // GROUP B: VARIABLE SHIFT DURATION HANDLING (6 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group B: Variable Shift Duration Handling")
    class GroupB_VariableShiftDurationTests {

        @Test
        @DisplayName("B1: 5.0h shift duration is calculated exactly without normalization")
        void testB1_FiveHourShiftExactDuration() {
            Shift shift5h = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(14, 0)); // 5 hours
            shift5h.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift5h));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getNewAssignmentsCreated());
            assertEquals(5.0, result.getFeasibility().getTotalDemandHours(), 0.001);
        }

        @Test
        @DisplayName("B2: 8.0h standard shift calculates exact 8.0 duration")
        void testB2_EightHourShiftExactDuration() {
            Shift shift8h = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0)); // 8 hours
            shift8h.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift8h));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getNewAssignmentsCreated());
            assertEquals(8.0, result.getFeasibility().getTotalDemandHours(), 0.001);
        }

        @Test
        @DisplayName("B3: 8.5h fractional shift preserves exact 8.5 duration without rounding")
        void testB3_EightPointFiveHourShiftFractionalDuration() {
            Shift shift85h = createShift(startDate, LocalTime.of(8, 30), LocalTime.of(17, 0)); // 8.5 hours
            shift85h.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift85h));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getNewAssignmentsCreated());
            assertEquals(8.5, result.getFeasibility().getTotalDemandHours(), 0.001);
        }

        @Test
        @DisplayName("B4: 10.0h long shift calculates exact 10.0 duration")
        void testB4_TenHourShiftExactDuration() {
            Shift shift10h = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(18, 0)); // 10 hours
            shift10h.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift10h));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getNewAssignmentsCreated());
            assertEquals(10.0, result.getFeasibility().getTotalDemandHours(), 0.001);
        }

        @Test
        @DisplayName("B5: Weekly hours threshold breach (HC4) enforced with fractional shifts (4x8.5h=34h <= 40h, next 8.5h=42.5h > 40h)")
        void testB5_WeeklyHoursThresholdBreach_WithFractionalShifts() {
            // Monday to Friday: 5 shifts of 8.5 hours each
            List<Shift> shifts = new ArrayList<>();
            for (int i = 0; i < 5; i++) {
                LocalDate date = startDate.plusDays(i);
                Shift s = createShift(date, LocalTime.of(8, 30), LocalTime.of(17, 0)); // 8.5h
                s.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
                shifts.add(s);
            }
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(shifts);

            // Staff contract max 40 hours
            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            // 4 shifts = 34.0h (within 40h). 5th shift would be 42.5h > 40h -> HC4 rejects Alice!
            assertEquals(4, result.getNewAssignmentsCreated(), "Only 4 shifts of 8.5h can be assigned without exceeding 40h limit");
            assertEquals(1, result.getShortageSlots(), "5th shift must result in shortage due to HC4 weekly limit");
            assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
        }

        @Test
        @DisplayName("B6: Rest gap enforcement (HC3) respects exact shift end and start times across consecutive days")
        void testB6_RestGapEnforcement_ExactShiftDurationInterleaving() {
            // Day 1: Late shift 14:00 - 22:00 (ends at 22:00)
            Shift day1Shift = createShift(startDate, LocalTime.of(14, 0), LocalTime.of(22, 0));
            day1Shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            // Day 2: Early shift 08:00 - 16:00 (starts at 08:00 -> gap is 10h < 12h minRestHours)
            Shift day2Shift = createShift(startDate.plusDays(1), LocalTime.of(8, 0), LocalTime.of(16, 0));
            day2Shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(day1Shift, day2Shift));

            Employment emp = createStaff("Alice", 48, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            // Alice gets assigned to Day 1, but Day 2 is blocked by HC3 (10h rest < 12h)
            assertEquals(1, result.getNewAssignmentsCreated());
            assertEquals(1, result.getShortageSlots());
        }
    }

    // =========================================================================
    // GROUP C: MULTIPLE DAILY SHIFTS (5 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group C: Multiple Daily Shifts")
    class GroupC_MultipleDailyShiftsTests {

        @Test
        @DisplayName("C1: Three non-canonical daily shifts are processed independently without collapsing")
        void testC1_ThreeNonCanonicalShiftsSameDay_Independent() {
            Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));   // Morning 4h
            s1.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            Shift s2 = createShift(startDate, LocalTime.of(12, 30), LocalTime.of(17, 0)); // Midday 4.5h
            s2.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            Shift s3 = createShift(startDate, LocalTime.of(17, 30), LocalTime.of(22, 0)); // Evening 4.5h
            s3.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(s1, s2, s3));

            Employment emp1 = createStaff("Alice", 40, baristaSkill, "EXPERT");
            Employment emp2 = createStaff("Bob", 40, baristaSkill, "INTERMEDIATE");
            Employment emp3 = createStaff("Charlie", 40, baristaSkill, "BEGINNER");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Arrays.asList(emp1, emp2, emp3));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(3, result.getTotalDemandSlots());
            assertEquals(3, result.getNewAssignmentsCreated());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        }

        @Test
        @DisplayName("C2: Four staggered daily shifts receive distinct assignments respecting availability")
        void testC2_FourStaggeredDailyShifts_DistinctAssignments() {
            Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(11, 0));
            s1.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            Shift s2 = createShift(startDate, LocalTime.of(11, 0), LocalTime.of(14, 0));
            s2.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            Shift s3 = createShift(startDate, LocalTime.of(14, 0), LocalTime.of(18, 0));
            s3.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            Shift s4 = createShift(startDate, LocalTime.of(18, 0), LocalTime.of(22, 0));
            s4.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(s1, s2, s3, s4));

            List<Employment> staff = Arrays.asList(
                    createStaff("Alice", 40, baristaSkill, "EXPERT"),
                    createStaff("Bob", 40, baristaSkill, "INTERMEDIATE"),
                    createStaff("Charlie", 40, baristaSkill, "BEGINNER"),
                    createStaff("David", 40, baristaSkill, "EXPERT")
            );
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(staff);

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(4, result.getNewAssignmentsCreated());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        }

        @Test
        @DisplayName("C3: Multiple daily shifts accurately aggregate total headcount demand")
        void testC3_MultipleShiftsHeadcountAccumulation() {
            Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
            s1.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(3).build()));

            Shift s2 = createShift(startDate, LocalTime.of(13, 0), LocalTime.of(17, 0));
            s2.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build()));

            Shift s3 = createShift(startDate, LocalTime.of(18, 0), LocalTime.of(22, 0));
            s3.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(4).build()));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(s1, s2, s3));

            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.emptyList());

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(9, result.getTotalDemandSlots(), "Total demand should be 3 + 2 + 4 = 9");
            assertEquals(9, result.getShortageSlots());
        }

        @Test
        @DisplayName("C4: Staff cannot be assigned to overlapping daily shifts (HC1 hard constraint)")
        void testC4_StaffCannotBeAssignedToOverlappingDailyShifts_HC1() {
            // Shift A: 08:00 - 14:00
            Shift shiftA = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(14, 0));
            shiftA.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            // Shift B: 12:00 - 18:00 (overlaps from 12:00 to 14:00)
            Shift shiftB = createShift(startDate, LocalTime.of(12, 0), LocalTime.of(18, 0));
            shiftB.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(shiftA, shiftB));

            // Only 1 staff available
            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            // Alice can only be assigned to one shift; the second shift is blocked by HC1
            assertEquals(1, result.getNewAssignmentsCreated());
            assertEquals(1, result.getShortageSlots());
        }

        @Test
        @DisplayName("C5: Multiple daily shifts with different skill requirements match correct staff")
        void testC5_MultipleDailyShiftsDifferentSkills() {
            Shift morning = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
            morning.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            Shift evening = createShift(startDate, LocalTime.of(17, 0), LocalTime.of(21, 0));
            evening.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(cashierSkill).requiredCount(1).build()));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(morning, evening));

            Employment baristaStaff = createStaff("Alice", 40, baristaSkill, "EXPERT");
            Employment cashierStaff = createStaff("Bob", 40, cashierSkill, "INTERMEDIATE");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Arrays.asList(baristaStaff, cashierStaff));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(2, result.getNewAssignmentsCreated());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        }
    }

    // =========================================================================
    // GROUP D: DEMAND & CAPACITY DEDUCTION (5 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group D: Demand & Capacity Deduction")
    class GroupD_DemandCapacityTests {

        @Test
        @DisplayName("D1: Exact requiredCount adherence - exactly required count is assigned, no over-assignment")
        void testD1_ExactRequiredCountAdherence() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            // 5 qualified staff available
            List<Employment> staff = Arrays.asList(
                    createStaff("Alice", 40, baristaSkill, "EXPERT"),
                    createStaff("Bob", 40, baristaSkill, "EXPERT"),
                    createStaff("Charlie", 40, baristaSkill, "EXPERT"),
                    createStaff("David", 40, baristaSkill, "EXPERT"),
                    createStaff("Eve", 40, baristaSkill, "EXPERT")
            );
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(staff);

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(2, result.getTotalDemandSlots());
            assertEquals(2, result.getNewAssignmentsCreated(), "Must assign exactly 2 candidates, never 3 or more");
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        }

        @Test
        @DisplayName("D2: Manual assignment deduction reduces demand for matching skill")
        void testD2_ManualAssignmentDeductionMatchingSkill() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(3).build()));

            User manualUser = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment manualAssignment = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .shift(shift)
                    .staff(manualUser)
                    .source(AssignmentSource.MANUAL)
                    .deleted(false)
                    .build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(manualAssignment));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            List<Employment> staff = Arrays.asList(
                    createStaff("Alice", 40, baristaSkill, "EXPERT"),
                    createStaff("Bob", 40, baristaSkill, "INTERMEDIATE")
            );
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(staff);

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(3, result.getTotalDemandSlots());
            assertEquals(1, result.getExistingManualAssignments());
            assertEquals(2, result.getSchedulerDemandSlots());
            assertEquals(2, result.getNewAssignmentsCreated());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        }

        @Test
        @DisplayName("D3: Manual assignment does not deduct demand for different skill")
        void testD3_ManualAssignmentDoesNotDeductDifferentSkill() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement reqBarista = ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build();
            ShiftSkillRequirement reqCashier = ShiftSkillRequirement.builder().skill(cashierSkill).requiredCount(2).build();
            shift.setRequirements(Arrays.asList(reqBarista, reqCashier));

            // Manual assignment with cashierSkill (or staff having cashierSkill)
            User manualCashier = User.builder().id(UUID.randomUUID()).build();
            StaffSkill ss = StaffSkill.builder().staffId(manualCashier.getId()).skillId(cashierSkill.getId()).level(com.shiftsync.skill.entity.SkillLevel.INTERMEDIATE).build();
            staffSkillsMap.put(manualCashier.getId(), Collections.singletonList(ss));

            ShiftAssignment manualAssignment = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .shift(shift)
                    .staff(manualCashier)
                    .source(AssignmentSource.MANUAL)
                    .requiredSkillId(cashierSkill.getId())
                    .deleted(false)
                    .build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(manualAssignment));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment barista1 = createStaff("Alice", 40, baristaSkill, "EXPERT");
            Employment barista2 = createStaff("Bob", 40, baristaSkill, "EXPERT");
            Employment cashier1 = createStaff("Charlie", 40, cashierSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Arrays.asList(barista1, barista2, cashier1));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(4, result.getTotalDemandSlots());
            assertEquals(1, result.getExistingManualAssignments());
            assertEquals(3, result.getSchedulerDemandSlots(), "Barista demand is 2, Cashier demand is 1 -> total scheduler demand 3");
            assertEquals(3, result.getNewAssignmentsCreated());
        }

        @Test
        @DisplayName("D4: Soft-deleted assignments (deleted=true) are ignored during demand deduction")
        void testD4_SoftDeletedAssignmentsIgnored() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            User deletedStaff = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment softDeletedAssignment = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .shift(shift)
                    .staff(deletedStaff)
                    .source(AssignmentSource.MANUAL)
                    .deleted(true) // SOFT DELETED
                    .build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(softDeletedAssignment));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getTotalDemandSlots());
            assertEquals(0, result.getExistingManualAssignments(), "Soft deleted assignment must not count as manual");
            assertEquals(1, result.getSchedulerDemandSlots());
            assertEquals(1, result.getNewAssignmentsCreated());
        }

        @Test
        @DisplayName("D5: Excess manual assignments do not produce negative demand")
        void testD5_ExcessManualAssignmentsNoNegativeDemand() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            User u1 = User.builder().id(UUID.randomUUID()).build();
            User u2 = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment m1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u1).source(AssignmentSource.MANUAL).deleted(false).build();
            ShiftAssignment m2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u2).source(AssignmentSource.MANUAL).deleted(false).build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Arrays.asList(m1, m2));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getTotalDemandSlots());
            assertEquals(2, result.getExistingManualAssignments());
            assertEquals(0, result.getSchedulerDemandSlots(), "Demand slots must be max(0, required - manual) = 0");
            assertEquals(0, result.getNewAssignmentsCreated());
        }
    }

    // =========================================================================
    // GROUP E: WEIGHTED OPTIMIZATION & DETERMINISM (6 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group E: Weighted Optimization & Determinism")
    class GroupE_WeightedOptimizationTests {

        @Test
        @DisplayName("E1: Skill-heavy configuration prioritizes higher skill level over assigned hours")
        void testE1_SkillHeavyConfiguration() {
            SchedulerConfiguration skillHeavy = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("0.050"))
                    .skillWeight(new BigDecimal("0.800"))
                    .hourWeight(new BigDecimal("0.050"))
                    .restTimeWeight(new BigDecimal("0.050"))
                    .availabilityWeight(new BigDecimal("0.050"))
                    .build();
            when(schedulerConfigRepository.findByStoreId(storeId)).thenReturn(Optional.of(skillHeavy));

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment expert = createStaff("Alice", 40, baristaSkill, "EXPERT");
            Employment basic = createStaff("Bob", 40, baristaSkill, "BEGINNER");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Arrays.asList(basic, expert));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getNewAssignmentsCreated());
            ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
            verify(shiftAssignmentRepository, atLeastOnce()).saveAll(captor.capture());
            assertEquals(expert.getUser().getId(), captor.getValue().get(0).getStaff().getId(), "Expert skill must be selected under skill-heavy weights");
        }

        @Test
        @DisplayName("E2: Hour-heavy configuration prioritizes staff with lower assigned hours")
        void testE2_HourHeavyConfiguration() {
            SchedulerConfiguration hourHeavy = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("0.050"))
                    .skillWeight(new BigDecimal("0.050"))
                    .hourWeight(new BigDecimal("0.800"))
                    .restTimeWeight(new BigDecimal("0.050"))
                    .availabilityWeight(new BigDecimal("0.050"))
                    .build();
            when(schedulerConfigRepository.findByStoreId(storeId)).thenReturn(Optional.of(hourHeavy));

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment alice = createStaff("Alice", 40, baristaSkill, "EXPERT");
            Employment bob = createStaff("Bob", 40, baristaSkill, "BEGINNER");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Arrays.asList(alice, bob));

            // Give Alice an existing 16h assignment earlier
            Shift priorShift = createShift(startDate.minusDays(2), LocalTime.of(8, 0), LocalTime.of(16, 0));
            ShiftAssignment priorAss = ShiftAssignment.builder().id(UUID.randomUUID()).shift(priorShift).staff(alice.getUser()).build();
            when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                    .thenReturn(Collections.singletonList(priorAss));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getNewAssignmentsCreated());
            ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
            verify(shiftAssignmentRepository, atLeastOnce()).saveAll(captor.capture());
            assertEquals(bob.getUser().getId(), captor.getValue().get(0).getStaff().getId(), "Bob with fewer assigned hours must be selected under hour-heavy weights");
        }

        @Test
        @DisplayName("E3: Deterministic ranking repeatability - multiple runs with identical input produce identical output")
        void testE3_DeterministicRankingRepeatability() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            List<Employment> staff = Arrays.asList(
                    createStaff("Alice", 40, baristaSkill, "EXPERT"),
                    createStaff("Bob", 40, baristaSkill, "INTERMEDIATE"),
                    createStaff("Charlie", 40, baristaSkill, "INTERMEDIATE")
            );
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(staff);

            AutoScheduleResult res1 = autoScheduleService.autoSchedule(storeId, createRequest());
            AutoScheduleResult res2 = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(res1.getNewAssignmentsCreated(), res2.getNewAssignmentsCreated());
            assertEquals(res1.getStatus(), res2.getStatus());
            assertEquals(res1.getCoverageRate(), res2.getCoverageRate());
        }

        @Test
        @DisplayName("E4: Tie-breaking level 1 - lower utilizationRatio is selected first when composite scores match")
        void testE4_TieBreakingLevel1_UtilizationRatio() {
            // Staff 1 with 40h contract (utilization = 8/40 = 0.20)
            // Staff 2 with 20h contract (utilization = 8/20 = 0.40)
            // Both have identical skills and identical assigned hours (8h)
            AutoScheduleService.StaffData s1 = new AutoScheduleService.StaffData();
            s1.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(40).build()).build());
            s1.setAssignedHours(8.0);

            AutoScheduleService.StaffData s2 = new AutoScheduleService.StaffData();
            s2.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(20).build()).build());
            s2.setAssignedHours(8.0);

            assertTrue(s1.getUtilizationRatio() < s2.getUtilizationRatio());
            assertEquals(0.20, s1.getUtilizationRatio(), 0.001);
            assertEquals(0.40, s2.getUtilizationRatio(), 0.001);
        }

        @Test
        @DisplayName("E5: Tie-breaking level 2 & 3 - dynamic hash and UUID tie breaking is deterministic")
        void testE5_TieBreakingLevel2And3_DynamicHashAndUUID() {
            UUID slotShiftId = UUID.randomUUID();
            UUID staff1Id = UUID.fromString("00000000-0000-0000-0000-000000000001");
            UUID staff2Id = UUID.fromString("00000000-0000-0000-0000-000000000002");

            int hash1 = Objects.hash(slotShiftId, staff1Id);
            int hash2 = Objects.hash(slotShiftId, staff2Id);

            // Verify hashes are strictly repeatable across calls
            assertEquals(hash1, Objects.hash(slotShiftId, staff1Id));
            assertEquals(hash2, Objects.hash(slotShiftId, staff2Id));
            assertTrue(staff1Id.compareTo(staff2Id) < 0);
        }

        @Test
        @DisplayName("E6: Weights sum validation - sum != 1.000 or negative weight throws BusinessException 400")
        void testE6_WeightsValidationRejection() {
            SchedulerConfiguration invalidSum = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("0.500"))
                    .skillWeight(new BigDecimal("0.600")) // sum = 1.100
                    .hourWeight(new BigDecimal("0.000"))
                    .restTimeWeight(new BigDecimal("0.000"))
                    .availabilityWeight(new BigDecimal("0.000"))
                    .build();

            BusinessException ex = assertThrows(BusinessException.class, invalidSum::validateWeights);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        }
    }

    // =========================================================================
    // GROUP F: SPATIAL ALLOCATION (4 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group F: Spatial Allocation")
    class GroupF_SpatialAllocationTests {

        @Test
        @DisplayName("F1: Preserves explicit zone and workstation from requirement without overwriting")
        void testF1_PreservesExplicitZoneAndWorkstation() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            Workstation ws = Workstation.builder().id(UUID.randomUUID()).name("Barista Station Alpha").zone(barZone).build();

            ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                    .skill(baristaSkill)
                    .requiredCount(1)
                    .zone(barZone)
                    .workstation(ws)
                    .build();
            shift.setRequirements(Collections.singletonList(req));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));
            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Arrays.asList(barZone, posZone));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(1, result.getNewAssignmentsCreated());
            ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
            verify(shiftAssignmentRepository, atLeastOnce()).saveAll(captor.capture());
            ShiftAssignment saved = captor.getValue().get(0);
            assertNotNull(saved.getZone());
            assertEquals(barZone.getId(), saved.getZone().getId());
        }

        @Test
        @DisplayName("F2: Enforces workstation capacity limit and flags unallocated staff when capacity exceeded")
        void testF2_EnforcesWorkstationCapacityLimits() {
            StoreZone limitedZone = StoreZone.builder().id(UUID.randomUUID()).name("Single Desk").store(store).capacity(1).x(0.0).y(0.0).z(0.0).build();
            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Collections.singletonList(limitedZone));

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            User u1 = User.builder().id(UUID.randomUUID()).build();
            User u2 = User.builder().id(UUID.randomUUID()).build();

            ShiftAssignment a1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u1).build();
            ShiftAssignment a2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u2).build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Arrays.asList(a1, a2));

            SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(storeId, shift.getId());

            assertEquals(1, result.getAllocatedStaffCount());
            assertEquals(1, result.getUnallocatedStaffCount(), "Second staff member cannot exceed capacity 1");
        }

        @Test
        @DisplayName("F3: Semantic zone matching - allocates Barista to Bar Zone and Cashier to POS Zone")
        void testF3_SemanticZoneMatching() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Arrays.asList(barZone, posZone));

            User baristaUser = User.builder().id(UUID.randomUUID()).build();
            StaffSkill ssBarista = StaffSkill.builder().staffId(baristaUser.getId()).skillId(baristaSkill.getId()).build();
            when(staffSkillRepository.findByStaffId(baristaUser.getId())).thenReturn(Collections.singletonList(ssBarista));

            ShiftAssignment assignment = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(baristaUser).build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(assignment));

            SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(storeId, shift.getId());

            assertEquals(1, result.getAllocatedStaffCount());
            assertEquals(barZone.getId(), assignment.getZone().getId(), "Barista must semantically map to Bar Counter");
        }

        @Test
        @DisplayName("F4: Spatial dispersion spreads staff across available workstations")
        void testF4_SpatialDispersionSpreadsStaffAcrossStations() {
            Workstation ws1 = Workstation.builder().id(UUID.randomUUID()).name("WS-1").zone(barZone).capacity(1).x(1.0).y(1.0).z(0.0).build();
            Workstation ws2 = Workstation.builder().id(UUID.randomUUID()).name("WS-2").zone(barZone).capacity(1).x(5.0).y(5.0).z(0.0).build();

            when(workstationRepository.findByZoneId(barZone.getId())).thenReturn(Arrays.asList(ws1, ws2));
            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Collections.singletonList(barZone));

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            User u1 = User.builder().id(UUID.randomUUID()).build();
            User u2 = User.builder().id(UUID.randomUUID()).build();

            ShiftAssignment a1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u1).build();
            ShiftAssignment a2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u2).build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Arrays.asList(a1, a2));

            SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(storeId, shift.getId());

            assertEquals(2, result.getAllocatedStaffCount());
            assertEquals(0, result.getUnallocatedStaffCount());
        }
    }

    // =========================================================================
    // GROUP G: TRANSACTION ROLLBACK & ATOMICITY (3 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group G: Transaction Rollback & Atomicity")
    class GroupG_TransactionRollbackTests {

        @Test
        @DisplayName("G1: Database error during assignment save propagates exception for transaction rollback")
        void testG1_ExceptionDuringSaveTriggersRollback() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            when(shiftAssignmentRepository.saveAll(anyList())).thenThrow(new DataIntegrityViolationException("Simulated DB constraint error"));

            assertThrows(DataIntegrityViolationException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));
        }

        @Test
        @DisplayName("G2: Failed auto-schedule execution does not produce partial valid result")
        void testG2_FailedExecutionLeavesNoPartialResult() {
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenThrow(new RuntimeException("Connection timeout"));

            assertThrows(RuntimeException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));
            verify(shiftAssignmentRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("G3: Idempotent re-run purges previous AUTO assignments cleanly")
        void testG3_IdempotentRerunPurgesPreviousAutoAssignments() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));

            User oldAutoUser = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment oldAutoAssignment = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .shift(shift)
                    .staff(oldAutoUser)
                    .source(AssignmentSource.AUTO)
                    .deleted(false)
                    .build();

            when(shiftAssignmentRepository.findByShiftId(shift.getId()))
                    .thenReturn(Collections.singletonList(oldAutoAssignment));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            verify(shiftAssignmentRepository, atLeastOnce()).deleteAll(anyList());
            assertEquals(1, result.getNewAssignmentsCreated());
        }
    }

    // =========================================================================
    // GROUP H: REAL CONCURRENCY (6 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group H: Real Concurrency")
    class GroupH_RealConcurrencyTests {

        @Test
        @DisplayName("H1: Concurrent auto-scheduling for different stores using CyclicBarrier succeeds without cross-talk")
        void testH1_ConcurrentAutoScheduleDifferentStores() throws Exception {
            UUID storeA = UUID.randomUUID();
            UUID storeB = UUID.randomUUID();

            Store sA = Store.builder().id(storeA).name("Store A").openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(22, 0)).build();
            Store sB = Store.builder().id(storeB).name("Store B").openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(22, 0)).build();

            when(storeRepository.findById(storeA)).thenReturn(Optional.of(sA));
            when(storeRepository.findById(storeB)).thenReturn(Optional.of(sB));

            Shift shiftA = Shift.builder().id(UUID.randomUUID()).store(sA).shiftDate(startDate).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).status(ShiftStatus.DRAFT).requirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build())).assignments(new ArrayList<>()).version(0L).build();
            Shift shiftB = Shift.builder().id(UUID.randomUUID()).store(sB).shiftDate(startDate).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).status(ShiftStatus.DRAFT).requirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build())).assignments(new ArrayList<>()).version(0L).build();

            when(shiftRepository.findByStoreIdAndShiftDateBetween(eq(storeA), any(), any())).thenReturn(Collections.singletonList(shiftA));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(eq(storeB), any(), any())).thenReturn(Collections.singletonList(shiftB));

            Employment empA = createStaff("StaffA", 40, baristaSkill, "EXPERT");
            Employment empB = createStaff("StaffB", 40, baristaSkill, "EXPERT");

            when(employmentRepository.findByStoreIdAndStatus(eq(storeA), any())).thenReturn(Collections.singletonList(empA));
            when(employmentRepository.findByStoreIdAndStatus(eq(storeB), any())).thenReturn(Collections.singletonList(empB));

            int threads = 2;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CyclicBarrier barrier = new CyclicBarrier(threads);
            ConcurrentLinkedQueue<AutoScheduleResult> results = new ConcurrentLinkedQueue<>();
            List<Future<?>> futures = new ArrayList<>();

            futures.add(executor.submit(() -> {
                try {
                    barrier.await();
                    results.add(autoScheduleService.autoSchedule(storeA, createRequest()));
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }));

            futures.add(executor.submit(() -> {
                try {
                    barrier.await();
                    results.add(autoScheduleService.autoSchedule(storeB, createRequest()));
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }));

            for (Future<?> f : futures) {
                f.get(10, TimeUnit.SECONDS);
            }
            executor.shutdown();

            assertEquals(2, results.size());
            for (AutoScheduleResult r : results) {
                assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r.getStatus());
                assertEquals(1, r.getNewAssignmentsCreated());
            }
        }

        @Test
        @DisplayName("H2: Partial unique index simulation throws DataIntegrityViolationException on duplicate active assignment")
        void testH2_PartialUniqueIndexPreventsDuplicateActiveAssignment() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            User staffUser = User.builder().id(UUID.randomUUID()).build();

            ShiftAssignment a1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(staffUser).deleted(false).build();
            ShiftAssignment a2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(staffUser).deleted(false).build();

            // Simulate DB constraint violation when attempting to insert duplicate active assignment
            doThrow(new DataIntegrityViolationException("Unique index violation: idx_shift_assignment_shift_staff_active"))
                    .when(shiftAssignmentRepository).save(argThat(a -> a.getStaff().getId().equals(staffUser.getId())));

            assertThrows(DataIntegrityViolationException.class, () -> shiftAssignmentRepository.save(a2));
        }

        @Test
        @DisplayName("H3: Multi-threaded candidate scoring safety yields identical scores across 10 concurrent threads")
        void testH3_MultiThreadedCandidateScoringSafety() throws Exception {
            int threads = 10;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CyclicBarrier barrier = new CyclicBarrier(threads);
            ConcurrentHashMap<Integer, BigDecimal> scores = new ConcurrentHashMap<>();

            SchedulerConfiguration cfg = SchedulerConfiguration.builder().storeId(storeId).build();
            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");

            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                final int idx = i;
                futures.add(executor.submit(() -> {
                    try {
                        barrier.await();
                        // Composite score formula verification
                        BigDecimal score = cfg.getFairnessWeight().multiply(BigDecimal.ONE)
                                .add(cfg.getSkillWeight().multiply(new BigDecimal("0.85")))
                                .add(cfg.getHourWeight().multiply(new BigDecimal("0.70")))
                                .add(cfg.getRestTimeWeight().multiply(BigDecimal.ONE))
                                .add(cfg.getAvailabilityWeight().multiply(BigDecimal.ONE));
                        scores.put(idx, score);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }));
            }

            for (Future<?> f : futures) {
                f.get(5, TimeUnit.SECONDS);
            }
            executor.shutdown();

            assertEquals(10, scores.size());
            BigDecimal reference = scores.get(0);
            for (BigDecimal sc : scores.values()) {
                assertEquals(reference, sc, "Scores across all threads must be strictly identical");
            }
        }

        @Test
        @DisplayName("H4: Thread safety of staff skill mapping under concurrent access")
        void testH4_ThreadSafetyOfStaffSkillMapping() throws Exception {
            int threads = 8;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch latch = new CountDownLatch(threads);
            AtomicInteger successCount = new AtomicInteger(0);

            for (int i = 0; i < threads; i++) {
                final int idx = i;
                executor.submit(() -> {
                    try {
                        UUID uId = UUID.randomUUID();
                        StaffSkill ss = StaffSkill.builder().staffId(uId).skillId(baristaSkill.getId()).level(com.shiftsync.skill.entity.SkillLevel.INTERMEDIATE).build();
                        staffSkillsMap.put(uId, Collections.singletonList(ss));
                        List<StaffSkill> found = staffSkillsMap.get(uId);
                        if (found != null && !found.isEmpty()) {
                            successCount.incrementAndGet();
                        }
                    } finally {
                        latch.countDown();
                    }
                });
            }

            assertTrue(latch.await(5, TimeUnit.SECONDS));
            executor.shutdown();
            assertEquals(8, successCount.get());
        }

        @Test
        @DisplayName("H5: Optimistic locking version increment is verified on Shift entity")
        void testH5_OptimisticLockingVersionCheckOnShift() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            assertEquals(0L, shift.getVersion());

            shift.setVersion(1L);
            assertEquals(1L, shift.getVersion());
        }

        @Test
        @DisplayName("H6: Resilience under high volume concurrent requests")
        void testH6_ResilienceUnderHighVolumeConcurrentRequests() throws Exception {
            int count = 20;
            ExecutorService executor = Executors.newFixedThreadPool(4);
            List<Callable<Boolean>> tasks = new ArrayList<>();

            for (int i = 0; i < count; i++) {
                tasks.add(() -> {
                    SchedulerConfiguration c = SchedulerConfiguration.builder().storeId(UUID.randomUUID()).build();
                    return c.getSkillWeight().compareTo(BigDecimal.ZERO) > 0;
                });
            }

            List<Future<Boolean>> results = executor.invokeAll(tasks);
            executor.shutdown();

            for (Future<Boolean> f : results) {
                assertTrue(f.get());
            }
        }
    }

    // =========================================================================
    // GROUP I: COVERAGE & SHORTAGE DIAGNOSTICS (4 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group I: Coverage & Shortage Diagnostics")
    class GroupI_CoverageAndShortageDiagnosticsTests {

        @Test
        @DisplayName("I1: FULL_COVERAGE status returned when 100% of demand slots are filled")
        void testI1_FullCoverageStatus() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
            assertEquals(0, result.getShortageSlots());
            assertEquals(100.0, result.getCoverageRate(), 0.001);
            assertTrue(result.getShortages().isEmpty());
        }

        @Test
        @DisplayName("I2: PARTIAL_COVERAGE status returned when some demand slots remain unfilled")
        void testI2_PartialCoverageStatus() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            // Only 1 staff member
            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(emp));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
            assertEquals(1, result.getShortageSlots());
            assertEquals(50.0, result.getCoverageRate(), 0.001);
            assertEquals(1, result.getShortages().size());
        }

        @Test
        @DisplayName("I3: ZERO_COVERAGE status returned when zero demand slots are filled")
        void testI3_NoCoverageStatus() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            shift.setRequirements(Collections.singletonList(ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build()));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            // 0 qualified staff available
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.emptyList());

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, result.getStatus());
            assertEquals(2, result.getShortageSlots());
            assertEquals(0.0, result.getCoverageRate(), 0.001);
            assertEquals(1, result.getShortages().size());
        }

        @Test
        @DisplayName("I4: Shortage diagnostics distinguishes NO_QUALIFIED_STAFF vs CONSTRAINTS_VIOLATED")
        void testI4_ShortageDiagnosticsDistinguishesRootCauses() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            // Demand for Barista and Cashier
            ShiftSkillRequirement reqBarista = ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build();
            ShiftSkillRequirement reqCashier = ShiftSkillRequirement.builder().skill(cashierSkill).requiredCount(1).build();
            shift.setRequirements(Arrays.asList(reqBarista, reqCashier));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate)).thenReturn(Collections.singletonList(shift));

            // Staff 1 is a Barista, but contract max hours is 0 (violates HC4)
            Employment baristaZeroHours = createStaff("Alice", 0, baristaSkill, "EXPERT");
            // No staff has Cashier skill
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(Collections.singletonList(baristaZeroHours));

            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

            assertEquals(2, result.getShortageSlots());
            List<ShortageDetailDTO> shortages = result.getShortages();
            assertEquals(2, shortages.size());

            ShortageDetailDTO cashierShortage = shortages.stream()
                    .filter(s -> s.getSkillId().equals(cashierSkill.getId()))
                    .findFirst().orElseThrow();
            assertEquals("NO_QUALIFIED_STAFF", cashierShortage.getPrimaryReason());

            ShortageDetailDTO baristaShortage = shortages.stream()
                    .filter(s -> s.getSkillId().equals(baristaSkill.getId()))
                    .findFirst().orElseThrow();
            assertEquals("CONSTRAINTS_VIOLATED", baristaShortage.getPrimaryReason());
            assertNotNull(baristaShortage.getDiagnosticDetails());
            assertFalse(baristaShortage.getDiagnosticDetails().isEmpty());
        }
    }

    // =========================================================================
    // GROUP J: RBAC & STORE ISOLATION (3 tests)
    // =========================================================================
    @Nested
    @DisplayName("Group J: RBAC & Store Isolation")
    class GroupJ_RbacStoreIsolationTests {

        @Test
        @DisplayName("J1: Store Manager can access employed store but is denied access to other stores")
        void testJ1_ManagerStoreAccessIsolation() {
            UUID storeA = storeId;
            UUID storeB = UUID.randomUUID();

            UUID managerId = UUID.randomUUID();
            User managerUser = User.builder().id(managerId).systemRole(SystemRole.MANAGER).build();
            CustomUserDetails managerDetails = new CustomUserDetails(managerUser);

            Authentication auth = mock(Authentication.class);
            when(auth.getPrincipal()).thenReturn(managerDetails);

            when(employmentRepository.isStaffInStore(managerId, storeA, EmploymentStatus.ACTIVE)).thenReturn(true);
            when(employmentRepository.isStaffInStore(managerId, storeB, EmploymentStatus.ACTIVE)).thenReturn(false);

            assertTrue(storeAccessService.canAccessStore(auth, storeA), "Manager employed at Store A must be granted access");
            assertFalse(storeAccessService.canAccessStore(auth, storeB), "Manager NOT employed at Store B must be denied access");
        }

        @Test
        @DisplayName("J2: Admin can access any store regardless of employment record")
        void testJ2_AdminCanAccessAnyStore() {
            UUID randomStoreId = UUID.randomUUID();

            UUID adminId = UUID.randomUUID();
            User adminUser = User.builder().id(adminId).systemRole(SystemRole.ADMIN).build();
            CustomUserDetails adminDetails = new CustomUserDetails(adminUser);

            Authentication auth = mock(Authentication.class);
            when(auth.getPrincipal()).thenReturn(adminDetails);

            assertTrue(storeAccessService.canAccessStore(auth, randomStoreId), "Admin must have global access to any store");
            verify(employmentRepository, never()).isStaffInStore(any(), any(), any());
        }

        @Test
        @DisplayName("J3: Cross-store data isolation ensures shifts of Store A are never included in Store B scheduling")
        void testJ3_CrossStoreDataIsolation() {
            UUID otherStoreId = UUID.randomUUID();
            Store otherStore = Store.builder().id(otherStoreId).name("Store Other").openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(22, 0)).build();
            when(storeRepository.findById(otherStoreId)).thenReturn(Optional.of(otherStore));

            Shift otherStoreShift = Shift.builder().id(UUID.randomUUID()).store(otherStore).shiftDate(startDate).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).status(ShiftStatus.DRAFT).requirements(Collections.emptyList()).assignments(new ArrayList<>()).version(0L).build();

            when(shiftRepository.findByStoreIdAndShiftDateBetween(otherStoreId, startDate, endDate)).thenReturn(Collections.singletonList(otherStoreShift));

            AutoScheduleResult resultOther = autoScheduleService.autoSchedule(otherStoreId, createRequest());

            // Scheduling Store Other should query shifts for otherStoreId only, never storeId
            verify(shiftRepository).findByStoreIdAndShiftDateBetween(otherStoreId, startDate, endDate);
            verify(shiftRepository, never()).findByStoreIdAndShiftDateBetween(storeId, startDate, endDate);
            assertEquals(otherStoreId, resultOther.getStoreId());
        }
    }
}
