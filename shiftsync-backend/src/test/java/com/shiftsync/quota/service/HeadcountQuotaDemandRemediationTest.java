package com.shiftsync.quota.service;

import com.shiftsync.quota.dto.ApplySchedulerRequest;
import com.shiftsync.quota.dto.UpdateQuotaRequest;
import com.shiftsync.quota.dto.WeeklyMatrixQuotaResponse;
import com.shiftsync.quota.entity.PositionNormOverride;
import com.shiftsync.quota.repository.PositionNormOverrideRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.BulkDemandPlanningRequest;
import com.shiftsync.shift.dto.ShiftRequirementRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.service.ShiftService;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.Store;
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
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HeadcountQuotaDemandRemediationTest {

    @Mock private StoreRepository storeRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private StaffSkillRepository staffSkillRepository;
    @Mock private PositionNormOverrideRepository positionNormOverrideRepository;

    @InjectMocks
    private HeadcountQuotaService headcountQuotaService;

    private UUID storeId;
    private Store store;
    private Skill baristaSkill;
    private Skill cashierSkill;
    private Skill waiterSkill;
    private LocalDate testDate;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        store = Store.builder()
                .id(storeId)
                .name("Store Test")
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .build();

        baristaSkill = Skill.builder()
                .id(UUID.randomUUID())
                .name("Barista")
                .store(store)
                .build();

        cashierSkill = Skill.builder()
                .id(UUID.randomUUID())
                .name("Cashier")
                .store(store)
                .build();

        waiterSkill = Skill.builder()
                .id(UUID.randomUUID())
                .name("Waiter")
                .store(store)
                .build();

        testDate = LocalDate.of(2026, 3, 16); // Monday

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(skillRepository.findByStoreId(storeId)).thenReturn(Arrays.asList(baristaSkill, cashierSkill, waiterSkill));
        when(skillRepository.findById(baristaSkill.getId())).thenReturn(Optional.of(baristaSkill));
        when(skillRepository.findById(cashierSkill.getId())).thenReturn(Optional.of(cashierSkill));
        when(skillRepository.findById(waiterSkill.getId())).thenReturn(Optional.of(waiterSkill));
        when(skillRepository.findByIdAndStoreId(baristaSkill.getId(), storeId)).thenReturn(Optional.of(baristaSkill));
    }

    @Test
    @DisplayName("Test 1: Idempotent shift creation via findByStoreIdAndShiftDateAndStartTimeAndEndTime")
    void test1_IdempotentShiftCreation() {
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(15, 0);

        Shift existingShift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(start)
                .endTime(end)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, start, end))
                .thenReturn(Optional.of(existingShift));

        // When updating quota for this shift
        UpdateQuotaRequest req = new UpdateQuotaRequest();
        req.setBranchId(storeId);
        req.setDate(testDate);
        req.setShiftType("morning");
        req.setPositionId(baristaSkill.getId());
        req.setCount(2);

        headcountQuotaService.updateQuota("quota-1", req);

        // Verify shiftRepository.save was called on existingShift, and NO NEW SHIFT was created
        verify(shiftRepository, atLeastOnce()).save(existingShift);
        assertEquals(1, existingShift.getRequirements().size());
        assertEquals(baristaSkill.getId(), existingShift.getRequirements().get(0).getSkill().getId());
        assertEquals(2, existingShift.getRequirements().get(0).getRequiredCount());
    }

    @Test
    @DisplayName("Quota GET is side-effect free when canonical shifts do not exist")
    void getDailyQuotas_DoesNotCreateDraftShifts() {
        when(shiftRepository.findByStoreIdAndShiftDate(storeId, testDate)).thenReturn(Collections.emptyList());

        headcountQuotaService.getDailyQuotas(storeId, testDate);

        verify(shiftRepository, never()).save(any(Shift.class));
    }

    @Test
    @DisplayName("Persisted norm override is used by subsequent quota reads")
    void updateNorm_PersistsAndIsReadFromRepository() {
        UpdateQuotaRequest req = new UpdateQuotaRequest();
        req.setBranchId(storeId);
        req.setPositionId(baristaSkill.getId());
        req.setMin(2);
        req.setTarget(3);
        req.setMax(4);
        when(positionNormOverrideRepository.findByStoreIdAndSkillId(storeId, baristaSkill.getId()))
                .thenReturn(Optional.empty(), Optional.of(PositionNormOverride.builder()
                        .store(store).skill(baristaSkill).min(2).target(3).max(4).build()));

        headcountQuotaService.updateQuota("norm", req);

        ArgumentCaptor<PositionNormOverride> captor = ArgumentCaptor.forClass(PositionNormOverride.class);
        verify(positionNormOverrideRepository).save(captor.capture());
        assertEquals(2, captor.getValue().getMin());
        assertEquals(3, captor.getValue().getTarget());
        assertEquals(4, captor.getValue().getMax());
        assertEquals(3, headcountQuotaService.getPositions(storeId).stream()
                .filter(position -> position.getId().equals(baristaSkill.getId()))
                .findFirst().orElseThrow().getDefaultTarget());
    }

    @Test
    @DisplayName("Test 2: Requirement synchronization populates canonical shifts with operational positions")
    void test2_RequirementSynchronization() {
        when(shiftRepository.findByStoreIdAndShiftDateBetween(eq(storeId), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(eq(storeId), eq(testDate), any(), any()))
                .thenAnswer(inv -> {
                    LocalTime s = inv.getArgument(2);
                    LocalTime e = inv.getArgument(3);
                    Shift shift = Shift.builder()
                            .id(UUID.randomUUID())
                            .store(store)
                            .shiftDate(testDate)
                            .startTime(s)
                            .endTime(e)
                            .status(ShiftStatus.DRAFT)
                            .requirements(new ArrayList<>())
                            .build();
                    return Optional.of(shift);
                });

        ApplySchedulerRequest req = new ApplySchedulerRequest();
        req.setBranchId(storeId);
        req.setDate(testDate);

        Map<String, Object> result = headcountQuotaService.applyToScheduler(req);

        assertTrue((Boolean) result.get("success"));
        ArgumentCaptor<Shift> shiftCaptor = ArgumentCaptor.forClass(Shift.class);
        verify(shiftRepository, atLeast(2)).save(shiftCaptor.capture());

        for (Shift s : shiftCaptor.getAllValues()) {
            assertFalse(s.getRequirements().isEmpty());
            Set<UUID> reqSkillIds = new HashSet<>();
            for (ShiftSkillRequirement r : s.getRequirements()) {
                reqSkillIds.add(r.getSkill().getId());
                assertTrue(r.getRequiredCount() >= 1, "Requirement count should be at least 1");
            }
            assertTrue(reqSkillIds.contains(baristaSkill.getId()));
            assertTrue(reqSkillIds.contains(cashierSkill.getId()));
            assertTrue(reqSkillIds.contains(waiterSkill.getId()));
        }
    }

    @Test
    @DisplayName("Test 3: Requirement update modifies only target position count")
    void test3_RequirementUpdate() {
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(15, 0);

        Shift shift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(start)
                .endTime(end)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        ShiftSkillRequirement baristaReq = ShiftSkillRequirement.builder()
                .shift(shift)
                .skill(baristaSkill)
                .requiredCount(2)
                .build();
        shift.getRequirements().add(baristaReq);

        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, start, end))
                .thenReturn(Optional.of(shift));

        UpdateQuotaRequest req = new UpdateQuotaRequest();
        req.setBranchId(storeId);
        req.setDate(testDate);
        req.setShiftType("morning");
        req.setPositionId(baristaSkill.getId());
        req.setCount(4);

        headcountQuotaService.updateQuota("quota-1", req);

        assertEquals(4, baristaReq.getRequiredCount());
        verify(shiftRepository).save(shift);
    }

    @Test
    @DisplayName("Test 4: Multi-skill requirements supported on single shift")
    void test4_MultiSkillRequirements() {
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(15, 0);

        Shift shift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(start)
                .endTime(end)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, start, end))
                .thenReturn(Optional.of(shift));

        // Add Barista requirement = 3
        UpdateQuotaRequest req1 = new UpdateQuotaRequest();
        req1.setBranchId(storeId);
        req1.setDate(testDate);
        req1.setShiftType("morning");
        req1.setPositionId(baristaSkill.getId());
        req1.setCount(3);
        headcountQuotaService.updateQuota("quota-b", req1);

        // Add Cashier requirement = 1
        UpdateQuotaRequest req2 = new UpdateQuotaRequest();
        req2.setBranchId(storeId);
        req2.setDate(testDate);
        req2.setShiftType("morning");
        req2.setPositionId(cashierSkill.getId());
        req2.setCount(1);
        headcountQuotaService.updateQuota("quota-c", req2);

        assertEquals(2, shift.getRequirements().size());
        assertEquals(3, shift.getRequirements().get(0).getRequiredCount());
        assertEquals(1, shift.getRequirements().get(1).getRequiredCount());
    }

    @Test
    @DisplayName("Test 5: Repeated applyToScheduler does not duplicate shifts or requirements")
    void test5_RepeatedApplyToScheduler_Idempotency() {
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(15, 0);

        Shift morning = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(start)
                .endTime(end)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        Shift afternoon = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(end)
                .endTime(LocalTime.of(22, 0))
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate))
                .thenReturn(Arrays.asList(morning, afternoon));
        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, start, end))
                .thenReturn(Optional.of(morning));
        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, end, LocalTime.of(22, 0)))
                .thenReturn(Optional.of(afternoon));

        ApplySchedulerRequest req = new ApplySchedulerRequest();
        req.setBranchId(storeId);
        req.setDate(testDate);

        // First apply
        headcountQuotaService.applyToScheduler(req);
        int morningReqCount = morning.getRequirements().size();
        int afternoonReqCount = afternoon.getRequirements().size();

        // Second apply
        headcountQuotaService.applyToScheduler(req);

        // Counts must be identical (no duplicate entries)
        assertEquals(morningReqCount, morning.getRequirements().size());
        assertEquals(afternoonReqCount, afternoon.getRequirements().size());
    }

    @Test
    @DisplayName("Test 6: Multiple shifts on same day deterministically picks canonical shift")
    void test6_MultipleShiftsOnSameDay_DeterministicResolution() {
        LocalTime open = LocalTime.of(8, 0);
        LocalTime mid = LocalTime.of(15, 0);
        LocalTime close = LocalTime.of(22, 0);

        // Shift 1: Intermediate shift [10:00, 18:00] appearing FIRST in list
        Shift midDayShift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        // Shift 2: Canonical morning shift [08:00, 15:00] appearing SECOND
        Shift canonicalMorning = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(open)
                .endTime(mid)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();
        canonicalMorning.getRequirements().add(ShiftSkillRequirement.builder()
                .shift(canonicalMorning)
                .skill(baristaSkill)
                .requiredCount(5)
                .build());

        // Shift 3: Canonical afternoon shift [15:00, 22:00]
        Shift canonicalAfternoon = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(mid)
                .endTime(close)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate.plusDays(6)))
                .thenReturn(Arrays.asList(midDayShift, canonicalMorning, canonicalAfternoon));

        WeeklyMatrixQuotaResponse weekly = headcountQuotaService.getWeeklyQuotas(storeId, testDate);

        // Verify Barista morning cell picked canonicalMorning (count = 5), NOT midDayShift
        WeeklyMatrixQuotaResponse.MatrixRow baristaRow = weekly.getMatrixRows().stream()
                .filter(r -> r.getPositionId().equals(baristaSkill.getId()))
                .findFirst()
                .orElseThrow();

        // Day 0 morning is cell 0
        WeeklyMatrixQuotaResponse.MatrixCell mondayMorningCell = baristaRow.getCells().get(0);
        assertEquals("morning", mondayMorningCell.getShiftType());
        assertEquals(5, mondayMorningCell.getCount(), "Must deterministically pick canonical shift [08:00, 15:00] with count 5");
    }

    @Test
    @DisplayName("Test 7: Store isolation prevents cross-store quota contamination")
    void test7_StoreIsolation() {
        UUID storeBId = UUID.randomUUID();
        Store storeB = Store.builder()
                .id(storeBId)
                .name("Store B")
                .openTime(LocalTime.of(9, 0))
                .closeTime(LocalTime.of(21, 0))
                .build();
        when(storeRepository.findById(storeBId)).thenReturn(Optional.of(storeB));

        UpdateQuotaRequest req = new UpdateQuotaRequest();
        req.setBranchId(storeId); // Store A
        req.setDate(testDate);
        req.setShiftType("morning");
        req.setPositionId(baristaSkill.getId());
        req.setCount(3);

        headcountQuotaService.updateQuota("q-1", req);

        // Verify findByStoreId was NEVER called for Store B
        verify(shiftRepository, never()).findByStoreIdAndShiftDateAndStartTimeAndEndTime(eq(storeBId), any(), any(), any());
    }

    @Test
    @DisplayName("Test 8: Validation failure halts execution before any database modification")
    void test8_TransactionRollbackOnFailure_Validation() {
        UpdateQuotaRequest req = new UpdateQuotaRequest();
        req.setBranchId(storeId);
        req.setDate(testDate);
        req.setShiftType("morning");
        req.setPositionId(baristaSkill.getId());
        req.setCount(-5); // INVALID NEGATIVE COUNT

        BusinessException ex = assertThrows(BusinessException.class, () ->
                headcountQuotaService.updateQuota("q-invalid", req));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("negative"));
        // No save operations should have been executed
        verify(shiftRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 9: Existing scheduler shifts preservation and custom requirements preservation")
    void test9_ExistingSchedulerShiftsPreservation() {
        LocalTime open = LocalTime.of(8, 0);
        LocalTime mid = LocalTime.of(15, 0);
        LocalTime close = LocalTime.of(22, 0);

        // Non-canonical valid draft shift (10:00 - 18:00) inside [08:00, 22:00]
        Shift validMidShift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        // Out-of-bounds draft shift (06:00 - 10:00) before openTime 08:00
        Shift outOfBoundsShift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(LocalTime.of(6, 0))
                .endTime(LocalTime.of(10, 0))
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();

        // Canonical morning shift with customized Barista count = 6
        Shift canonicalMorning = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(open)
                .endTime(mid)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();
        canonicalMorning.getRequirements().add(ShiftSkillRequirement.builder()
                .shift(canonicalMorning)
                .skill(baristaSkill)
                .requiredCount(6) // Custom quota!
                .build());

        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate))
                .thenReturn(Arrays.asList(validMidShift, outOfBoundsShift, canonicalMorning));
        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, open, mid))
                .thenReturn(Optional.of(canonicalMorning));
        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, mid, close))
                .thenReturn(Optional.of(Shift.builder()
                        .id(UUID.randomUUID())
                        .store(store)
                        .shiftDate(testDate)
                        .startTime(mid)
                        .endTime(close)
                        .status(ShiftStatus.DRAFT)
                        .requirements(new ArrayList<>())
                        .build()));

        ApplySchedulerRequest req = new ApplySchedulerRequest();
        req.setBranchId(storeId);
        req.setDate(testDate);

        headcountQuotaService.applyToScheduler(req);

        // Out of bounds shift was deleted
        verify(shiftRepository).delete(outOfBoundsShift);
        // Valid mid shift was NOT deleted
        verify(shiftRepository, never()).delete(validMidShift);

        // Custom Barista requirement count (6) was PRESERVED on canonicalMorning
        ShiftSkillRequirement baristaReq = canonicalMorning.getRequirements().stream()
                .filter(r -> r.getSkill().getId().equals(baristaSkill.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(6, baristaReq.getRequiredCount(), "Existing custom requirement must be preserved!");
    }

    @Test
    @DisplayName("Test 10: Zero count is permitted but negative count is rejected across write paths")
    void test10_ZeroAndNegativeRequiredCountValidation() {
        // 1. updateQuota rejects negative count
        UpdateQuotaRequest negativeReq = new UpdateQuotaRequest();
        negativeReq.setBranchId(storeId);
        negativeReq.setCount(-1);
        assertThrows(BusinessException.class, () -> headcountQuotaService.updateQuota("q", negativeReq));

        // 2. updateQuota allows 0 count
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(15, 0);
        Shift shift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(start)
                .endTime(end)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .build();
        when(shiftRepository.findByStoreIdAndShiftDateAndStartTimeAndEndTime(storeId, testDate, start, end))
                .thenReturn(Optional.of(shift));

        UpdateQuotaRequest zeroReq = new UpdateQuotaRequest();
        zeroReq.setBranchId(storeId);
        zeroReq.setDate(testDate);
        zeroReq.setShiftType("morning");
        zeroReq.setPositionId(baristaSkill.getId());
        zeroReq.setCount(0);

        assertDoesNotThrow(() -> headcountQuotaService.updateQuota("q-zero", zeroReq));
        assertEquals(1, shift.getRequirements().size());
        assertEquals(0, shift.getRequirements().get(0).getRequiredCount());
    }
}
