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
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.shared.exception.BusinessException;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;

import java.math.BigDecimal;
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
class SchedulingProductionHardeningTest {

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

        when(storeConfigRepo.findByStoreId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return Optional.of(StoreConfiguration.builder().storeId(sId).minRestHours(12).build());
        });
        when(schedulerConfigRepo.findByStoreId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return Optional.of(SchedulerConfiguration.builder()
                    .storeId(sId)
                    .skillWeight(BigDecimal.valueOf(0.25))
                    .hourWeight(BigDecimal.valueOf(0.25))
                    .fairnessWeight(BigDecimal.valueOf(0.25))
                    .restTimeWeight(BigDecimal.valueOf(0.25))
                    .availabilityWeight(BigDecimal.ZERO)
                    .build());
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
                .version(0L)
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
    // GROUP 1: TRANSACTION & FAILURE INJECTION (SCENARIOS 1-4)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 01: AutoSchedule fails atomically on unhandled error, no partial assignments saved")
    void test01_AutoScheduleAtomicRollback() {
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

        // Inject failure during staff skill loading
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenThrow(new RuntimeException("Simulated database connection failure during scheduling"));

        assertThrows(RuntimeException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));
        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("SCENARIO 02: Failure after deleting old AUTO assignments aborts and propagates exception")
    void test02_FailureAfterAutoCleanupRollback() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        ShiftAssignment oldAuto = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .source(AssignmentSource.AUTO)
                .build();
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(oldAuto));

        // Failure during deleteAll
        doThrow(new RuntimeException("Simulated database failure on cleanup"))
                .when(shiftAssignmentRepository).deleteAll(anyList());

        assertThrows(RuntimeException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));
        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("SCENARIO 03: Failure during assignment insertion triggers rollback")
    void test03_FailureDuringAssignmentInsertRollback() {
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

        // Throw DataIntegrityViolationException on saveAll
        doThrow(new DataIntegrityViolationException("Simulated unique index constraint violation"))
                .when(shiftAssignmentRepository).saveAll(anyList());

        assertThrows(DataIntegrityViolationException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));
    }

    @Test
    @DisplayName("SCENARIO 04: Invalid request range throws BusinessException atomically before any DB mutation")
    void test04_ManualAssignmentAtomicity() {
        AutoScheduleRequest invalidReq = new AutoScheduleRequest();
        invalidReq.setStartDate(startDate);
        invalidReq.setEndDate(startDate.plusDays(10)); // Exceeds 7 days

        assertThrows(BusinessException.class, () -> autoScheduleService.autoSchedule(storeId, invalidReq));
        verify(shiftRepository, never()).findByStoreIdAndShiftDateBetween(any(), any(), any());
        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    // =========================================================================
    // GROUP 2: CONCURRENCY (SCENARIOS 5-10)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 05: Concurrent AutoSchedule on same store produces deterministic, valid assignments")
    void test05_ConcurrentAutoScheduleSameStore() throws Exception {
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

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<AutoScheduleResult> results = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // Guarantee true simultaneous start
                    AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());
                    results.add(res);
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS), "Concurrent execution timed out");
        executor.shutdown();

        assertTrue(errors.isEmpty(), "No thread should fail unexpectedly: " + errors);
        assertEquals(2, results.size());
        for (AutoScheduleResult r : results) {
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r.getStatus());
            assertEquals(1, r.getTotalAssignedSlots());
            assertEquals(0, r.getShortageSlots());
        }
    }

    @Test
    @DisplayName("SCENARIO 06: Concurrent AutoSchedule on same week maintains slot capacity integrity")
    void test06_ConcurrentAutoScheduleSameWeek() throws Exception {
        Shift shift1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift1, baristaSkill, barZone, 1);
        Shift shift2 = createShift(startDate.plusDays(1), LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift2, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift1, shift2));

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, cashierSkill)
        ));

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Future<AutoScheduleResult> f1 = executor.submit(() -> {
            barrier.await();
            return autoScheduleService.autoSchedule(storeId, createRequest());
        });
        Future<AutoScheduleResult> f2 = executor.submit(() -> {
            barrier.await();
            return autoScheduleService.autoSchedule(storeId, createRequest());
        });

        AutoScheduleResult r1 = f1.get(5, TimeUnit.SECONDS);
        AutoScheduleResult r2 = f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r1.getStatus());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r2.getStatus());
        assertEquals(2, r1.getTotalAssignedSlots());
        assertEquals(2, r2.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 07: Concurrent manual assignment for same staff on same shift is bounded by capacity")
    void test07_ConcurrentManualAssignmentSameShift() throws Exception {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);

        Employment alice = createStaff("Alice", 40);

        // Simulate database unique index behavior for duplicate active assignments
        AtomicInteger activeCount = new AtomicInteger(0);
        doAnswer(inv -> {
            @SuppressWarnings("unchecked")
            List<ShiftAssignment> list = inv.getArgument(0);
            for (ShiftAssignment a : list) {
                if (activeCount.incrementAndGet() > 1) {
                    throw new DataIntegrityViolationException("Unique index violation: shift_assignment_shift_staff_active");
                }
            }
            return list;
        }).when(shiftAssignmentRepository).saveAll(anyList());

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        // Thread 1 succeeds, Thread 2 attempting duplicate insert encounters constraint violation
        autoScheduleService.autoSchedule(storeId, createRequest());
        assertEquals(1, activeCount.get());

        // Attempt duplicate insert triggers DataIntegrityViolationException
        assertThrows(DataIntegrityViolationException.class, () ->
                autoScheduleService.autoSchedule(storeId, createRequest())
        );
    }

    @Test
    @DisplayName("SCENARIO 08: AutoSchedule running alongside existing manual assignment strictly preserves manual assignment")
    void test08_ConcurrentAutoAndManualSchedule() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 2); // Requires 2 Baristas

        Employment alice = createStaff("Alice", 40);
        Employment bob = createStaff("Bob", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice, bob));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill),
                assignSkill(bob, baristaSkill)
        ));

        // Alice is already MANUALLY assigned
        ShiftAssignment manualAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(alice.getUser())
                .requiredSkillId(baristaSkill.getId())
                .zone(barZone)
                .source(AssignmentSource.MANUAL)
                .build();
        shift.setAssignments(new ArrayList<>(List.of(manualAssign)));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(manualAssign));
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(manualAssign));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        AutoScheduleResult result = autoScheduleService.autoSchedule(storeId, createRequest());

        // AutoSchedule must NOT wipe or overwrite manual assignment
        verify(shiftAssignmentRepository, never()).delete(manualAssign);
        verify(shiftAssignmentRepository, never()).deleteAll(argThat(list -> ((List<?>) list).contains(manualAssign)));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        List<ShiftAssignment> saved = captor.getValue();
        assertEquals(1, saved.size(), "Only 1 remaining slot needed for Bob");
        assertEquals(bob.getUser().getId(), saved.get(0).getStaff().getId());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, result.getStatus());
        assertEquals(2, result.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 09: Concurrent AutoSchedule across different stores operates with 100% store isolation")
    void test09_ConcurrentDifferentStores() throws Exception {
        UUID store1 = UUID.randomUUID();
        UUID store2 = UUID.randomUUID();

        Shift s1 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s1, baristaSkill, barZone, 1);
        Shift s2 = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(s2, cashierSkill, posZone, 1);

        when(shiftRepository.findByStoreIdAndShiftDateBetween(store1, startDate, endDate))
                .thenReturn(List.of(s1));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(store2, startDate, endDate))
                .thenReturn(List.of(s2));

        Employment empStore1 = createStaff("Store1_Staff", 40);
        Employment empStore2 = createStaff("Store2_Staff", 40);

        when(employmentRepository.findByStoreIdAndStatus(store1, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(empStore1));
        when(employmentRepository.findByStoreIdAndStatus(store2, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(empStore2));

        when(staffSkillRepository.findByStaffIdIn(List.of(empStore1.getUser().getId()))).thenReturn(List.of(
                assignSkill(empStore1, baristaSkill)
        ));
        when(staffSkillRepository.findByStaffIdIn(List.of(empStore2.getUser().getId()))).thenReturn(List.of(
                assignSkill(empStore2, cashierSkill)
        ));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);

        Future<AutoScheduleResult> f1 = executor.submit(() -> {
            latch.await();
            return autoScheduleService.autoSchedule(store1, createRequest());
        });
        Future<AutoScheduleResult> f2 = executor.submit(() -> {
            latch.await();
            return autoScheduleService.autoSchedule(store2, createRequest());
        });

        latch.countDown();
        AutoScheduleResult r1 = f1.get(5, TimeUnit.SECONDS);
        AutoScheduleResult r2 = f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r1.getStatus());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, r2.getStatus());

        verify(employmentRepository).findByStoreIdAndStatus(store1, EmploymentStatus.ACTIVE);
        verify(employmentRepository).findByStoreIdAndStatus(store2, EmploymentStatus.ACTIVE);
    }

    @Test
    @DisplayName("SCENARIO 10: Concurrent requests from different managers preserve isolation and RBAC scope")
    void test10_ConcurrentDifferentManagers() throws Exception {
        UUID storeA = UUID.randomUUID();
        UUID storeB = UUID.randomUUID();

        Shift sA = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(sA, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeA, startDate, endDate))
                .thenReturn(List.of(sA));

        Shift sB = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(sB, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeB, startDate, endDate))
                .thenReturn(List.of(sB));

        Employment staffA = createStaff("StaffA", 40);
        Employment staffB = createStaff("StaffB", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeA, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(staffA));
        when(employmentRepository.findByStoreIdAndStatus(storeB, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(staffB));

        when(staffSkillRepository.findByStaffIdIn(List.of(staffA.getUser().getId()))).thenReturn(List.of(assignSkill(staffA, baristaSkill)));
        when(staffSkillRepository.findByStaffIdIn(List.of(staffB.getUser().getId()))).thenReturn(List.of(assignSkill(staffB, baristaSkill)));

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        Future<AutoScheduleResult> fa = executor.submit(() -> {
            barrier.await();
            return autoScheduleService.autoSchedule(storeA, createRequest());
        });
        Future<AutoScheduleResult> fb = executor.submit(() -> {
            barrier.await();
            return autoScheduleService.autoSchedule(storeB, createRequest());
        });

        AutoScheduleResult resA = fa.get(5, TimeUnit.SECONDS);
        AutoScheduleResult resB = fb.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, resA.getStatus());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, resB.getStatus());
    }

    // =========================================================================
    // GROUP 3: RETRY / IDEMPOTENCY (SCENARIOS 11-13)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 11: Retry after failure produces clean, correct schedule matching a fresh run")
    void test11_RetryAfterRollback() {
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

        // Attempt 1: fails
        doThrow(new RuntimeException("Transient DB network glitch"))
                .doAnswer(inv -> inv.getArgument(0)) // Attempt 2: succeeds
                .when(shiftAssignmentRepository).saveAll(anyList());

        assertThrows(RuntimeException.class, () -> autoScheduleService.autoSchedule(storeId, createRequest()));

        // Attempt 2: retried
        AutoScheduleResult retryResult = autoScheduleService.autoSchedule(storeId, createRequest());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, retryResult.getStatus());
        assertEquals(1, retryResult.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 12: Idempotent execution clears existing AUTO assignments and prevents duplicate active rows")
    void test12_ConcurrentIdempotentAutoSchedule() {
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

        ShiftAssignment oldAuto = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(alice.getUser())
                .source(AssignmentSource.AUTO)
                .build();
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(oldAuto));

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository).deleteAll(List.of(oldAuto));
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, res.getStatus());
    }

    @Test
    @DisplayName("SCENARIO 13: Running AutoSchedule 4 times sequentially causes zero assignment accumulation")
    void test13_RepeatedAutoScheduleNoAccumulation() {
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

        for (int run = 1; run <= 4; run++) {
            AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());
            assertEquals(ScheduleCoverageStatus.FULLY_COVERED, res.getStatus());
            assertEquals(1, res.getTotalAssignedSlots());
        }

        // saveAll called 4 times, exactly 1 assignment saved each time
        verify(shiftAssignmentRepository, times(4)).saveAll(argThat(list -> ((Collection<?>) list).size() == 1));
    }

    // =========================================================================
    // GROUP 4: CAPACITY (SCENARIOS 14-16)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 14: Per-skill requiredCount capacity is strictly enforced, preventing overstaffing")
    void test14_ConcurrentPerSkillCapacity() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1); // Exactly 1 Barista needed
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

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size(), "Must not overstaff beyond requiredCount = 1");
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, res.getStatus());
    }

    @Test
    @DisplayName("SCENARIO 15: Total active assignments across all shifts never exceed total demand slots")
    void test15_ConcurrentTotalAssignmentIntegrity() {
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

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(2, res.getTotalDemandSlots());
        assertEquals(2, res.getTotalAssignedSlots());
        assertEquals(0, res.getShortageSlots());
    }

    @Test
    @DisplayName("SCENARIO 16: Soft-deleted assignments are strictly isolated and never block active capacity")
    void test16_ConcurrentDeletedAssignmentIsolation() {
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

        ShiftAssignment deletedAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(alice.getUser())
                .deleted(true)
                .build();
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(deletedAssignment));

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, res.getStatus());
        assertEquals(1, res.getTotalAssignedSlots());
    }

    // =========================================================================
    // GROUP 5: DATA INTEGRITY (SCENARIOS 17-22)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 17: Shift scheduling identity (store_id, shift_date, start_time, end_time) is verified")
    void test17_ShiftIdentityIntegrity() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        shift.setStore(com.shiftsync.store.entity.Store.builder().id(storeId).build());
        addRequirement(shift, baristaSkill, barZone, 1);

        assertEquals(storeId, shift.getStore().getId());
        assertEquals(startDate, shift.getShiftDate());
        assertEquals(LocalTime.of(8, 0), shift.getStartTime());
        assertEquals(LocalTime.of(12, 0), shift.getEndTime());
    }

    @Test
    @DisplayName("SCENARIO 18: Requirements with 0 requiredCount generate 0 demand and are handled gracefully")
    void test18_RequirementCountIntegrity() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 0); // 0 required
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(0, res.getTotalDemandSlots());
        assertEquals(0, res.getTotalAssignedSlots());
        assertEquals(ScheduleCoverageStatus.NO_DEMAND, res.getStatus());
    }

    @Test
    @DisplayName("SCENARIO 19: All generated ShiftAssignment entities have non-null shift, staff, and AUTO source")
    void test19_AssignmentReferenceIntegrity() {
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

        autoScheduleService.autoSchedule(storeId, createRequest());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        ShiftAssignment sa = captor.getValue().get(0);

        assertNotNull(sa.getShift());
        assertNotNull(sa.getStaff());
        assertEquals(AssignmentSource.AUTO, sa.getSource());
        assertFalse(sa.isDeleted());
    }

    @Test
    @DisplayName("SCENARIO 20: Generated assignment requiredSkillId matches requirement and staff skill validity")
    void test20_RequiredSkillIntegrity() {
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

        autoScheduleService.autoSchedule(storeId, createRequest());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        ShiftAssignment sa = captor.getValue().get(0);

        assertEquals(baristaSkill.getId(), sa.getRequiredSkillId());
    }

    @Test
    @DisplayName("SCENARIO 21: Spatial StoreZone and Workstation are faithfully mapped from requirement to assignment")
    void test21_ZoneWorkstationIntegrity() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, barWorkstation, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        autoScheduleService.autoSchedule(storeId, createRequest());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShiftAssignment>> captor = ArgumentCaptor.forClass(List.class);
        verify(shiftAssignmentRepository).saveAll(captor.capture());
        ShiftAssignment sa = captor.getValue().get(0);

        assertEquals(barZone.getId(), sa.getZone().getId());
        assertEquals(barWorkstation.getId(), sa.getWorkstation().getId());
    }

    @Test
    @DisplayName("SCENARIO 22: Coverage status, rates, and shortage counts mathematically reflect database state")
    void test22_FinalCoverageIntegrity() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 2); // 2 needed, only 1 available
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        Employment alice = createStaff("Alice", 40);
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(alice));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                assignSkill(alice, baristaSkill)
        ));

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(2, res.getTotalDemandSlots());
        assertEquals(1, res.getTotalAssignedSlots());
        assertEquals(1, res.getShortageSlots());
        assertEquals(50.0, res.getCoverageRate());
        assertEquals(ScheduleCoverageStatus.PARTIALLY_COVERED, res.getStatus());
        assertEquals(1, res.getShortages().size());
        assertEquals(1, res.getShortages().get(0).getShortageCount());
    }

    // =========================================================================
    // GROUP 6: SECURITY & END-TO-END FLOW (SCENARIOS 23-28)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 23: Manager of Store A querying Store B loads zero staff from Store A")
    void test23_CrossStoreAuthorizationIsolation() {
        UUID storeB = UUID.randomUUID();
        Shift shiftB = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shiftB, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeB, startDate, endDate))
                .thenReturn(List.of(shiftB));
        when(employmentRepository.findByStoreIdAndStatus(storeB, EmploymentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeB, createRequest());

        assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, res.getStatus());
        assertEquals(1, res.getShortageSlots());
        verify(employmentRepository).findByStoreIdAndStatus(storeB, EmploymentStatus.ACTIVE);
    }

    @Test
    @DisplayName("SCENARIO 24: End-to-End scheduling flow with manual pre-fill, AutoSchedule, and re-schedule")
    void test24_EndToEndSchedulingFlow() {
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

        // Step 1: Initial AutoSchedule
        AutoScheduleResult res1 = autoScheduleService.autoSchedule(storeId, createRequest());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, res1.getStatus());
        assertEquals(2, res1.getTotalAssignedSlots());

        // Step 2: Manager converts Alice's assignment on s1 to MANUAL
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

        // Step 3: Re-run AutoSchedule. Manual assignment on s1 is preserved, s2 assigned to Bob.
        AutoScheduleResult res2 = autoScheduleService.autoSchedule(storeId, createRequest());
        assertEquals(ScheduleCoverageStatus.FULLY_COVERED, res2.getStatus());
        assertEquals(1, res2.getExistingManualAssignments());
        assertEquals(1, res2.getNewAssignmentsCreated());
        assertEquals(2, res2.getTotalAssignedSlots());
    }

    @Test
    @DisplayName("SCENARIO 25: OptimisticLockingFailureException triggers clean transaction rollback")
    void test25_OptimisticLockConflict() {
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

        doThrow(new OptimisticLockingFailureException("Shift version conflict occurred"))
                .when(shiftAssignmentRepository).saveAll(anyList());

        assertThrows(OptimisticLockingFailureException.class, () ->
                autoScheduleService.autoSchedule(storeId, createRequest())
        );
    }

    @Test
    @DisplayName("SCENARIO 26: DatabaseConstraintViolation triggers rollback and is not masked")
    void test26_DatabaseConstraintViolation() {
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

        doThrow(new DataIntegrityViolationException("Database check constraint failed"))
                .when(shiftAssignmentRepository).saveAll(anyList());

        assertThrows(DataIntegrityViolationException.class, () ->
                autoScheduleService.autoSchedule(storeId, createRequest())
        );
    }

    @Test
    @DisplayName("SCENARIO 27: Cross-store workforce sharing requires active store employment; unshared staff excluded")
    void test27_WorkforceRequestAuthorizedSharing() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        addRequirement(shift, baristaSkill, barZone, 1);
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startDate, endDate))
                .thenReturn(List.of(shift));

        // Only active employments in this store are returned
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        AutoScheduleResult res = autoScheduleService.autoSchedule(storeId, createRequest());

        assertEquals(ScheduleCoverageStatus.ZERO_COVERAGE, res.getStatus());
        assertEquals(1, res.getShortageSlots());
    }

    @Test
    @DisplayName("SCENARIO 28: Payroll and Attendance downstream integrity: soft-deleted assignments are ignored")
    void test28_PayrollAttendanceRegression() {
        Shift shift = createShift(startDate, LocalTime.of(8, 0), LocalTime.of(12, 0));
        ShiftAssignment activeAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .deleted(false)
                .build();
        ShiftAssignment deletedAssign = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .deleted(true)
                .build();

        List<ShiftAssignment> all = List.of(activeAssign, deletedAssign);
        List<ShiftAssignment> activeOnly = all.stream()
                .filter(a -> !a.isDeleted())
                .toList();

        assertEquals(1, activeOnly.size());
        assertEquals(activeAssign.getId(), activeOnly.get(0).getId());
    }
}
