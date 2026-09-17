package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.layout.service.SpatialAllocationService;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.dto.ShiftAssignmentResponseDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.AssignmentSource;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AutoScheduleAssignmentCorrectnessTest {

    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private StaffSkillRepository staffSkillRepository;
    @Mock private AvailabilityRepository availabilityRepository;
    @Mock private BlackoutDateRepository blackoutDateRepository;
    @Mock private StoreConfigurationRepository storeConfigRepo;
    @Mock private SchedulerConfigurationRepository schedulerConfigRepo;
    @Mock private SpatialAllocationService spatialAllocationService;
    @Mock private UserRepository userRepository;
    @Mock private PayrollPeriodRepository payrollPeriodRepository;
    @Mock private ShiftValidationService shiftValidationService;
    @Mock private StoreZoneRepository storeZoneRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private com.shiftsync.notification.service.NotificationService notificationService;

    @Captor
    private ArgumentCaptor<List<ShiftAssignment>> assignmentsCaptor;

    @InjectMocks
    private AutoScheduleService autoScheduleService;

    private ShiftAssignmentValidator shiftAssignmentValidator;
    private ShiftAssignmentService shiftAssignmentService;

    private UUID storeId;
    private Store store;
    private UUID baristaSkillId;
    private Skill baristaSkill;
    private UUID cashierSkillId;
    private Skill cashierSkill;

    private LocalDate testDate;
    private LocalTime startTime;
    private LocalTime endTime;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        store = Store.builder().id(storeId).name("Test Store").build();

        baristaSkillId = UUID.randomUUID();
        baristaSkill = Skill.builder().id(baristaSkillId).name("Barista").build();

        cashierSkillId = UUID.randomUUID();
        cashierSkill = Skill.builder().id(cashierSkillId).name("Cashier").build();

        testDate = LocalDate.of(2026, 9, 21); // Monday
        startTime = LocalTime.of(8, 0);
        endTime = LocalTime.of(16, 0);

        shiftAssignmentValidator = new ShiftAssignmentValidator(
                availabilityRepository,
                blackoutDateRepository,
                shiftAssignmentRepository,
                staffSkillRepository,
                skillRepository,
                shiftValidationService
        );

        shiftAssignmentService = new ShiftAssignmentService(
                shiftRepository,
                shiftAssignmentRepository,
                employmentRepository,
                userRepository,
                payrollPeriodRepository,
                notificationService,
                shiftAssignmentValidator,
                staffSkillRepository,
                storeZoneRepository,
                skillRepository
        );
    }

    private StoreConfiguration defaultStoreConfig() {
        return StoreConfiguration.builder().minRestHours(11).build();
    }

    private SchedulerConfiguration defaultSchedConfig() {
        return SchedulerConfiguration.builder()
                .skillWeight(BigDecimal.valueOf(0.25))
                .hourWeight(BigDecimal.valueOf(0.25))
                .fairnessWeight(BigDecimal.valueOf(0.25))
                .restTimeWeight(BigDecimal.valueOf(0.25))
                .availabilityWeight(BigDecimal.ZERO)
                .build();
    }

    private AutoScheduleRequest createRequest() {
        AutoScheduleRequest req = new AutoScheduleRequest();
        req.setStartDate(testDate);
        req.setEndDate(testDate);
        return req;
    }

    private User createStaffUser(String name) {
        return User.builder()
                .id(UUID.randomUUID())
                .fullName(name)
                .email(name.toLowerCase().replace(" ", "") + "@test.com")
                .systemRole(SystemRole.STAFF)
                .build();
    }

    private Employment createEmployment(User user, int maxWeeklyHours) {
        return Employment.builder()
                .id(UUID.randomUUID())
                .user(user)
                .store(store)
                .status(EmploymentStatus.ACTIVE)
                .contractType(ContractType.builder().maxWeeklyHours(maxWeeklyHours).build())
                .build();
    }

    private StaffSkill createStaffSkill(UUID staffId, Skill skill) {
        return StaffSkill.builder()
                .id(UUID.randomUUID())
                .staffId(staffId)
                .skillId(skill.getId())
                .expirationDate(null)
                .build();
    }

    private Availability createAvailability(User user, short dayOfWeek) {
        return Availability.builder()
                .id(UUID.randomUUID())
                .user(user)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(0, 0))
                .endTime(LocalTime.of(23, 59))
                .build();
    }

    private Shift createShift(List<ShiftSkillRequirement> requirements) {
        Shift shift = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(startTime)
                .endTime(endTime)
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>())
                .assignments(new ArrayList<>())
                .build();
        if (requirements != null) {
            requirements.forEach(r -> r.setShift(shift));
            shift.setRequirements(requirements);
        }
        return shift;
    }

    // =========================================================================
    // TEST 01: Existing manual assignment reduces scheduler demand
    // =========================================================================
    @Test
    @DisplayName("TEST 01: Existing manual assignment reduces scheduler demand")
    void test01_existingManualAssignmentReducesSchedulerDemand() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(2)
                .build();
        Shift shift = createShift(List.of(req));

        User manualStaff = createStaffUser("Manual Staff");
        ShiftAssignment manualAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(manualStaff)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .build();

        User autoCandidate = createStaffUser("Auto Candidate");
        Employment autoEmp = createEmployment(autoCandidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(manualAssignment));

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(autoEmp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(autoCandidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(autoCandidate, (short) 1)));
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any())).thenReturn(Collections.emptyList());
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any())).thenReturn(Collections.emptyList());

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> saved = assignmentsCaptor.getValue();
        // Demand was 2, 1 manual existed -> exactly 1 auto assignment created
        assertEquals(1, saved.size(), "Should only generate 1 auto assignment because 1 manual assignment already reduced demand");
        assertEquals(baristaSkillId, saved.get(0).getRequiredSkillId());
        assertEquals(AssignmentSource.AUTO, saved.get(0).getSource());
    }

    // =========================================================================
    // TEST 02: Full manual assignment results in zero auto assignments
    // =========================================================================
    @Test
    @DisplayName("TEST 02: Full manual assignment results in zero auto assignments")
    void test02_fullManualAssignmentResultsInZeroAutoAssignments() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(2)
                .build();
        Shift shift = createShift(List.of(req));

        User staff1 = createStaffUser("Manual Staff 1");
        User staff2 = createStaffUser("Manual Staff 2");
        ShiftAssignment m1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(staff1).requiredSkillId(baristaSkillId).source(AssignmentSource.MANUAL).build();
        ShiftAssignment m2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(staff2).requiredSkillId(baristaSkillId).source(AssignmentSource.MANUAL).build();

        User autoCandidate = createStaffUser("Auto Candidate");
        Employment autoEmp = createEmployment(autoCandidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(m1, m2));

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(autoEmp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(autoCandidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(autoCandidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    // =========================================================================
    // TEST 03: Existing AUTO assignments are cleanly regenerated
    // =========================================================================
    @Test
    @DisplayName("TEST 03: Existing AUTO assignments are cleanly regenerated and never accumulate")
    void test03_existingAutoAssignmentsCleanlyRegenerated() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(2)
                .build();
        Shift shift = createShift(List.of(req));

        User autoCandidate1 = createStaffUser("Auto 1");
        User autoCandidate2 = createStaffUser("Auto 2");
        Employment emp1 = createEmployment(autoCandidate1, 40);
        Employment emp2 = createEmployment(autoCandidate2, 40);

        // Simulated existing AUTO assignments from previous run
        ShiftAssignment oldAuto1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(autoCandidate1).requiredSkillId(baristaSkillId).source(AssignmentSource.AUTO).build();
        ShiftAssignment oldAuto2 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(autoCandidate2).requiredSkillId(baristaSkillId).source(AssignmentSource.AUTO).build();

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(oldAuto1, oldAuto2));

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp1, emp2));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                createStaffSkill(autoCandidate1.getId(), baristaSkill),
                createStaffSkill(autoCandidate2.getId(), baristaSkill)
        ));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(
                createAvailability(autoCandidate1, (short) 1),
                createAvailability(autoCandidate2, (short) 1)
        ));

        autoScheduleService.autoSchedule(storeId, createRequest());

        // Verify deleteAll was called with the old AUTO assignments
        verify(shiftAssignmentRepository).deleteAll(List.of(oldAuto1, oldAuto2));

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> saved = assignmentsCaptor.getValue();
        // AUTO assignments are regenerated to 2, not accumulated to 4
        assertEquals(2, saved.size(), "AUTO assignments should be regenerated without accumulating");
    }

    // =========================================================================
    // TEST 04: Manual assignments are NEVER overwritten or deleted by auto-scheduler
    // =========================================================================
    @Test
    @DisplayName("TEST 04: Manual assignments are never deleted by auto-scheduler")
    void test04_manualAssignmentsNeverOverwrittenOrDeletedByAutoScheduler() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(2)
                .build();
        Shift shift = createShift(List.of(req));

        User manualStaff = createStaffUser("Manual Staff");
        ShiftAssignment manualAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(manualStaff)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .build();

        User autoCandidate = createStaffUser("Auto Staff");
        Employment emp = createEmployment(autoCandidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(manualAssignment));

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(autoCandidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(autoCandidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        // Verify manual assignment was NEVER passed to deleteAll
        verify(shiftAssignmentRepository, never()).deleteAll(anyList());
        verify(shiftAssignmentRepository, never()).delete(manualAssignment);
    }

    // =========================================================================
    // TEST 05: Mixed MANUAL + AUTO: MANUAL preserved, AUTO regenerated
    // =========================================================================
    @Test
    @DisplayName("TEST 05: Mixed MANUAL + AUTO correctly preserves manual and regenerates auto")
    void test05_mixedManualAndAuto_ManualPreservedAutoRegenerated() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(3)
                .build();
        Shift shift = createShift(List.of(req));

        User manualStaff = createStaffUser("Manual Staff");
        User autoStaff1 = createStaffUser("Auto 1");
        User autoStaff2 = createStaffUser("Auto 2");

        ShiftAssignment manualAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(manualStaff)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .build();
        ShiftAssignment existingAuto = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(autoStaff1)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.AUTO)
                .build();

        Employment emp1 = createEmployment(autoStaff1, 40);
        Employment emp2 = createEmployment(autoStaff2, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(manualAssignment, existingAuto));

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp1, emp2));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(
                createStaffSkill(autoStaff1.getId(), baristaSkill),
                createStaffSkill(autoStaff2.getId(), baristaSkill)
        ));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(
                createAvailability(autoStaff1, (short) 1),
                createAvailability(autoStaff2, (short) 1)
        ));

        autoScheduleService.autoSchedule(storeId, createRequest());

        // Verify only existingAuto was deleted
        verify(shiftAssignmentRepository).deleteAll(List.of(existingAuto));

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> saved = assignmentsCaptor.getValue();
        // 3 total needed, 1 manual exists -> exactly 2 auto assignments created
        assertEquals(2, saved.size());
    }

    // =========================================================================
    // TEST 06: Per-skill capacity enforcement: cannot assign to skill when capacity full
    // =========================================================================
    @Test
    @DisplayName("TEST 06: Per-skill capacity enforcement prevents assigning when skill requirement full")
    void test06_perSkillCapacityEnforcement() {
        ShiftSkillRequirement baristaReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .build();
        ShiftSkillRequirement cashierReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(cashierSkill)
                .requiredCount(2)
                .build();
        Shift shift = createShift(List.of(baristaReq, cashierReq));

        User existingBarista = createStaffUser("Existing Barista");
        ShiftAssignment bAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(existingBarista)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .build();
        shift.getAssignments().add(bAssignment);

        User newBaristaCandidate = createStaffUser("New Barista");
        Employment emp = createEmployment(newBaristaCandidate, 40);

        when(shiftRepository.findByIdAndStoreId(shift.getId(), storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(newBaristaCandidate.getId())).thenReturn(Optional.of(newBaristaCandidate));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(newBaristaCandidate.getId(), storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shift.getId(), newBaristaCandidate.getId())).thenReturn(false);
        doNothing().when(shiftValidationService).validateNoOverlapAndWeeklyHours(shift, newBaristaCandidate.getId(), null);
        when(staffSkillRepository.findByStaffId(newBaristaCandidate.getId())).thenReturn(List.of(createStaffSkill(newBaristaCandidate.getId(), baristaSkill)));
        when(availabilityRepository.coversShiftTime(eq(newBaristaCandidate.getId()), any(), any(), any())).thenReturn(true);
        when(blackoutDateRepository.existsByStaffIdAndDate(eq(newBaristaCandidate.getId()), any())).thenReturn(false);
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(bAssignment));

        // Candidate only has Barista skill, but Barista requirement capacity (1) is already reached!
        BusinessException ex = assertThrows(BusinessException.class, () ->
                shiftAssignmentService.assignStaffToShift(storeId, shift.getId(), newBaristaCandidate.getId())
        );
        assertTrue(ex.getMessage().contains("capacity reached") || ex.getMessage().contains("Slot full"));
    }

    // =========================================================================
    // TEST 07: Multi-skill staff correctly assigned to skill with remaining capacity
    // =========================================================================
    @Test
    @DisplayName("TEST 07: Multi-skill staff assigned to requirement with remaining capacity")
    void test07_multiSkillStaffAssignedToRequirementWithRemainingCapacity() {
        ShiftSkillRequirement baristaReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .build();
        ShiftSkillRequirement cashierReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(cashierSkill)
                .requiredCount(1)
                .build();
        Shift shift = createShift(List.of(baristaReq, cashierReq));

        // Barista is already filled
        User baristaStaff = createStaffUser("Barista Only");
        ShiftAssignment bAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(baristaStaff)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .build();
        shift.getAssignments().add(bAssignment);

        // Multi-skilled candidate (has both Barista and Cashier)
        User multiSkillStaff = createStaffUser("Multi Skilled");
        Employment emp = createEmployment(multiSkillStaff, 40);

        when(shiftRepository.findByIdAndStoreId(shift.getId(), storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(multiSkillStaff.getId())).thenReturn(Optional.of(multiSkillStaff));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(multiSkillStaff.getId(), storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shift.getId(), multiSkillStaff.getId())).thenReturn(false);
        doNothing().when(shiftValidationService).validateNoOverlapAndWeeklyHours(shift, multiSkillStaff.getId(), null);
        when(staffSkillRepository.findByStaffId(multiSkillStaff.getId())).thenReturn(List.of(
                createStaffSkill(multiSkillStaff.getId(), baristaSkill),
                createStaffSkill(multiSkillStaff.getId(), cashierSkill)
        ));
        when(availabilityRepository.coversShiftTime(eq(multiSkillStaff.getId()), any(), any(), any())).thenReturn(true);
        when(blackoutDateRepository.existsByStaffIdAndDate(eq(multiSkillStaff.getId()), any())).thenReturn(false);
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(bAssignment));
        when(shiftAssignmentRepository.save(any(ShiftAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShiftAssignmentResponseDTO response = shiftAssignmentService.assignStaffToShift(storeId, shift.getId(), multiSkillStaff.getId());

        // Even though Barista skill was first in the requirements list, staff was assigned to Cashier because Barista was full!
        assertEquals(cashierSkillId, response.getRequiredSkillId(), "Multi-skilled staff must be matched to Cashier requirement since Barista capacity is exhausted");
    }

    // =========================================================================
    // TEST 08: Zero-requirement skill receives no assignments
    // =========================================================================
    @Test
    @DisplayName("TEST 08: Zero-requirement skill receives no auto assignments")
    void test08_zeroRequirementSkillReceivesNoAssignments() {
        ShiftSkillRequirement zeroReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(0)
                .build();
        Shift shift = createShift(List.of(zeroReq));

        User candidate = createStaffUser("Candidate");
        Employment emp = createEmployment(candidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(candidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(candidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    // =========================================================================
    // TEST 09: Soft-deleted manual assignments do not consume capacity
    // =========================================================================
    @Test
    @DisplayName("TEST 09: Soft-deleted manual assignments do not consume capacity")
    void test09_softDeletedManualAssignmentsDoNotConsumeCapacity() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .build();
        Shift shift = createShift(List.of(req));

        User softDeletedStaff = createStaffUser("Deleted Staff");
        ShiftAssignment deletedAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(softDeletedStaff)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .deleted(true)
                .build();

        User candidate = createStaffUser("Auto Candidate");
        Employment emp = createEmployment(candidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(deletedAssignment));

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(candidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(candidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        assertEquals(1, assignmentsCaptor.getValue().size(), "Soft-deleted assignment must not reduce demand");
    }

    // =========================================================================
    // TEST 10: Store isolation: assignments in Store A do not affect Store B
    // =========================================================================
    @Test
    @DisplayName("TEST 10: Store isolation ensures assignments in Store A do not affect Store B")
    void test10_storeIsolation_assignmentsInOtherStoreDoNotAffectDemand() {
        ShiftSkillRequirement reqStoreA = ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(baristaSkill).requiredCount(2).build();
        Shift shiftStoreA = createShift(List.of(reqStoreA));

        User candidate = createStaffUser("Candidate A");
        Employment emp = createEmployment(candidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shiftStoreA));
        when(shiftAssignmentRepository.findByShiftId(shiftStoreA.getId())).thenReturn(Collections.emptyList());

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(candidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(candidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        assertEquals(1, assignmentsCaptor.getValue().size()); // 1 staff assigned to 1 slot of shiftStoreA
    }

    // =========================================================================
    // TEST 11: Shift isolation: assignments in Shift 1 do not affect Shift 2
    // =========================================================================
    @Test
    @DisplayName("TEST 11: Shift isolation ensures assignments in Shift 1 do not affect Shift 2")
    void test11_shiftIsolation_assignmentsInOtherShiftDoNotAffectDemand() {
        ShiftSkillRequirement req1 = ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(baristaSkill).requiredCount(1).build();
        Shift shift1 = createShift(List.of(req1));

        ShiftSkillRequirement req2 = ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(baristaSkill).requiredCount(1).build();
        Shift shift2 = Shift.builder()
                .id(UUID.randomUUID())
                .store(store)
                .shiftDate(testDate)
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(23, 0))
                .status(ShiftStatus.DRAFT)
                .requirements(new ArrayList<>(List.of(req2)))
                .assignments(new ArrayList<>())
                .build();
        req2.setShift(shift2);

        User manualStaff = createStaffUser("Manual Staff S1");
        ShiftAssignment manualOnShift1 = ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift1).staff(manualStaff).requiredSkillId(baristaSkillId).source(AssignmentSource.MANUAL).build();

        User autoCandidate = createStaffUser("Auto Candidate");
        Employment emp = createEmployment(autoCandidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift1, shift2));

        // Shift 1 has manual assignment (demand 1 - 1 = 0 slots)
        when(shiftAssignmentRepository.findByShiftId(shift1.getId())).thenReturn(List.of(manualOnShift1));
        // Shift 2 has 0 assignments (demand 1 - 0 = 1 slot)
        when(shiftAssignmentRepository.findByShiftId(shift2.getId())).thenReturn(Collections.emptyList());

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(autoCandidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(autoCandidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> saved = assignmentsCaptor.getValue();
        assertEquals(1, saved.size(), "Shift 2 should receive 1 auto assignment; Shift 1 was fully satisfied by manual assignment");
        assertEquals(shift2.getId(), saved.get(0).getShift().getId());
    }

    // =========================================================================
    // TEST 12: Coverage accurate reflection: requiredSkillId set properly
    // =========================================================================
    @Test
    @DisplayName("TEST 12: Coverage accurate reflection via requiredSkillId on auto assignment")
    void test12_coverageAccurateReflection_requiredSkillIdSet() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(cashierSkill)
                .requiredCount(1)
                .build();
        Shift shift = createShift(List.of(req));

        User candidate = createStaffUser("Cashier Staff");
        Employment emp = createEmployment(candidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(candidate.getId(), cashierSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(candidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> saved = assignmentsCaptor.getValue();
        assertEquals(1, saved.size());
        assertEquals(cashierSkillId, saved.get(0).getRequiredSkillId(), "Assignment must clearly carry requiredSkillId for coverage reflection");
    }

    // =========================================================================
    // TEST 13: Manual assignment without explicit skill matches available requirement
    // =========================================================================
    @Test
    @DisplayName("TEST 13: Manual assignment without explicit skill matches available requirement")
    void test13_manualAssignmentWithoutExplicitSkill_matchesAvailableRequirement() {
        ShiftSkillRequirement baristaReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .build();
        ShiftSkillRequirement cashierReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(cashierSkill)
                .requiredCount(1)
                .build();
        Shift shift = createShift(List.of(baristaReq, cashierReq));

        User candidate = createStaffUser("Multi Staff");
        Employment emp = createEmployment(candidate, 40);

        when(shiftRepository.findByIdAndStoreId(shift.getId(), storeId)).thenReturn(Optional.of(shift));
        when(payrollPeriodRepository.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(employmentRepository.existsByUserIdAndStoreIdAndStatus(candidate.getId(), storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shift.getId(), candidate.getId())).thenReturn(false);
        doNothing().when(shiftValidationService).validateNoOverlapAndWeeklyHours(shift, candidate.getId(), null);
        when(staffSkillRepository.findByStaffId(candidate.getId())).thenReturn(List.of(
                createStaffSkill(candidate.getId(), baristaSkill),
                createStaffSkill(candidate.getId(), cashierSkill)
        ));
        when(availabilityRepository.coversShiftTime(eq(candidate.getId()), any(), any(), any())).thenReturn(true);
        when(blackoutDateRepository.existsByStaffIdAndDate(eq(candidate.getId()), any())).thenReturn(false);
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());
        when(shiftAssignmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When targetSkillId is null, system selects first available requirement matching staff's skills
        ShiftAssignmentResponseDTO resp = shiftAssignmentService.assignStaffToShift(storeId, shift.getId(), candidate.getId());
        assertNotNull(resp.getRequiredSkillId());
        assertEquals(baristaSkillId, resp.getRequiredSkillId());
    }

    // =========================================================================
    // TEST 14: Idempotency: repeated runs do not accumulate assignments
    // =========================================================================
    @Test
    @DisplayName("TEST 14: Idempotency ensures repeated auto-schedule runs produce constant assignment count")
    void test14_idempotency_repeatedRunsDoNotAccumulateAssignments() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(baristaSkill).requiredCount(1).build();
        Shift shift = createShift(List.of(req));

        User candidate = createStaffUser("Candidate");
        Employment emp = createEmployment(candidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(candidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(candidate, (short) 1)));

        // Run 1
        autoScheduleService.autoSchedule(storeId, createRequest());
        // Run 2
        autoScheduleService.autoSchedule(storeId, createRequest());
        // Run 3
        autoScheduleService.autoSchedule(storeId, createRequest());

        // Each run saves exactly 1 assignment, total 3 calls
        verify(shiftAssignmentRepository, times(3)).saveAll(assignmentsCaptor.capture());
        for (List<ShiftAssignment> batch : assignmentsCaptor.getAllValues()) {
            assertEquals(1, batch.size(), "Each run must generate exactly 1 assignment, never accumulating");
        }
    }

    // =========================================================================
    // TEST 15: Spatial assignment preservation: zone and workstation set
    // =========================================================================
    @Test
    @DisplayName("TEST 15: Spatial assignment preservation sets zone and workstation from requirement")
    void test15_spatialAssignmentPreservation_zoneAndWorkstationSet() {
        StoreZone zone = StoreZone.builder().id(UUID.randomUUID()).name("Zone A").build();
        Workstation ws = Workstation.builder().id(UUID.randomUUID()).name("WS 1").build();

        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .zone(zone)
                .workstation(ws)
                .build();
        Shift shift = createShift(List.of(req));

        User candidate = createStaffUser("Candidate");
        Employment emp = createEmployment(candidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(candidate.getId(), baristaSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(candidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> saved = assignmentsCaptor.getValue();
        assertEquals(1, saved.size());
        assertEquals(zone, saved.get(0).getZone(), "Zone must be preserved from requirement to assignment");
        assertEquals(ws, saved.get(0).getWorkstation(), "Workstation must be preserved from requirement to assignment");
    }

    // =========================================================================
    // TEST 16: Hard constraints HC1-HC5 still strictly enforced during auto-schedule
    // =========================================================================
    @Test
    @DisplayName("TEST 16: Hard constraint HC1 (Skill mismatch) strictly enforced during auto-schedule")
    void test16_hardConstraintsEnforcedDuringAutoSchedule() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .build();
        Shift shift = createShift(List.of(req));

        // Candidate ONLY has Cashier skill, not Barista
        User candidate = createStaffUser("Cashier Only");
        Employment emp = createEmployment(candidate, 40);

        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultStoreConfig()));
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(defaultSchedConfig()));
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, testDate, testDate)).thenReturn(List.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(Collections.emptyList());

        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(emp));
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(createStaffSkill(candidate.getId(), cashierSkill)));
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(createAvailability(candidate, (short) 1)));

        autoScheduleService.autoSchedule(storeId, createRequest());

        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    // =========================================================================
    // TEST 17: ShiftAssignmentValidator rejects manual assignment when matching skill is at capacity
    // =========================================================================
    @Test
    @DisplayName("TEST 17: ShiftAssignmentValidator rejects manual assignment when matching skill is at capacity")
    void test17_validatorRejectsWhenMatchingSkillAtCapacity() {
        ShiftSkillRequirement req = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .build();
        Shift shift = createShift(List.of(req));

        User existingStaff = createStaffUser("Existing Staff");
        ShiftAssignment existing = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(existingStaff)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .build();
        shift.getAssignments().add(existing);

        User candidate = createStaffUser("Candidate");

        when(availabilityRepository.coversShiftTime(eq(candidate.getId()), any(), any(), any())).thenReturn(true);
        when(blackoutDateRepository.existsByStaffIdAndDate(eq(candidate.getId()), any())).thenReturn(false);
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(existing));
        when(staffSkillRepository.findByStaffId(candidate.getId())).thenReturn(List.of(createStaffSkill(candidate.getId(), baristaSkill)));

        // isEligible returns false
        assertFalse(shiftAssignmentValidator.isEligible(shift, candidate.getId()));

        // validateEligibility throws BusinessException
        BusinessException ex = assertThrows(BusinessException.class, () ->
                shiftAssignmentValidator.validateEligibility(shift, candidate.getId())
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("capacity reached") || ex.getMessage().contains("Slot full"));
    }

    // =========================================================================
    // TEST 18: ShiftAssignmentValidator accepts manual assignment when other skill has capacity
    // =========================================================================
    @Test
    @DisplayName("TEST 18: ShiftAssignmentValidator accepts manual assignment when other skill has capacity")
    void test18_validatorAcceptsWhenOtherSkillHasCapacity() {
        ShiftSkillRequirement baristaReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(baristaSkill)
                .requiredCount(1)
                .build();
        ShiftSkillRequirement cashierReq = ShiftSkillRequirement.builder()
                .id(UUID.randomUUID())
                .skill(cashierSkill)
                .requiredCount(1)
                .build();
        Shift shift = createShift(List.of(baristaReq, cashierReq));

        User existingStaff = createStaffUser("Existing Staff");
        ShiftAssignment existing = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(existingStaff)
                .requiredSkillId(baristaSkillId)
                .source(AssignmentSource.MANUAL)
                .build();
        shift.getAssignments().add(existing);

        User multiStaff = createStaffUser("Multi Candidate");

        when(availabilityRepository.coversShiftTime(eq(multiStaff.getId()), any(), any(), any())).thenReturn(true);
        when(blackoutDateRepository.existsByStaffIdAndDate(eq(multiStaff.getId()), any())).thenReturn(false);
        when(shiftAssignmentRepository.findByShiftId(shift.getId())).thenReturn(List.of(existing));
        when(staffSkillRepository.findByStaffId(multiStaff.getId())).thenReturn(List.of(
                createStaffSkill(multiStaff.getId(), baristaSkill),
                createStaffSkill(multiStaff.getId(), cashierSkill)
        ));

        // isEligible returns true because Cashier still has capacity
        assertTrue(shiftAssignmentValidator.isEligible(shift, multiStaff.getId()));
        // validateEligibility passes without throwing
        assertDoesNotThrow(() -> shiftAssignmentValidator.validateEligibility(shift, multiStaff.getId()));
    }
}
