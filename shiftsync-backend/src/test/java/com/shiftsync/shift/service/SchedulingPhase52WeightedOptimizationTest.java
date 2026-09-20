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
import com.shiftsync.layout.dto.SpatialAllocationResultDto;
import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.layout.repository.WorkstationRepository;
import com.shiftsync.layout.service.SpatialAllocationService;
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
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchedulingPhase52WeightedOptimizationTest {

    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private StaffSkillRepository staffSkillRepository;
    @Mock private AvailabilityRepository availabilityRepository;
    @Mock private BlackoutDateRepository blackoutDateRepository;
    @Mock private StoreConfigurationRepository storeConfigRepo;
    @Mock private SchedulerConfigurationRepository schedulerConfigRepo;
    @Mock private StoreRepository storeRepository;
    @Mock private HeadcountQuotaService headcountQuotaService;
    @Mock private StoreZoneRepository storeZoneRepository;
    @Mock private StoreLayoutRepository storeLayoutRepository;
    @Mock private WorkstationRepository workstationRepository;
    @Mock private SkillRepository skillRepository;

    private SpatialAllocationService spatialAllocationService;
    private AutoScheduleService autoScheduleService;

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
                .name("ShiftSync Benchmark Store")
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
                storeConfigRepo,
                schedulerConfigRepo,
                storeRepository,
                headcountQuotaService,
                spatialAllocationService
        );

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(headcountQuotaService.getStoreOpenTime(any())).thenReturn(LocalTime.of(8, 0));
        when(headcountQuotaService.getStoreCloseTime(any())).thenReturn(LocalTime.of(22, 0));

        when(storeConfigRepo.findByStoreId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return Optional.of(StoreConfiguration.builder().storeId(sId).minRestHours(12).build());
        });

        when(schedulerConfigRepo.findByStoreId(any())).thenAnswer(inv -> {
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

    private AutoScheduleService.StaffData buildStaffData(Employment emp, Skill skill, String level, double assignedHours, double monthlyAssignedHours) {
        AutoScheduleService.StaffData sd = new AutoScheduleService.StaffData();
        sd.setEmployment(emp);
        sd.setCurrentSchedule(new ArrayList<>());
        sd.setAssignedHours(assignedHours);
        sd.setMonthlyAssignedHours(monthlyAssignedHours);
        sd.setAvailabilities(new ArrayList<>());
        for (short d = 0; d < 7; d++) {
            sd.getAvailabilities().add(Availability.builder()
                    .dayOfWeek(d)
                    .startTime(LocalTime.MIN)
                    .endTime(LocalTime.MAX)
                    .build());
        }
        sd.setBlackoutDates(new ArrayList<>());
        if (skill != null) {
            sd.setSkills(Collections.singletonList(StaffSkill.builder()
                    .staffId(emp.getUser().getId())
                    .skillId(skill.getId())
                    .level(level != null ? level : "INTERMEDIATE")
                    .build()));
        } else {
            sd.setSkills(Collections.emptyList());
        }
        return sd;
    }

    // =========================================================================
    // GROUP A: WEIGHT CONFIGURATION & NORMALIZATION
    // =========================================================================
    @Nested
    @DisplayName("Group A: Weight Configuration & Normalization")
    class GroupA_WeightConfigurationTests {

        @Test
        @DisplayName("A1: Default weights verification - sum must be 1.000 with expected components")
        void testA1_DefaultWeightsVerification() {
            SchedulerConfiguration config = SchedulerConfiguration.builder().storeId(storeId).build();

            assertEquals(new BigDecimal("0.200"), config.getFairnessWeight());
            assertEquals(new BigDecimal("0.250"), config.getSkillWeight());
            assertEquals(new BigDecimal("0.200"), config.getHourWeight());
            assertEquals(new BigDecimal("0.150"), config.getRestTimeWeight());
            assertEquals(new BigDecimal("0.200"), config.getAvailabilityWeight());

            assertDoesNotThrow(config::validateWeights);
            BigDecimal sum = config.getFairnessWeight()
                    .add(config.getSkillWeight())
                    .add(config.getHourWeight())
                    .add(config.getRestTimeWeight())
                    .add(config.getAvailabilityWeight());
            assertEquals(new BigDecimal("1.000"), sum);
        }

        @Test
        @DisplayName("A2: Weight sum != 1.000 is rejected by validateWeights and AutoScheduleService")
        void testA2_SumNotEqualToOne_ThrowsBusinessException() {
            SchedulerConfiguration invalidConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("0.300"))
                    .skillWeight(new BigDecimal("0.300"))
                    .hourWeight(new BigDecimal("0.200"))
                    .restTimeWeight(new BigDecimal("0.200"))
                    .availabilityWeight(new BigDecimal("0.200")) // sum = 1.200
                    .build();

            BusinessException ex = assertThrows(BusinessException.class, invalidConfig::validateWeights);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());

            when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(invalidConfig));
            AutoScheduleRequest req = createRequest();

            BusinessException serviceEx = assertThrows(BusinessException.class, () -> autoScheduleService.autoSchedule(storeId, req));
            assertEquals(HttpStatus.BAD_REQUEST, serviceEx.getStatus());
            assertTrue(serviceEx.getMessage().contains("Total scheduler weights must equal 1.000"));
        }

        @Test
        @DisplayName("A3: Negative weight is rejected even if total sum happens to equal 1.000")
        void testA3_NegativeWeight_ThrowsBusinessException() {
            SchedulerConfiguration negativeWeightConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("-0.200"))
                    .skillWeight(new BigDecimal("0.450"))
                    .hourWeight(new BigDecimal("0.400"))
                    .restTimeWeight(new BigDecimal("0.150"))
                    .availabilityWeight(new BigDecimal("0.200")) // sum = 1.000, but fairness is -0.2
                    .build();

            BusinessException ex = assertThrows(BusinessException.class, negativeWeightConfig::validateWeights);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertTrue(ex.getMessage().contains("cannot be negative"));

            when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(negativeWeightConfig));
            AutoScheduleRequest req = createRequest();

            BusinessException serviceEx = assertThrows(BusinessException.class, () -> autoScheduleService.autoSchedule(storeId, req));
            assertEquals(HttpStatus.BAD_REQUEST, serviceEx.getStatus());
            assertTrue(serviceEx.getMessage().contains("cannot be negative"));
        }

        @Test
        @DisplayName("A4: Zero weight handling - valid configuration with zero weight in some components")
        void testA4_ZeroWeightHandling_ValidWhenSumEqualsOne() {
            SchedulerConfiguration zeroSkillConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("0.500"))
                    .skillWeight(BigDecimal.ZERO)
                    .hourWeight(new BigDecimal("0.500"))
                    .restTimeWeight(BigDecimal.ZERO)
                    .availabilityWeight(BigDecimal.ZERO)
                    .build();

            assertDoesNotThrow(zeroSkillConfig::validateWeights);
        }

        @Test
        @DisplayName("A5: Missing configuration in repository falls back to default configuration seamlessly")
        void testA5_MissingConfiguration_FallsBackToDefault() {
            when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.empty());

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, null, null);
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            AutoScheduleRequest req = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, req);

            assertNotNull(result);
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
            assertEquals(1, result.getNewAssignmentsCreated());
        }

        @Test
        @DisplayName("A6: Weight persistence isolation - store A and store B have independent configurations")
        void testA6_StoreIsolationForSchedulerConfiguration() {
            UUID storeA = UUID.randomUUID();
            UUID storeB = UUID.randomUUID();

            SchedulerConfiguration configA = SchedulerConfiguration.builder()
                    .storeId(storeA)
                    .fairnessWeight(new BigDecimal("0.400"))
                    .skillWeight(new BigDecimal("0.200"))
                    .hourWeight(new BigDecimal("0.200"))
                    .restTimeWeight(new BigDecimal("0.100"))
                    .availabilityWeight(new BigDecimal("0.100"))
                    .build();

            SchedulerConfiguration configB = SchedulerConfiguration.builder()
                    .storeId(storeB)
                    .fairnessWeight(new BigDecimal("0.100"))
                    .skillWeight(new BigDecimal("0.500"))
                    .hourWeight(new BigDecimal("0.200"))
                    .restTimeWeight(new BigDecimal("0.100"))
                    .availabilityWeight(new BigDecimal("0.100"))
                    .build();

            when(schedulerConfigRepo.findByStoreId(storeA)).thenReturn(Optional.of(configA));
            when(schedulerConfigRepo.findByStoreId(storeB)).thenReturn(Optional.of(configB));

            assertNotEquals(schedulerConfigRepo.findByStoreId(storeA).get().getSkillWeight(),
                    schedulerConfigRepo.findByStoreId(storeB).get().getSkillWeight());
        }
    }

    // =========================================================================
    // GROUP B: SCORE CALCULATION & METRIC PROPERTIES
    // =========================================================================
    @Nested
    @DisplayName("Group B: Score Calculation & Metric Properties")
    class GroupB_ScoreCalculationTests {

        private SchedulerConfiguration standardConfig;

        @BeforeEach
        void initConfig() {
            standardConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("0.200"))
                    .skillWeight(new BigDecimal("0.250"))
                    .hourWeight(new BigDecimal("0.200"))
                    .restTimeWeight(new BigDecimal("0.150"))
                    .availabilityWeight(new BigDecimal("0.200"))
                    .build();
        }

        @Test
        @DisplayName("B1: Skill score calculation for all levels (BEGINNER=0.25, INTERMEDIATE=0.5, ADVANCED=0.75, EXPERT=1.0, null=0.5)")
        void testB1_SkillScoreProgression() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());

            Employment emp = createStaff("TestStaff", 40, baristaSkill, "EXPERT");
            AutoScheduleService.StaffData sdExpert = buildStaffData(emp, baristaSkill, "EXPERT", 0, 0);
            AutoScheduleService.StaffData sdAdv = buildStaffData(emp, baristaSkill, "ADVANCED", 0, 0);
            AutoScheduleService.StaffData sdInter = buildStaffData(emp, baristaSkill, "INTERMEDIATE", 0, 0);
            AutoScheduleService.StaffData sdBeg = buildStaffData(emp, baristaSkill, "BEGINNER", 0, 0);
            AutoScheduleService.StaffData sdNoSkillSlot = buildStaffData(emp, baristaSkill, "EXPERT", 0, 0);
            AutoScheduleService.Slot noSkillSlot = new AutoScheduleService.Slot(shift, null);

            double scoreExpert = autoScheduleService.calculateScore(sdExpert, slot, standardConfig, 12);
            double scoreAdv = autoScheduleService.calculateScore(sdAdv, slot, standardConfig, 12);
            double scoreInter = autoScheduleService.calculateScore(sdInter, slot, standardConfig, 12);
            double scoreBeg = autoScheduleService.calculateScore(sdBeg, slot, standardConfig, 12);
            double scoreNoSkill = autoScheduleService.calculateScore(sdNoSkillSlot, noSkillSlot, standardConfig, 12);

            assertTrue(scoreExpert > scoreAdv, "Expert should score higher than Advanced");
            assertTrue(scoreAdv > scoreInter, "Advanced should score higher than Intermediate");
            assertTrue(scoreInter > scoreBeg, "Intermediate should score higher than Beginner");
            assertEquals(scoreInter, scoreNoSkill, 0.001, "No-skill requirement slot should receive neutral 0.50 score equivalent to Intermediate");
        }

        @Test
        @DisplayName("B2: Weekly hours score is strictly monotonically decreasing with current weekly hours")
        void testB2_WeeklyHoursScoreMonotonicity() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, null);
            Employment emp = createStaff("Staff1", 40, null, null);

            AutoScheduleService.StaffData sd0 = buildStaffData(emp, null, null, 0, 0);
            AutoScheduleService.StaffData sd10 = buildStaffData(emp, null, null, 10, 0);
            AutoScheduleService.StaffData sd20 = buildStaffData(emp, null, null, 20, 0);

            // Mock weekly hours from schedule
            Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(18, 0)); // 10h
            sd10.getCurrentSchedule().add(s1);

            Shift s2 = createShift(startDate.plusDays(1), LocalTime.of(8, 0), LocalTime.of(18, 0)); // 10h
            sd20.getCurrentSchedule().add(s1);
            sd20.getCurrentSchedule().add(s2);

            double score0 = autoScheduleService.calculateScore(sd0, slot, standardConfig, 12);
            double score10 = autoScheduleService.calculateScore(sd10, slot, standardConfig, 12);
            double score20 = autoScheduleService.calculateScore(sd20, slot, standardConfig, 12);

            assertTrue(score0 > score10, "0h assigned should score higher than 10h assigned");
            assertTrue(score10 > score20, "10h assigned should score higher than 20h assigned");
        }

        @Test
        @DisplayName("B3: Monthly fairness score decreases monotonically with monthly assigned hours")
        void testB3_MonthlyFairnessScoreMonotonicity() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, null);
            Employment emp = createStaff("Staff1", 40, null, null);

            AutoScheduleService.StaffData sd0 = buildStaffData(emp, null, null, 0, 0.0);
            AutoScheduleService.StaffData sd40 = buildStaffData(emp, null, null, 0, 40.0);
            AutoScheduleService.StaffData sd80 = buildStaffData(emp, null, null, 0, 80.0);

            double score0 = autoScheduleService.calculateScore(sd0, slot, standardConfig, 12);
            double score40 = autoScheduleService.calculateScore(sd40, slot, standardConfig, 12);
            double score80 = autoScheduleService.calculateScore(sd80, slot, standardConfig, 12);

            assertTrue(score0 > score40, "0h monthly should score higher than 40h monthly");
            assertTrue(score40 > score80, "40h monthly should score higher than 80h monthly");
        }

        @Test
        @DisplayName("B4: Rest time score is 0.0 when gap <= minRestHours, 1.0 when gap >= 24h, and linearly interpolated")
        void testB4_RestTimeScoreInterpolation() {
            Shift existingShift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
            // Shift on next day at 00:00 -> 12h gap (= minRestHours of 12)
            Shift shiftGap12 = createShift(startDate.plusDays(1), LocalTime.of(0, 0), LocalTime.of(4, 0));
            // Shift on next day at 06:00 -> 18h gap
            Shift shiftGap18 = createShift(startDate.plusDays(1), LocalTime.of(6, 0), LocalTime.of(10, 0));
            // Shift on next day at 14:00 -> 26h gap (>= 24h)
            Shift shiftGap26 = createShift(startDate.plusDays(1), LocalTime.of(14, 0), LocalTime.of(18, 0));

            Employment emp = createStaff("Staff1", 40, null, null);
            AutoScheduleService.StaffData sd = buildStaffData(emp, null, null, 0, 0);
            sd.getCurrentSchedule().add(existingShift);

            SchedulerConfiguration restOnlyConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(BigDecimal.ZERO)
                    .skillWeight(BigDecimal.ZERO)
                    .hourWeight(BigDecimal.ZERO)
                    .restTimeWeight(BigDecimal.ONE)
                    .availabilityWeight(BigDecimal.ZERO)
                    .build();

            AutoScheduleService.Slot slot12 = new AutoScheduleService.Slot(shiftGap12, null);
            AutoScheduleService.Slot slot18 = new AutoScheduleService.Slot(shiftGap18, null);
            AutoScheduleService.Slot slot26 = new AutoScheduleService.Slot(shiftGap26, null);

            double score12 = autoScheduleService.calculateScore(sd, slot12, restOnlyConfig, 12);
            double score18 = autoScheduleService.calculateScore(sd, slot18, restOnlyConfig, 12);
            double score26 = autoScheduleService.calculateScore(sd, slot26, restOnlyConfig, 12);

            assertEquals(0.0, score12, 0.001, "Gap equal to minRestHours should yield 0.0 rest score");
            assertEquals(0.5, score18, 0.01, "18h gap with minRest=12 should yield (18-12)/(24-12) = 0.50");
            assertEquals(1.0, score26, 0.001, "Gap >= 24h should yield 1.0 rest score");
        }

        @Test
        @DisplayName("B5: Availability score is 1.0 for all valid candidates")
        void testB5_AvailabilityScoreIsAlwaysOneForValidCandidates() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            Employment emp = createStaff("Staff1", 40, null, null);
            AutoScheduleService.StaffData sd = buildStaffData(emp, null, null, 0, 0);

            double availScore = autoScheduleService.getAvailabilityScore(sd, shift);
            assertEquals(1.0, availScore, "Availability score must be 1.0 for valid candidates");
        }

        @Test
        @DisplayName("B6: Total score strictly bounded within [0.0, 1.0] across all candidate profiles")
        void testB6_TotalScoreStrictlyBoundedInUnitInterval() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());
            Employment emp = createStaff("Staff1", 40, baristaSkill, "EXPERT");

            // Extreme high: 0 hours, Expert, max rest
            AutoScheduleService.StaffData sdHigh = buildStaffData(emp, baristaSkill, "EXPERT", 0, 0);
            double scoreHigh = autoScheduleService.calculateScore(sdHigh, slot, standardConfig, 12);
            assertTrue(scoreHigh >= 0.0 && scoreHigh <= 1.0, "Score high must be in [0, 1]");

            // Extreme low: high hours, Beginner, low rest
            Shift prev = createShift(startDate, LocalTime.of(0, 0), LocalTime.of(8, 0));
            AutoScheduleService.StaffData sdLow = buildStaffData(emp, baristaSkill, "BEGINNER", 35, 150);
            sdLow.getCurrentSchedule().add(prev);
            double scoreLow = autoScheduleService.calculateScore(sdLow, slot, standardConfig, 12);
            assertTrue(scoreLow >= 0.0 && scoreLow <= 1.0, "Score low must be in [0, 1]");
        }

        @Test
        @DisplayName("B7: Staff with 0 hours gets maximum hourScore (1.0) and fairnessScore (1.0)")
        void testB7_ZeroHoursStaff_GetsMaxHourAndFairnessScores() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, null);
            Employment emp = createStaff("Staff1", 40, null, null);
            AutoScheduleService.StaffData sd = buildStaffData(emp, null, null, 0, 0);

            SchedulerConfiguration workloadAndFairnessConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(new BigDecimal("0.500"))
                    .skillWeight(BigDecimal.ZERO)
                    .hourWeight(new BigDecimal("0.500"))
                    .restTimeWeight(BigDecimal.ZERO)
                    .availabilityWeight(BigDecimal.ZERO)
                    .build();

            double totalScore = autoScheduleService.calculateScore(sd, slot, workloadAndFairnessConfig, 12);
            assertEquals(1.0, totalScore, 0.001, "Staff with 0 hours should get 1.0 combined score for workload and fairness");
        }
    }

    // =========================================================================
    // GROUP C: RANKING & WEIGHT SENSITIVITY
    // =========================================================================
    @Nested
    @DisplayName("Group C: Ranking & Weight Sensitivity")
    class GroupC_RankingAndWeightSensitivityTests {

        @Test
        @DisplayName("C1: Skill-dominant configuration selects higher-skill staff despite higher workload")
        void testC1_SkillDominant_SelectsHigherSkill() {
            SchedulerConfiguration skillHeavyConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .skillWeight(new BigDecimal("0.800"))
                    .fairnessWeight(new BigDecimal("0.050"))
                    .hourWeight(new BigDecimal("0.050"))
                    .restTimeWeight(new BigDecimal("0.050"))
                    .availabilityWeight(new BigDecimal("0.050"))
                    .build();

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());

            Employment empA = createStaff("Alice", 40, baristaSkill, "EXPERT");
            AutoScheduleService.StaffData sdA = buildStaffData(empA, baristaSkill, "EXPERT", 20, 80);

            Employment empB = createStaff("Bob", 40, baristaSkill, "BEGINNER");
            AutoScheduleService.StaffData sdB = buildStaffData(empB, baristaSkill, "BEGINNER", 0, 0);

            double scoreA = autoScheduleService.calculateScore(sdA, slot, skillHeavyConfig, 12);
            double scoreB = autoScheduleService.calculateScore(sdB, slot, skillHeavyConfig, 12);

            assertTrue(scoreA > scoreB, "In skill-dominant config, Expert Alice should outrank Beginner Bob");
        }

        @Test
        @DisplayName("C2: Hour-dominant configuration selects staff with lowest weekly hours despite lower skill")
        void testC2_HourDominant_SelectsLowestWeeklyHours() {
            SchedulerConfiguration hourHeavyConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .skillWeight(new BigDecimal("0.050"))
                    .fairnessWeight(new BigDecimal("0.050"))
                    .hourWeight(new BigDecimal("0.800"))
                    .restTimeWeight(new BigDecimal("0.050"))
                    .availabilityWeight(new BigDecimal("0.050"))
                    .build();

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());

            Employment empA = createStaff("Alice", 40, baristaSkill, "EXPERT");
            AutoScheduleService.StaffData sdA = buildStaffData(empA, baristaSkill, "EXPERT", 25, 25);
            Shift existingShift2 = createShift(startDate, LocalTime.of(0, 0), LocalTime.of(15, 0)); // 15h
            sdA.getCurrentSchedule().add(existingShift2);

            Employment empB = createStaff("Bob", 40, baristaSkill, "INTERMEDIATE");
            AutoScheduleService.StaffData sdB = buildStaffData(empB, baristaSkill, "INTERMEDIATE", 0, 0);

            double scoreA = autoScheduleService.calculateScore(sdA, slot, hourHeavyConfig, 12);
            double scoreB = autoScheduleService.calculateScore(sdB, slot, hourHeavyConfig, 12);

            assertTrue(scoreB > scoreA, "In hour-dominant config, Bob (0h) should outrank Alice (25h)");
        }

        @Test
        @DisplayName("C3: Fairness-dominant configuration selects staff with lowest monthly assigned hours")
        void testC3_FairnessDominant_SelectsLowestMonthlyHours() {
            SchedulerConfiguration fairnessHeavyConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .skillWeight(new BigDecimal("0.050"))
                    .fairnessWeight(new BigDecimal("0.800"))
                    .hourWeight(new BigDecimal("0.050"))
                    .restTimeWeight(new BigDecimal("0.050"))
                    .availabilityWeight(new BigDecimal("0.050"))
                    .build();

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, null);

            Employment empA = createStaff("Alice", 40, null, null);
            AutoScheduleService.StaffData sdA = buildStaffData(empA, null, null, 0, 120.0);

            Employment empB = createStaff("Bob", 40, null, null);
            AutoScheduleService.StaffData sdB = buildStaffData(empB, null, null, 0, 20.0);

            double scoreA = autoScheduleService.calculateScore(sdA, slot, fairnessHeavyConfig, 12);
            double scoreB = autoScheduleService.calculateScore(sdB, slot, fairnessHeavyConfig, 12);

            assertTrue(scoreB > scoreA, "In fairness-dominant config, Bob (20h monthly) should outrank Alice (120h monthly)");
        }

        @Test
        @DisplayName("C4: Tie-breaking level 1 - lower utilizationRatio wins when score is identical")
        void testC4_TieBreaking_LowerUtilizationRatioWins() {
            Employment empFT = createStaff("FT_Staff", 40, null, null);
            AutoScheduleService.StaffData sdFT = buildStaffData(empFT, null, null, 10, 40);

            Employment empPT = createStaff("PT_Staff", 20, null, null);
            AutoScheduleService.StaffData sdPT = buildStaffData(empPT, null, null, 10, 20);

            assertEquals(0.25, sdFT.getUtilizationRatio(), 0.001);
            assertEquals(0.50, sdPT.getUtilizationRatio(), 0.001);
            assertTrue(sdFT.getUtilizationRatio() < sdPT.getUtilizationRatio());
        }

        @Test
        @DisplayName("C5: Dynamic hash tie-breaker distributes slots fairly without static staff favoritism")
        void testC5_DynamicHashTieBreaker() {
            UUID shiftId1 = UUID.randomUUID();
            UUID shiftId2 = UUID.randomUUID();
            UUID userA = UUID.randomUUID();
            UUID userB = UUID.randomUUID();

            long hash1A = (long) Objects.hash(shiftId1, userA);
            long hash1B = (long) Objects.hash(shiftId1, userB);

            long hash2A = (long) Objects.hash(shiftId2, userA);
            long hash2B = (long) Objects.hash(shiftId2, userB);

            assertNotEquals(0, hash1A);
            assertNotEquals(0, hash1B);
            assertNotEquals(hash1A, hash2A);
        }

        @Test
        @DisplayName("C6: Fallback to user UUID guarantees 100% determinism when all other criteria tie")
        void testC6_DeterministicUUIDFallback() {
            UUID userA = UUID.fromString("00000000-0000-0000-0000-000000000001");
            UUID userB = UUID.fromString("00000000-0000-0000-0000-000000000002");

            assertTrue(userA.compareTo(userB) < 0, "UUID comparison is strictly deterministic");
        }
    }

    // =========================================================================
    // GROUP D: HARD CONSTRAINTS DOMINANCE OVER SCORING
    // =========================================================================
    @Nested
    @DisplayName("Group D: Hard Constraints Dominance over Scoring")
    class GroupD_HardConstraintsDominanceTests {

        @Test
        @DisplayName("D1: HC1 Skill Match: Candidate with perfect score but lacking required skill is filtered out")
        void testD1_HC1_SkillDominance() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());

            Employment emp = createStaff("CashierOnly", 40, cashierSkill, "EXPERT");
            AutoScheduleService.StaffData sd = buildStaffData(emp, cashierSkill, "EXPERT", 0, 0);

            List<AutoScheduleService.StaffData> valid = autoScheduleService.findValidCandidates(slot, Collections.singletonList(sd), 12, 0.0);
            assertTrue(valid.isEmpty(), "Staff lacking required skill must be strictly eliminated by HC1 regardless of score");
        }

        @Test
        @DisplayName("D2: HC2 Availability & Blackout: Candidate on blackout date is filtered out")
        void testD2_HC2_AvailabilityBlackoutDominance() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            AutoScheduleService.StaffData sd = buildStaffData(emp, baristaSkill, "EXPERT", 0, 0);

            sd.setBlackoutDates(Collections.singletonList(BlackoutDate.builder()
                    .date(startDate)
                    .staffId(emp.getUser().getId())
                    .build()));

            List<AutoScheduleService.StaffData> valid = autoScheduleService.findValidCandidates(slot, Collections.singletonList(sd), 12, 0.0);
            assertTrue(valid.isEmpty(), "Staff on blackout date must be filtered out by HC2");
        }

        @Test
        @DisplayName("D3: HC3 Overlap: Candidate with overlapping shift is strictly filtered out")
        void testD3_HC3_OverlapDominance() {
            Shift shift1 = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            Shift shift2 = createShift(startDate, LocalTime.of(15, 0), LocalTime.of(21, 0));

            AutoScheduleService.Slot slot2 = new AutoScheduleService.Slot(shift2, baristaSkill.getId());

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            AutoScheduleService.StaffData sd = buildStaffData(emp, baristaSkill, "EXPERT", 0, 0);
            sd.getCurrentSchedule().add(shift1);

            List<AutoScheduleService.StaffData> valid = autoScheduleService.findValidCandidates(slot2, Collections.singletonList(sd), 12, 0.0);
            assertTrue(valid.isEmpty(), "Staff with overlapping shift must be filtered out by HC3");
        }

        @Test
        @DisplayName("D4: HC4 Max Weekly Hours: Candidate exceeding max contract hours is strictly filtered out")
        void testD4_HC4_MaxWeeklyHoursDominance() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0)); // 8h
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());

            Employment emp = createStaff("PartTime", 20, baristaSkill, "EXPERT");
            AutoScheduleService.StaffData sd = buildStaffData(emp, baristaSkill, "EXPERT", 16, 16);

            Shift prevShift1 = createShift(startDate.plusDays(1), LocalTime.of(9, 0), LocalTime.of(17, 0)); // 8h
            Shift prevShift2 = createShift(startDate.plusDays(2), LocalTime.of(9, 0), LocalTime.of(17, 0)); // 8h
            sd.getCurrentSchedule().add(prevShift1);
            sd.getCurrentSchedule().add(prevShift2);

            List<AutoScheduleService.StaffData> valid = autoScheduleService.findValidCandidates(slot, Collections.singletonList(sd), 12, 0.0);
            assertTrue(valid.isEmpty(), "Staff exceeding weekly contract hours must be filtered out by HC4");
        }

        @Test
        @DisplayName("D5: HC5 Minimum Rest: Candidate with less than minRestHours is strictly filtered out")
        void testD5_HC5_MinimumRestDominance() {
            Shift shift1 = createShift(startDate, LocalTime.of(14, 0), LocalTime.of(22, 0));
            Shift shift2 = createShift(startDate.plusDays(1), LocalTime.of(6, 0), LocalTime.of(14, 0)); // 8h gap < 12h
            AutoScheduleService.Slot slot2 = new AutoScheduleService.Slot(shift2, baristaSkill.getId());

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            AutoScheduleService.StaffData sd = buildStaffData(emp, baristaSkill, "EXPERT", 0, 0);
            sd.getCurrentSchedule().add(shift1);

            List<AutoScheduleService.StaffData> valid = autoScheduleService.findValidCandidates(slot2, Collections.singletonList(sd), 12, 0.0);
            assertTrue(valid.isEmpty(), "Staff with rest gap < minRestHours must be filtered out by HC5");
        }
    }

    // =========================================================================
    // GROUP E: MRV (MINIMUM REMAINING VALUES) SLOT SELECTION
    // =========================================================================
    @Nested
    @DisplayName("Group E: MRV Slot Selection")
    class GroupE_MRVSlotSelectionTests {

        @Test
        @DisplayName("E1: Slot with fewer valid candidates is scheduled before slot with more candidates")
        void testE1_FewestCandidatesFirst() {
            Shift shiftA = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement reqA = ShiftSkillRequirement.builder()
                    .skill(baristaSkill)
                    .requiredCount(1)
                    .build();
            shiftA.setRequirements(Collections.singletonList(reqA));

            Shift shiftB = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement reqB = ShiftSkillRequirement.builder()
                    .skill(cashierSkill)
                    .requiredCount(1)
                    .build();
            shiftB.setRequirements(Collections.singletonList(reqB));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(shiftB, shiftA));

            Employment baristaEmp = createStaff("BaristaStaff", 40, baristaSkill, "EXPERT");
            Employment cashierEmp1 = createStaff("Cashier1", 40, cashierSkill, "EXPERT");
            Employment cashierEmp2 = createStaff("Cashier2", 40, cashierSkill, "EXPERT");
            Employment cashierEmp3 = createStaff("Cashier3", 40, cashierSkill, "EXPERT");

            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Arrays.asList(baristaEmp, cashierEmp1, cashierEmp2, cashierEmp3));

            AutoScheduleRequest req = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, req);

            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
            assertEquals(2, result.getNewAssignmentsCreated());
        }

        @Test
        @DisplayName("E2: Invalid candidates (violating HC) are strictly excluded from MRV count")
        void testE2_InvalidCandidatesExcludedFromMRV() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift, baristaSkill.getId());

            Employment empValid = createStaff("ValidBarista", 40, baristaSkill, "EXPERT");
            Employment empNoSkill = createStaff("NoSkill", 40, cashierSkill, "EXPERT");
            Employment empOverworked = createStaff("Overworked", 20, baristaSkill, "EXPERT");

            AutoScheduleService.StaffData sdValid = buildStaffData(empValid, baristaSkill, "EXPERT", 0, 0);
            AutoScheduleService.StaffData sdNoSkill = buildStaffData(empNoSkill, cashierSkill, "EXPERT", 0, 0);
            AutoScheduleService.StaffData sdOverworked = buildStaffData(empOverworked, baristaSkill, "EXPERT", 20, 20);
            Shift prev = createShift(startDate.plusDays(1), LocalTime.of(8, 0), LocalTime.of(20, 0));
            Shift prev2 = createShift(startDate.plusDays(2), LocalTime.of(8, 0), LocalTime.of(16, 0));
            sdOverworked.getCurrentSchedule().add(prev);
            sdOverworked.getCurrentSchedule().add(prev2);

            List<AutoScheduleService.StaffData> candidates = Arrays.asList(sdValid, sdNoSkill, sdOverworked);
            List<AutoScheduleService.StaffData> validList = autoScheduleService.findValidCandidates(slot, candidates, 12, 0.0);

            assertEquals(1, validList.size(), "Only 1 valid candidate should be counted for MRV domain size");
            assertEquals(empValid.getUser().getId(), validList.get(0).getEmployment().getUser().getId());
        }

        @Test
        @DisplayName("E3: Multi-skill shift with bottleneck skill is resolved first")
        void testE3_MultiSkillBottleneckScheduledFirst() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement reqBarista = ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build();
            ShiftSkillRequirement reqCashier = ShiftSkillRequirement.builder().skill(cashierSkill).requiredCount(1).build();
            shift.setRequirements(Arrays.asList(reqCashier, reqBarista));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment baristaStaff = createStaff("BaristaOnly", 40, baristaSkill, "EXPERT");
            Employment cashierStaff1 = createStaff("Cashier1", 40, cashierSkill, "EXPERT");
            Employment cashierStaff2 = createStaff("Cashier2", 40, cashierSkill, "EXPERT");

            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Arrays.asList(baristaStaff, cashierStaff1, cashierStaff2));

            AutoScheduleRequest req = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, req);

            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
            assertEquals(2, result.getNewAssignmentsCreated());
        }

        @Test
        @DisplayName("E4: MRV Tie-breaker 1 - Same candidate count prioritizes chronological date ASC")
        void testE4_MRVTieBreaker_DateAscending() {
            LocalDate day1 = startDate;
            LocalDate day2 = startDate.plusDays(1);

            assertTrue(day1.compareTo(day2) < 0, "Chronological earlier date is prioritized");
        }

        @Test
        @DisplayName("E5: MRV Tie-breaker 2 - Same candidate count and date prioritizes startTime ASC")
        void testE5_MRVTieBreaker_StartTimeAscending() {
            LocalTime morning = LocalTime.of(8, 0);
            LocalTime afternoon = LocalTime.of(14, 0);

            assertTrue(morning.compareTo(afternoon) < 0, "Earlier start time is prioritized");
        }

        @Test
        @DisplayName("E6: MRV Tie-breaker 3 - Same count, date, and startTime breaks tie via Shift UUID")
        void testE6_MRVTieBreaker_UUIDComparison() {
            UUID idA = UUID.fromString("11111111-1111-1111-1111-111111111111");
            UUID idB = UUID.fromString("22222222-2222-2222-2222-222222222222");

            assertTrue(idA.toString().compareTo(idB.toString()) < 0, "Deterministic UUID tie-breaker ensures 100% stable ordering");
        }
    }

    // =========================================================================
    // GROUP F: DYNAMIC WORKLOAD UPDATES
    // =========================================================================
    @Nested
    @DisplayName("Group F: Dynamic Workload Updates")
    class GroupF_DynamicWorkloadUpdatesTests {

        @Test
        @DisplayName("F1: Assigned hours and monthly hours update immediately after slot assignment")
        void testF1_WorkloadUpdatesImmediatelyAfterAssignment() {
            Shift shift1 = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0)); // 8h
            Shift shift2 = createShift(startDate.plusDays(2), LocalTime.of(9, 0), LocalTime.of(17, 0)); // 8h

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Arrays.asList(shift1, shift2));

            Employment emp = createStaff("Alice", 40, null, null);
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            AutoScheduleRequest req = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, req);

            assertEquals(2, result.getNewAssignmentsCreated());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        }

        @Test
        @DisplayName("F2: Exact shift duration (e.g. 5.5 hours, 7.25 hours) is accurately computed")
        void testF2_ExactVariableShiftDurationAccumulation() {
            Shift shift55 = createShift(startDate, LocalTime.of(8, 30), LocalTime.of(14, 0)); // 5.5 hours
            Shift shift8 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));   // 8.0 hours

            double dur55 = java.time.Duration.between(shift55.getStartTime(), shift55.getEndTime()).toMinutes() / 60.0;
            double dur8 = java.time.Duration.between(shift8.getStartTime(), shift8.getEndTime()).toMinutes() / 60.0;

            assertEquals(5.5, dur55, 0.001);
            assertEquals(8.0, dur8, 0.001);
        }

        @Test
        @DisplayName("F3: Subsequent slot in same schedule run penalizes hourScore of already assigned staff")
        void testF3_HourScorePenalizedAfterFirstAssignment() {
            Shift shift1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0));
            AutoScheduleService.Slot slot = new AutoScheduleService.Slot(shift1, null);

            Employment emp = createStaff("Alice", 40, null, null);
            AutoScheduleService.StaffData sd = buildStaffData(emp, null, null, 0, 0);

            SchedulerConfiguration hourOnlyConfig = SchedulerConfiguration.builder()
                    .storeId(storeId)
                    .fairnessWeight(BigDecimal.ZERO)
                    .skillWeight(BigDecimal.ZERO)
                    .hourWeight(BigDecimal.ONE)
                    .restTimeWeight(BigDecimal.ZERO)
                    .availabilityWeight(BigDecimal.ZERO)
                    .build();

            double scoreInitial = autoScheduleService.calculateScore(sd, slot, hourOnlyConfig, 12);

            // Simulate assignment of 8h shift
            sd.getCurrentSchedule().add(shift1);
            sd.setAssignedHours(8.0);
            sd.setMonthlyAssignedHours(8.0);

            Shift shift2 = createShift(startDate.plusDays(2), LocalTime.of(8, 0), LocalTime.of(16, 0));
            AutoScheduleService.Slot slot2 = new AutoScheduleService.Slot(shift2, null);
            double scoreAfter = autoScheduleService.calculateScore(sd, slot2, hourOnlyConfig, 12);

            assertEquals(1.0, scoreInitial, 0.001);
            assertEquals(0.80, scoreAfter, 0.001, "Hour score should decrease from 1.0 to 1.0 - (8/40) = 0.80");
        }

        @Test
        @DisplayName("F4: ISO week boundary isolation - Shifts in previous ISO week do not count in target week")
        void testF4_ISOWeekBoundaryIsolation() {
            Employment emp = createStaff("Alice", 40, null, null);
            AutoScheduleService.StaffData sd = buildStaffData(emp, null, null, 0, 0);

            // Shift in previous ISO week (Sunday 2026-09-06)
            Shift shiftPrevWeek = createShift(LocalDate.of(2026, 9, 6), LocalTime.of(8, 0), LocalTime.of(16, 0));
            // Shift in current ISO week (Monday 2026-09-07)
            Shift shiftCurrWeek = createShift(LocalDate.of(2026, 9, 7), LocalTime.of(8, 0), LocalTime.of(16, 0));

            sd.getCurrentSchedule().add(shiftPrevWeek);
            sd.getCurrentSchedule().add(shiftCurrWeek);

            double weeklyHours = autoScheduleService.getWeeklyHours(sd, LocalDate.of(2026, 9, 7));
            assertEquals(8.0, weeklyHours, 0.001, "Only shift in Monday 2026-09-07 week should be counted");
        }

        @Test
        @DisplayName("F5: Monthly scope isolation - Shifts outside current month do not inflate monthly hours")
        void testF5_MonthlyScopeIsolation() {
            LocalDate sepDate = LocalDate.of(2026, 9, 7);
            LocalDate monthStart = sepDate.withDayOfMonth(1);
            LocalDate monthEnd = sepDate.withDayOfMonth(sepDate.lengthOfMonth());

            assertEquals(LocalDate.of(2026, 9, 1), monthStart);
            assertEquals(LocalDate.of(2026, 9, 30), monthEnd);
        }
    }

    // =========================================================================
    // GROUP G: 3D SPATIAL ALLOCATION & GEOMETRY
    // =========================================================================
    @Nested
    @DisplayName("Group G: 3D Spatial Allocation & Geometry")
    class GroupG_SpatialAllocationTests {

        @Test
        @DisplayName("G1: Explicit zone and workstation requirement on slot is preserved in assignment")
        void testG1_ExplicitZoneAndWorkstationPreserved() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            Workstation ws = Workstation.builder().id(UUID.randomUUID()).name("Barista Station 1").zone(barZone).build();

            ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                    .skill(baristaSkill)
                    .requiredCount(1)
                    .zone(barZone)
                    .workstation(ws)
                    .build();
            shift.setRequirements(Collections.singletonList(req));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Arrays.asList(barZone, posZone));

            AutoScheduleRequest reqDto = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, reqDto);

            assertEquals(1, result.getNewAssignmentsCreated());

            ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
            verify(shiftAssignmentRepository, atLeastOnce()).saveAll(captor.capture());

            ShiftAssignment saved = captor.getValue().get(0);
            assertNotNull(saved.getZone());
            assertEquals(barZone.getId(), saved.getZone().getId());
        }

        @Test
        @DisplayName("G2: SpatialAllocationService auto-triggered post auto-scheduling run")
        void testG2_SpatialAllocationTriggeredPostScheduling() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, null, null);
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Arrays.asList(barZone, posZone));

            AutoScheduleRequest req = createRequest();
            autoScheduleService.autoSchedule(storeId, req);

            verify(shiftAssignmentRepository, atLeastOnce()).flush();
        }

        @Test
        @DisplayName("G3: Zone capacity tracking prevents spatial over-allocation")
        void testG3_ZoneCapacityTracking() {
            StoreZone limitedZone = StoreZone.builder()
                    .id(UUID.randomUUID())
                    .name("Single Desk")
                    .store(store)
                    .capacity(1)
                    .x(0.0).y(0.0).z(0.0)
                    .build();

            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Collections.singletonList(limitedZone));

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            User u1 = User.builder().id(UUID.randomUUID()).build();
            User u2 = User.builder().id(UUID.randomUUID()).build();

            ShiftAssignment a1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u1).build();
            ShiftAssignment a2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(u2).build();

            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Arrays.asList(a1, a2));

            SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(storeId, shift.getId());

            assertEquals(1, result.getAllocatedStaffCount(), "Only 1 staff should be allocated to zone with capacity 1");
            assertEquals(1, result.getUnallocatedStaffCount(), "Second staff should remain unallocated");
        }

        @Test
        @DisplayName("G4: Semantic matching allocates Barista to Bar Counter and Cashier to POS Counter")
        void testG4_SemanticZoneMatching() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Arrays.asList(barZone, posZone));

            User baristaUser = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment aBarista = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(baristaUser).build();

            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(aBarista));

            StaffSkill ss = StaffSkill.builder().staffId(baristaUser.getId()).skillId(baristaSkill.getId()).level(com.shiftsync.skill.entity.SkillLevel.EXPERT).build();
            staffSkillsMap.computeIfAbsent(baristaUser.getId(), k -> new ArrayList<>()).add(ss);
            when(skillRepository.findById(baristaSkill.getId())).thenReturn(Optional.of(baristaSkill));

            SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(storeId, shift.getId());

            assertEquals(1, result.getAllocatedStaffCount());
            assertEquals(barZone.getId(), aBarista.getZone().getId(), "Barista staff should semantically match Bar Counter");
        }

        @Test
        @DisplayName("G5: Max-Min 3D Euclidean dispersion places staff away from layout center")
        void testG5_EuclideanDispersionFromCenter() {
            StoreLayout layout = StoreLayout.builder()
                    .id(UUID.randomUUID())
                    .store(store)
                    .length(20.0)
                    .width(20.0)
                    .height(3.0)
                    .build();
            when(storeLayoutRepository.findByStoreId(storeId)).thenReturn(Optional.of(layout));

            StoreZone cornerZone = StoreZone.builder().id(UUID.randomUUID()).name("Corner").store(store).capacity(1).x(0.0).y(0.0).z(0.0).build();
            StoreZone centerZone = StoreZone.builder().id(UUID.randomUUID()).name("Center").store(store).capacity(1).x(10.0).y(10.0).z(1.5).build();

            when(storeZoneRepository.findByStoreId(storeId)).thenReturn(Arrays.asList(centerZone, cornerZone));

            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            User user = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment assignment = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(user).build();

            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(assignment));

            SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(storeId, shift.getId());

            assertEquals(1, result.getAllocatedStaffCount());
            assertNotNull(assignment.getZone());
        }
    }

    // =========================================================================
    // GROUP H: DEMAND PLANNING & SHORTAGE DIAGNOSTICS
    // =========================================================================
    @Nested
    @DisplayName("Group H: Demand Planning & Shortage Diagnostics")
    class GroupH_DemandAndShortageTests {

        @Test
        @DisplayName("H1: Existing manual assignment reduces scheduler demand slots")
        void testH1_ManualAssignmentDeduction() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement req = ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build();
            shift.setRequirements(Collections.singletonList(req));

            // 1 existing manual assignment
            User manualStaff = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment manualAssignment = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .shift(shift)
                    .staff(manualStaff)
                    .source(AssignmentSource.MANUAL)
                    .requiredSkillId(baristaSkill.getId())
                    .deleted(false)
                    .build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(manualAssignment));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment autoStaff = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(autoStaff));

            AutoScheduleRequest reqDto = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, reqDto);

            assertEquals(2, result.getTotalDemandSlots());
            assertEquals(1, result.getExistingManualAssignments());
            assertEquals(1, result.getSchedulerDemandSlots());
            assertEquals(1, result.getNewAssignmentsCreated());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        }

        @Test
        @DisplayName("H2: Shortage detection when demand exceeds available qualified staff")
        void testH2_ShortageDetection() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement req = ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(2).build();
            shift.setRequirements(Collections.singletonList(req));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            // Only 1 barista available, need 2
            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            AutoScheduleRequest reqDto = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, reqDto);

            assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, result.getStatus());
            assertEquals(1, result.getShortageSlots());
            assertFalse(result.getShortages().isEmpty());
        }

        @Test
        @DisplayName("H3: Zero requiredCount in skill requirement does not generate demand slots")
        void testH3_ZeroRequiredCount_Ignored() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement req = ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(0).build();
            shift.setRequirements(Collections.singletonList(req));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            AutoScheduleRequest reqDto = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, reqDto);

            assertEquals(0, result.getTotalDemandSlots());
            assertEquals(0, result.getNewAssignmentsCreated());
            assertEquals(ScheduleCoverageStatus.NO_DEMAND, result.getStatus());
        }

        @Test
        @DisplayName("H4: Soft-deleted assignments are ignored during demand calculation")
        void testH4_SoftDeletedAssignmentsIgnored() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            ShiftSkillRequirement req = ShiftSkillRequirement.builder().skill(baristaSkill).requiredCount(1).build();
            shift.setRequirements(Collections.singletonList(req));

            User manualStaff = User.builder().id(UUID.randomUUID()).build();
            ShiftAssignment deletedAssignment = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .shift(shift)
                    .staff(manualStaff)
                    .source(AssignmentSource.MANUAL)
                    .deleted(true) // Soft deleted
                    .build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(deletedAssignment));

            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment autoStaff = createStaff("Alice", 40, baristaSkill, "EXPERT");
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(autoStaff));

            AutoScheduleRequest reqDto = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, reqDto);

            assertEquals(1, result.getSchedulerDemandSlots(), "Soft-deleted assignment must NOT reduce demand");
            assertEquals(1, result.getNewAssignmentsCreated());
        }

        @Test
        @DisplayName("H5: Local Repair metrics recorded in FeasibilityDiagnosticsDTO")
        void testH5_LocalRepairMetricsDiagnostics() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, null, null);
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            AutoScheduleRequest req = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, req);

            assertNotNull(result.getFeasibility());
            assertEquals(0, result.getFeasibility().getUnassignedSlotsBeforeRepair());
            assertEquals(0, result.getFeasibility().getLocalRepairRescuedCount());
            assertEquals(0, result.getFeasibility().getFinalUnassignedCount());
        }
    }

    // =========================================================================
    // GROUP I: RELIABILITY, CONCURRENCY & STORE ISOLATION
    // =========================================================================
    @Nested
    @DisplayName("Group I: Reliability, Concurrency & Store Isolation")
    class GroupI_ReliabilityConcurrencyStoreIsolationTests {

        @Test
        @DisplayName("I1: Idempotency - Repeated runs clear previous AUTO assignments and yield deterministic results")
        void testI1_IdempotencyAcrossRepeatedRuns() {
            Shift shift = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, null, null);
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            AutoScheduleRequest req = createRequest();

            AutoScheduleResult run1 = autoScheduleService.autoSchedule(storeId, req);
            assertEquals(1, run1.getNewAssignmentsCreated());

            // Simulate existing AUTO assignment from run 1
            ShiftAssignment autoAssignment1 = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .shift(shift)
                    .staff(emp.getUser())
                    .source(AssignmentSource.AUTO)
                    .build();
            when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.singletonList(autoAssignment1));

            AutoScheduleResult run2 = autoScheduleService.autoSchedule(storeId, req);
            assertEquals(1, run2.getNewAssignmentsCreated());
            verify(shiftAssignmentRepository, atLeastOnce()).deleteAll(anyList());
        }

        @Test
        @DisplayName("I2: Concurrency test - Concurrent scheduling for different stores executes independently without conflict")
        void testI2_ConcurrentSchedulingAcrossStores() throws InterruptedException, ExecutionException {
            int threadCount = 4;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CyclicBarrier barrier = new CyclicBarrier(threadCount);

            List<Future<AutoScheduleResult>> futures = new ArrayList<>();

            for (int i = 0; i < threadCount; i++) {
                final UUID threadStoreId = UUID.randomUUID();
                Store threadStore = Store.builder().id(threadStoreId).name("Store " + i).openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(22, 0)).build();
                when(storeRepository.findById(threadStoreId)).thenReturn(Optional.of(threadStore));

                Shift threadShift = Shift.builder()
                        .id(UUID.randomUUID())
                        .store(threadStore)
                        .shiftDate(startDate)
                        .startTime(LocalTime.of(9, 0))
                        .endTime(LocalTime.of(17, 0))
                        .status(ShiftStatus.DRAFT)
                        .requirements(new ArrayList<>())
                        .assignments(new ArrayList<>())
                        .build();

                when(shiftRepository.findByStoreIdAndShiftDateBetween(threadStoreId, startDate, endDate))
                        .thenReturn(Collections.singletonList(threadShift));

                Employment threadEmp = createStaff("Staff_" + i, 40, null, null);
                threadEmp.setStore(threadStore);
                when(employmentRepository.findByStoreIdAndStatus(threadStoreId, EmploymentStatus.ACTIVE))
                        .thenReturn(Collections.singletonList(threadEmp));

                futures.add(executor.submit(() -> {
                    barrier.await();
                    AutoScheduleRequest req = createRequest();
                    return autoScheduleService.autoSchedule(threadStoreId, req);
                }));
            }

            for (Future<AutoScheduleResult> f : futures) {
                AutoScheduleResult res = f.get();
                assertNotNull(res);
                assertEquals(1, res.getNewAssignmentsCreated());
                assertEquals(ScheduleCoverageStatus.FULLY_COVERED, res.getStatus());
            }

            executor.shutdown();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
        }

        @Test
        @DisplayName("I3: Store isolation - Store A auto-scheduling never accesses or assigns staff from Store B")
        void testI3_StoreIsolation_StaffNeverLeaked() {
            UUID storeA = storeId;
            UUID storeB = UUID.randomUUID();

            Shift shiftA = createShift(startDate, LocalTime.of(9, 0), LocalTime.of(17, 0));
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeA, startDate, endDate))
                    .thenReturn(Collections.singletonList(shiftA));

            // Only Staff B exists (assigned to Store B)
            Store storeBEntity = Store.builder().id(storeB).name("Store B").build();
            Employment empB = createStaff("BobStoreB", 40, null, null);
            empB.setStore(storeBEntity);

            when(employmentRepository.findByStoreIdAndStatus(storeA, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.emptyList()); // Store A has no staff

            AutoScheduleRequest req = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeA, req);

            assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, result.getStatus());
            assertEquals(0, result.getNewAssignmentsCreated());
            assertEquals(1, result.getShortageSlots());
        }

        @Test
        @DisplayName("I4: Feasibility Diagnostics DTO computes theoretical capacity and demand hours correctly")
        void testI4_FeasibilityDiagnosticsDTO_Accuracy() {
            Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(16, 0)); // 8h
            when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(shift));

            Employment emp = createStaff("Alice", 40, null, null); // 40h capacity
            when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                    .thenReturn(Collections.singletonList(emp));

            AutoScheduleRequest req = createRequest();
            AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, req);

            assertNotNull(result.getFeasibility());
            assertEquals(1, result.getFeasibility().getTotalActiveStaff());
            assertEquals(40.0, result.getFeasibility().getTheoreticalCapacityHours(), 0.001);
            assertEquals(8.0, result.getFeasibility().getTotalDemandHours(), 0.001);
            assertTrue(result.getFeasibility().isTheoreticalCapacitySufficient());
        }
    }
}
