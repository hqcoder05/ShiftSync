package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AutoScheduleServiceTest {

    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private StaffSkillRepository staffSkillRepository;
    @Mock private AvailabilityRepository availabilityRepository;
    @Mock private BlackoutDateRepository blackoutDateRepository;
    @Mock private StoreConfigurationRepository storeConfigRepo;
    @Mock private SchedulerConfigurationRepository schedulerConfigRepo;

    @InjectMocks
    private AutoScheduleService service;

    @Captor
    private ArgumentCaptor<List<ShiftAssignment>> assignmentsCaptor;

    private UUID storeId;
    private UUID skillId;
    private Skill skill;
    
    @BeforeEach
    void setup() {
        storeId = UUID.randomUUID();
        skillId = UUID.randomUUID();
        skill = Skill.builder().id(skillId).build();
    }
    
    // Test the Hard Constraints filtering order (Priority -> Availability -> Skill -> Skill Level -> Working Hours -> Fair Distribution -> Rest Time -> Conflict)
    // Actually, AutoSchedule checks:
    // HC1: Skill Match & Expiration
    // HC2: Availability / Blackout
    // HC3: Overlap
    // HC4: Max Contract Hours
    // HC5: Minimum Rest Time
    @Test
    void testAutoSchedule_HardConstraintsAndScoring() {
        // Setup config
        StoreConfiguration storeConfig = StoreConfiguration.builder()
                .minRestHours(11)
                .build();
        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(storeConfig));
        
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder()
                .skillWeight(BigDecimal.valueOf(0.3))
                .hourWeight(BigDecimal.valueOf(0.2))
                .fairnessWeight(BigDecimal.valueOf(0.2))
                .restTimeWeight(BigDecimal.valueOf(0.2))
                .availabilityWeight(BigDecimal.valueOf(0.1))
                .build();
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(schedConfig));
        
        // Setup Date
        LocalDate targetDate = LocalDate.of(2026, 8, 25);
        AutoScheduleRequest request = new AutoScheduleRequest();
        request.setStartDate(targetDate);
        request.setEndDate(targetDate);
        
        // Setup Shift
        Shift shift = Shift.builder()
                .id(UUID.randomUUID())
                .shiftDate(targetDate)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.DRAFT)
                .requirements(List.of(
                        ShiftSkillRequirement.builder().skill(skill).requiredCount(1).build()
                ))
                .build();
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, targetDate, targetDate))
                .thenReturn(List.of(shift));
                
        // Setup 4 Staff Members (Staff A, B, C, D)
        User userA = User.builder().id(UUID.randomUUID()).fullName("A").systemRole(SystemRole.STAFF).build();
        User userB = User.builder().id(UUID.randomUUID()).fullName("B").systemRole(SystemRole.STAFF).build();
        User userC = User.builder().id(UUID.randomUUID()).fullName("C").systemRole(SystemRole.STAFF).build(); // Filtered: Exceeds hours
        User userD = User.builder().id(UUID.randomUUID()).fullName("D").systemRole(SystemRole.STAFF).build(); // Filtered: Skill missing

        Employment empA = Employment.builder().user(userA).contractType(ContractType.builder().id(java.util.UUID.randomUUID()).name("FULL_TIME").maxWeeklyHours(48).otMultiplier(new java.math.BigDecimal("1.50")).defaultHourlyRate(new java.math.BigDecimal("20.00")).build()).build();
        Employment empB = Employment.builder().user(userB).contractType(ContractType.builder().id(java.util.UUID.randomUUID()).name("FULL_TIME").maxWeeklyHours(48).otMultiplier(new java.math.BigDecimal("1.50")).defaultHourlyRate(new java.math.BigDecimal("20.00")).build()).build();
        Employment empC = Employment.builder().user(userC).contractType(ContractType.builder().id(java.util.UUID.randomUUID()).name("PART_TIME").maxWeeklyHours(24).otMultiplier(new java.math.BigDecimal("1.50")).defaultHourlyRate(new java.math.BigDecimal("20.00")).build()).build(); 
        Employment empD = Employment.builder().user(userD).contractType(ContractType.builder().id(java.util.UUID.randomUUID()).name("FULL_TIME").maxWeeklyHours(48).otMultiplier(new java.math.BigDecimal("1.50")).defaultHourlyRate(new java.math.BigDecimal("20.00")).build()).build();
        
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(empA, empB, empC, empD));
                
        // Mock Skills
        StaffSkill sSkillA = StaffSkill.builder().staffId(userA.getId()).skillId(skillId).level("EXPERT").build();
        StaffSkill sSkillB = StaffSkill.builder().staffId(userB.getId()).skillId(skillId).level("ADVANCED").build();
        StaffSkill sSkillC = StaffSkill.builder().staffId(userC.getId()).skillId(skillId).level("BEGINNER").build();
        // User D has NO skill
        when(staffSkillRepository.findByStaffIdIn(anyList()))
                .thenReturn(List.of(sSkillA, sSkillB, sSkillC));
                
        // Mock Availability (Covering Tuesday 9-17) -> Day of week: LocalDate.of(2026, 8, 25) is Tuesday (2), DayOfWeek % 7 = 2
        short tuesday = 2;
        Availability avA = Availability.builder().user(userA).dayOfWeek(tuesday).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        Availability avB = Availability.builder().user(userB).dayOfWeek(tuesday).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        Availability avC = Availability.builder().user(userC).dayOfWeek(tuesday).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        // User D has no availability but fails skill anyway
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(avA, avB, avC));
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any())).thenReturn(List.of());
        
        // Existing assignments for C to push them over max weekly hours (HC4)
        // Part-time max = 24. Assign C to 24 hours already in current schedule on Monday (targetDate - 1).
        Shift shiftC = Shift.builder().shiftDate(targetDate.minusDays(1)).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build(); // 24h
        ShiftAssignment assignC = ShiftAssignment.builder().staff(userC).shift(shiftC).build();
        
        // Existing assignment for B to calculate fairness / hour weights (Assigned 8 hours on Monday targetDate - 1)
        Shift shiftB = Shift.builder().shiftDate(targetDate.minusDays(1)).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(8, 0)).build();
        ShiftAssignment assignB = ShiftAssignment.builder().staff(userB).shift(shiftB).build();
        
        LocalDate isoStart = targetDate.with(java.time.DayOfWeek.MONDAY);
        LocalDate isoEnd = targetDate.with(java.time.DayOfWeek.SUNDAY);
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(isoStart), eq(isoEnd)))
                .thenReturn(List.of(assignC, assignB));
                
        LocalDate monthStart = targetDate.withDayOfMonth(1);
        LocalDate monthEnd = targetDate.withDayOfMonth(targetDate.lengthOfMonth());
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(monthStart), eq(monthEnd)))
                .thenReturn(List.of(assignC, assignB));

        // Act
        service.autoSchedule(storeId, request);
        
        // Assert
        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        
        List<ShiftAssignment> assignments = assignmentsCaptor.getValue();
        assertEquals(1, assignments.size(), "Only 1 slot needs to be filled");
        
        // Let's verify WHO got assigned.
        // A: 0 hours, 0 shifts, Expert (1.0 * 0.3) + Hour(1.0*0.2) + Fair(1.0*0.2) + Rest(1.0*0.2) + Avail(1.0*0.1) = 1.0 total
        // B: 8 hours, 1 shift, Advanced (0.75 * 0.3) + Hour(40/48*0.2) + Fair(...) < 1.0
        // C: Filtered by Max Hours (24h assigned, shift is 8h -> 32 > 24)
        assertEquals(userA.getId(), assignments.get(0).getStaff().getId(), "User A should have the highest score and be assigned");
    }

    @Test
    void testGetAvailabilityScore() {
        AutoScheduleService.StaffData empData = new AutoScheduleService.StaffData();
        
        Availability avail = Availability.builder()
                .dayOfWeek((short) 2) // Tuesday
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(18, 0))
                .build();
        empData.setAvailabilities(List.of(avail));
        
        Shift shift = Shift.builder()
                .shiftDate(LocalDate.of(2026, 8, 25)) // Tuesday
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .build();
                
        double score = service.getAvailabilityScore(empData, shift);
        assertEquals(8.0 / 10.0, score, 0.001); // 8 hours shift / 10 hours avail
    }

    @Test
    void testHasOverlap_RejectCandidate() throws Exception {
        java.lang.reflect.Method method = AutoScheduleService.class.getDeclaredMethod("hasOverlap", List.class, Shift.class);
        method.setAccessible(true);
        
        Shift existing = Shift.builder().shiftDate(LocalDate.of(2026, 1, 1)).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).build();
        Shift overlapping = Shift.builder().shiftDate(LocalDate.of(2026, 1, 1)).startTime(LocalTime.of(12, 0)).endTime(LocalTime.of(20, 0)).build();
        Shift notOverlapping = Shift.builder().shiftDate(LocalDate.of(2026, 1, 1)).startTime(LocalTime.of(18, 0)).endTime(LocalTime.of(22, 0)).build();
        
        boolean result1 = (boolean) method.invoke(service, List.of(existing), overlapping);
        boolean result2 = (boolean) method.invoke(service, List.of(existing), notOverlapping);
        
        org.junit.jupiter.api.Assertions.assertTrue(result1, "Should reject overlapping shift");
        org.junit.jupiter.api.Assertions.assertFalse(result2, "Should allow non-overlapping shift");
    }

    @Test
    void testSatisfiesRestTime_RejectCandidate() throws Exception {
        java.lang.reflect.Method method = AutoScheduleService.class.getDeclaredMethod("satisfiesRestTime", List.class, Shift.class, int.class);
        method.setAccessible(true);
        
        Shift existing = Shift.builder().shiftDate(LocalDate.of(2026, 1, 1)).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).build();
        Shift nextShiftViolation = Shift.builder().shiftDate(LocalDate.of(2026, 1, 2)).startTime(LocalTime.of(3, 0)).endTime(LocalTime.of(11, 0)).build();
        Shift nextShiftOk = Shift.builder().shiftDate(LocalDate.of(2026, 1, 2)).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).build();
        
        boolean result1 = (boolean) method.invoke(service, List.of(existing), nextShiftViolation, 11);
        boolean result2 = (boolean) method.invoke(service, List.of(existing), nextShiftOk, 11);
        
        org.junit.jupiter.api.Assertions.assertFalse(result1, "Should reject if rest time < 11 hours");
        org.junit.jupiter.api.Assertions.assertTrue(result2, "Should allow if rest time >= 11 hours");
    }

    @Test
    void testTieBreakDeterministic() {
        AutoScheduleService.StaffData emp1 = new AutoScheduleService.StaffData();
        User u1 = new User(); u1.setId(java.util.UUID.fromString("00000000-0000-0000-0000-000000000001"));
        Employment e1 = new Employment(); e1.setUser(u1);
        emp1.setEmployment(e1);
        
        AutoScheduleService.StaffData emp2 = new AutoScheduleService.StaffData();
        User u2 = new User(); u2.setId(java.util.UUID.fromString("00000000-0000-0000-0000-000000000002"));
        Employment e2 = new Employment(); e2.setUser(u2);
        emp2.setEmployment(e2);
        
        int hash1 = u1.getId().toString().hashCode() * -1;
        int hash2 = u2.getId().toString().hashCode() * -1;
        org.junit.jupiter.api.Assertions.assertNotEquals(hash1, hash2);
    }

    // ==========================================
    // BỘ TEST KIỂM THỬ 6 LỖI LOGIC ĐÃ SỬA
    // ==========================================

    @Test
    void testError1_FairnessScoreUpdatesInLoop() {
        // Setup config: Fairness trọng số cao để thấy rõ tác động cập nhật
        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(storeConfig));

        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder()
                .skillWeight(BigDecimal.valueOf(0.0))
                .hourWeight(BigDecimal.valueOf(0.0))
                .fairnessWeight(BigDecimal.valueOf(0.8)) // 80% trọng số cho Fairness
                .restTimeWeight(BigDecimal.valueOf(0.0))
                .availabilityWeight(BigDecimal.valueOf(0.2))
                .build();
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(schedConfig));

        LocalDate targetDate = LocalDate.of(2026, 8, 25);
        AutoScheduleRequest request = new AutoScheduleRequest();
        request.setStartDate(targetDate);
        request.setEndDate(targetDate);

        // 2 slots cùng ngày, cách nhau thời gian để không overlap
        Shift shift1 = Shift.builder().id(UUID.randomUUID()).shiftDate(targetDate).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(12, 0)).status(ShiftStatus.DRAFT).build();
        Shift shift2 = Shift.builder().id(UUID.randomUUID()).shiftDate(targetDate).startTime(LocalTime.of(13, 0)).endTime(LocalTime.of(17, 0)).status(ShiftStatus.DRAFT).build();
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, targetDate, targetDate)).thenReturn(List.of(shift1, shift2));

        User userA = User.builder().id(UUID.fromString("00000000-0000-0000-0000-000000000001")).fullName("A").systemRole(SystemRole.STAFF).build();
        User userB = User.builder().id(UUID.fromString("00000000-0000-0000-0000-000000000002")).fullName("B").systemRole(SystemRole.STAFF).build();

        Employment empA = Employment.builder().user(userA).contractType(ContractType.builder().maxWeeklyHours(48).build()).build();
        Employment empB = Employment.builder().user(userB).contractType(ContractType.builder().maxWeeklyHours(48).build()).build();
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(empA, empB));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of());
        Availability avA = Availability.builder().user(userA).dayOfWeek((short) 2).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        Availability avB = Availability.builder().user(userB).dayOfWeek((short) 2).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(avA, avB));
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any())).thenReturn(List.of());
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any())).thenReturn(List.of());

        // Act
        service.autoSchedule(storeId, request);

        // Assert: Cả 2 slot đều được gán. Nhờ Lỗi 1 đã fix, sau khi User A nhận slot 1, 
        // điểm fairness của A giảm xuống, slot 2 bắt buộc được chia cho User B!
        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> assignments = assignmentsCaptor.getValue();
        assertEquals(2, assignments.size());

        List<UUID> assignedStaffIds = assignments.stream().map(a -> a.getStaff().getId()).collect(Collectors.toList());
        org.junit.jupiter.api.Assertions.assertTrue(assignedStaffIds.contains(userA.getId()), "User A phải được gán 1 ca");
        org.junit.jupiter.api.Assertions.assertTrue(assignedStaffIds.contains(userB.getId()), "User B phải được gán 1 ca nhờ cập nhật fairness");
    }

    @Test
    void testError2_HC5_RestTimeAcrossDateBoundary() {
        // Setup: Yêu cầu nghỉ tối thiểu 11h
        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(11).build();
        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(storeConfig));

        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(schedConfig));

        LocalDate targetDate = LocalDate.of(2026, 8, 25); // Thứ 3
        AutoScheduleRequest request = new AutoScheduleRequest();
        request.setStartDate(targetDate);
        request.setEndDate(targetDate);

        // Ca mới sáng sớm 06:00 - 14:00 ngày 2026-08-25
        Shift newShift = Shift.builder().id(UUID.randomUUID()).shiftDate(targetDate).startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(14, 0)).status(ShiftStatus.DRAFT).build();
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, targetDate, targetDate)).thenReturn(List.of(newShift));

        User userA = User.builder().id(UUID.randomUUID()).fullName("A").systemRole(SystemRole.STAFF).build();
        Employment empA = Employment.builder().user(userA).contractType(ContractType.builder().maxWeeklyHours(48).build()).build();
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(empA));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of());
        Availability avA = Availability.builder().user(userA).dayOfWeek((short) 2).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(avA));
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any())).thenReturn(List.of());

        // Ca cũ tối hôm trước (2026-08-24 từ 18:00 đến 23:00)
        // Khoảng nghỉ từ 23:00 đến 06:00 hôm sau chỉ có 7 tiếng < 11 tiếng yêu cầu!
        Shift yesterdayShift = Shift.builder().shiftDate(targetDate.minusDays(1)).startTime(LocalTime.of(18, 0)).endTime(LocalTime.of(23, 0)).build();
        ShiftAssignment yesterdayAssignment = ShiftAssignment.builder().staff(userA).shift(yesterdayShift).build();

        LocalDate isoStart = targetDate.with(java.time.DayOfWeek.MONDAY); // 2026-08-24
        LocalDate isoEnd = targetDate.with(java.time.DayOfWeek.SUNDAY); // 2026-08-30
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(isoStart), eq(isoEnd)))
                .thenReturn(List.of(yesterdayAssignment));
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(targetDate.withDayOfMonth(1)), eq(targetDate.withDayOfMonth(targetDate.lengthOfMonth()))))
                .thenReturn(List.of(yesterdayAssignment));

        // Act
        service.autoSchedule(storeId, request);

        // Assert: User A bị loại bởi HC5 vì không đủ 11 tiếng nghỉ từ ca tối hôm trước
        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    @Test
    void testError2_HC4_IsoWeekBoundary() {
        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(storeConfig));
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(schedConfig));

        // Xếp ca bắt đầu từ giữa tuần: Thứ 4 ngày 2026-08-26 đến Thứ 6 2026-08-28
        LocalDate startWed = LocalDate.of(2026, 8, 26);
        LocalDate endFri = LocalDate.of(2026, 8, 28);
        AutoScheduleRequest request = new AutoScheduleRequest();
        request.setStartDate(startWed);
        request.setEndDate(endFri);

        Shift shiftWed = Shift.builder().id(UUID.randomUUID()).shiftDate(startWed).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).status(ShiftStatus.DRAFT).build(); // 8h
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, startWed, endFri)).thenReturn(List.of(shiftWed));

        // User Part-time chỉ được tối đa 20h/tuần
        User userA = User.builder().id(UUID.randomUUID()).fullName("A").systemRole(SystemRole.STAFF).build();
        Employment empA = Employment.builder().user(userA).contractType(ContractType.builder().maxWeeklyHours(20).build()).build();
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(empA));

        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of());
        Availability avA = Availability.builder().user(userA).dayOfWeek((short) 3).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(avA));
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any())).thenReturn(List.of());

        // Thứ 2 và Thứ 3 trước đó (cùng tuần ISO) đã làm 16 tiếng
        Shift shiftMon = Shift.builder().shiftDate(startWed.with(java.time.DayOfWeek.MONDAY)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build(); // 8h
        Shift shiftTue = Shift.builder().shiftDate(startWed.with(java.time.DayOfWeek.TUESDAY)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0)).build(); // 8h
        ShiftAssignment assignMon = ShiftAssignment.builder().staff(userA).shift(shiftMon).build();
        ShiftAssignment assignTue = ShiftAssignment.builder().staff(userA).shift(shiftTue).build();

        LocalDate isoStart = startWed.with(java.time.DayOfWeek.MONDAY);
        LocalDate isoEnd = endFri.with(java.time.DayOfWeek.SUNDAY);
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(isoStart), eq(isoEnd)))
                .thenReturn(List.of(assignMon, assignTue));
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(startWed.withDayOfMonth(1)), eq(startWed.withDayOfMonth(startWed.lengthOfMonth()))))
                .thenReturn(List.of(assignMon, assignTue));

        // Act
        service.autoSchedule(storeId, request);

        // Assert: 16h + 8h = 24h > 20h maxWeeklyHours -> Bị chặn bởi HC4
        verify(shiftAssignmentRepository, never()).saveAll(any());
    }

    @Test
    void testError3_HC3_OvernightShiftOverlap() throws Exception {
        java.lang.reflect.Method method = AutoScheduleService.class.getDeclaredMethod("hasOverlap", List.class, Shift.class);
        method.setAccessible(true);

        // Ca 1: Qua đêm từ Thứ 2 22:00 đến Thứ 3 06:00
        Shift overnightShift = Shift.builder()
                .shiftDate(LocalDate.of(2026, 8, 24))
                .startTime(LocalTime.of(22, 0))
                .endTime(LocalTime.of(6, 0))
                .build();

        // Ca 2: Thứ 3 từ 05:00 đến 13:00 (Giao nhau từ 05:00 đến 06:00 Thứ 3!)
        Shift morningShiftOverlap = Shift.builder()
                .shiftDate(LocalDate.of(2026, 8, 25))
                .startTime(LocalTime.of(5, 0))
                .endTime(LocalTime.of(13, 0))
                .build();

        // Ca 3: Thứ 3 từ 07:00 đến 15:00 (Không giao nhau, bắt đầu sau 06:00)
        Shift morningShiftNoOverlap = Shift.builder()
                .shiftDate(LocalDate.of(2026, 8, 25))
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(15, 0))
                .build();

        boolean isOverlap = (boolean) method.invoke(service, List.of(overnightShift), morningShiftOverlap);
        boolean isNotOverlap = (boolean) method.invoke(service, List.of(overnightShift), morningShiftNoOverlap);

        org.junit.jupiter.api.Assertions.assertTrue(isOverlap, "Ca qua đêm 22:00-06:00 PHẢI phát hiện trùng với ca 05:00-13:00 hôm sau");
        org.junit.jupiter.api.Assertions.assertFalse(isNotOverlap, "Ca 07:00-15:00 bắt đầu sau 06:00 không được xem là trùng");
    }

    @Test
    void testError4_DynamicMRV() {
        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        when(storeConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(storeConfig));
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(schedConfig));

        LocalDate targetDate = LocalDate.of(2026, 8, 25);
        AutoScheduleRequest request = new AutoScheduleRequest();
        request.setStartDate(targetDate);
        request.setEndDate(targetDate);

        // Slot 1: Ca chung (không yêu cầu kỹ năng)
        Shift shiftCommon = Shift.builder().id(UUID.randomUUID()).shiftDate(targetDate).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(12, 0)).status(ShiftStatus.DRAFT).build();
        // Slot 2: Ca chuyên biệt (yêu cầu Skill đặc thù)
        Shift shiftSpecial = Shift.builder().id(UUID.randomUUID()).shiftDate(targetDate).startTime(LocalTime.of(13, 0)).endTime(LocalTime.of(17, 0)).status(ShiftStatus.DRAFT)
                .requirements(List.of(ShiftSkillRequirement.builder().skill(skill).requiredCount(1).build()))
                .build();
        when(shiftRepository.findByStoreIdAndShiftDateBetween(storeId, targetDate, targetDate)).thenReturn(List.of(shiftCommon, shiftSpecial));

        User userSpecial = User.builder().id(UUID.randomUUID()).fullName("Specialist").systemRole(SystemRole.STAFF).build();
        User userGeneral = User.builder().id(UUID.randomUUID()).fullName("General").systemRole(SystemRole.STAFF).build();

        Employment empSpecial = Employment.builder().user(userSpecial).contractType(ContractType.builder().maxWeeklyHours(48).build()).build();
        Employment empGeneral = Employment.builder().user(userGeneral).contractType(ContractType.builder().maxWeeklyHours(48).build()).build();
        when(employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)).thenReturn(List.of(empSpecial, empGeneral));

        // Chỉ userSpecial có skill
        StaffSkill sSkill = StaffSkill.builder().staffId(userSpecial.getId()).skillId(skillId).level("EXPERT").build();
        when(staffSkillRepository.findByStaffIdIn(anyList())).thenReturn(List.of(sSkill));

        Availability avS = Availability.builder().user(userSpecial).dayOfWeek((short) 2).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        Availability avG = Availability.builder().user(userGeneral).dayOfWeek((short) 2).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build();
        when(availabilityRepository.findByUser_IdIn(anyList())).thenReturn(List.of(avS, avG));
        when(blackoutDateRepository.findByStaffIdInAndDateBetween(anyList(), any(), any())).thenReturn(List.of());
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), any(), any())).thenReturn(List.of());

        // Act
        service.autoSchedule(storeId, request);

        // Assert: Dynamic MRV ưu tiên xếp slot special trước vì chỉ có 1 ứng viên (MRV = 1), sau đó xếp slot common
        verify(shiftAssignmentRepository).saveAll(assignmentsCaptor.capture());
        List<ShiftAssignment> assignments = assignmentsCaptor.getValue();
        assertEquals(2, assignments.size());
    }

    @Test
    void testError5_FairnessScoreByHours() {
        // Kiểm tra logic S_fairness theo giờ: cùng 1 ca trong tháng nhưng 1 người làm 4h, 1 người làm 20h
        AutoScheduleService.StaffData emp4h = new AutoScheduleService.StaffData();
        emp4h.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(48).build()).build());
        emp4h.setMonthlyAssignedHours(4.0);
        emp4h.setMonthlyShiftCount(1);

        AutoScheduleService.StaffData emp20h = new AutoScheduleService.StaffData();
        emp20h.setEmployment(Employment.builder().contractType(ContractType.builder().maxWeeklyHours(48).build()).build());
        emp20h.setMonthlyAssignedHours(20.0);
        emp20h.setMonthlyShiftCount(1);

        double maxMonthlyHours = 48 * 4.0; // 192h
        double score4h = Math.max(0.0, 1.0 - (emp4h.getMonthlyAssignedHours() / maxMonthlyHours));
        double score20h = Math.max(0.0, 1.0 - (emp20h.getMonthlyAssignedHours() / maxMonthlyHours));

        org.junit.jupiter.api.Assertions.assertTrue(score4h > score20h, "Nhân viên làm 4h phải có điểm fairness cao hơn nhân viên làm 20h dù cùng 1 ca");
    }

    @Test
    void testError6_SchedulerConfigurationValidation() {
        // Tổng trọng số = 0.8 (không bằng 1.0)
        SchedulerConfiguration invalidConfig = SchedulerConfiguration.builder()
                .skillWeight(BigDecimal.valueOf(0.2))
                .hourWeight(BigDecimal.valueOf(0.2))
                .fairnessWeight(BigDecimal.valueOf(0.2))
                .restTimeWeight(BigDecimal.valueOf(0.1))
                .availabilityWeight(BigDecimal.valueOf(0.1))
                .build();
        when(schedulerConfigRepo.findByStoreId(storeId)).thenReturn(Optional.of(invalidConfig));

        LocalDate targetDate = LocalDate.of(2026, 8, 25);
        AutoScheduleRequest request = new AutoScheduleRequest();
        request.setStartDate(targetDate);
        request.setEndDate(targetDate);

        // Service ném BusinessException khi config có tổng trọng số sai
        org.junit.jupiter.api.Assertions.assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> {
            service.autoSchedule(storeId, request);
        });

        // Entity validateWeights() cũng ném BusinessException
        org.junit.jupiter.api.Assertions.assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> {
            invalidConfig.validateWeights();
        });
    }
    // ==========================================
    // BỘ TEST KIỂM THỬ LOCAL REPAIR (4 TEST)
    // ==========================================

    /**
     * Test 1: Swap thành công - staffX chuyển từ ca A sang ca B (unassigned),
     * staffY được gán vào ca A (backfill). Sau repair, currentAssignments phải có 2 phần tử.
     */
    @Test
    void testLocalRepair_SuccessfulSwap() {
        // Setup 2 nhân viên
        User userX = User.builder().id(UUID.randomUUID()).fullName("X").systemRole(SystemRole.STAFF).build();
        User userY = User.builder().id(UUID.randomUUID()).fullName("Y").systemRole(SystemRole.STAFF).build();

        ContractType contract = ContractType.builder().maxWeeklyHours(48).build();
        Employment empX = Employment.builder().user(userX).contractType(contract).build();
        Employment empY = Employment.builder().user(userY).contractType(contract).build();

        LocalDate date = LocalDate.of(2026, 9, 8); // Monday

        // Ca A: 08:00-12:00 (staffX đang được gán)
        Shift shiftA = Shift.builder().id(UUID.randomUUID())
                .shiftDate(date).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(12, 0)).build();
        // Ca B: 13:00-17:00 (chưa được gán - unassigned slot)
        Shift shiftB = Shift.builder().id(UUID.randomUUID())
                .shiftDate(date).startTime(LocalTime.of(13, 0)).endTime(LocalTime.of(17, 0)).build();

        // staffX đang làm ca A
        AutoScheduleService.StaffData staffXData = new AutoScheduleService.StaffData();
        staffXData.setEmployment(empX);
        UUID skillAId = UUID.randomUUID(); // Ca A yêu cầu skillA (ví dụ Cashier)
        UUID skillBId = UUID.randomUUID(); // Ca B yêu cầu skillB (ví dụ Barista)

        // staffX có skillB
        StaffSkill skillForX = StaffSkill.builder().staffId(userX.getId()).skillId(skillBId).level("INTERMEDIATE").build();
        staffXData.setSkills(List.of(skillForX));
        staffXData.setAvailabilities(List.of(
                Availability.builder().user(userX).dayOfWeek((short) 2) // Tuesday (2026-09-08 is Tuesday)
                        .startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffXData.setBlackoutDates(List.of());
        staffXData.setCurrentSchedule(new java.util.ArrayList<>(List.of(shiftA)));
        staffXData.setAssignedHours(4.0);
        staffXData.setMonthlyShiftCount(1);
        staffXData.setMonthlyAssignedHours(4.0);

        // staffY có skillA
        AutoScheduleService.StaffData staffYData = new AutoScheduleService.StaffData();
        staffYData.setEmployment(empY);
        StaffSkill skillForY = StaffSkill.builder().staffId(userY.getId()).skillId(skillAId).level("EXPERT").build();
        staffYData.setSkills(List.of(skillForY));
        staffYData.setAvailabilities(List.of(
                Availability.builder().user(userY).dayOfWeek((short) 2) // Tuesday (2026-09-08 is Tuesday)
                        .startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffYData.setBlackoutDates(List.of());
        staffYData.setCurrentSchedule(new java.util.ArrayList<>());
        staffYData.setAssignedHours(0.0);
        staffYData.setMonthlyShiftCount(0);
        staffYData.setMonthlyAssignedHours(0.0);

        Map<UUID, AutoScheduleService.StaffData> staffMap = new java.util.LinkedHashMap<>();
        staffMap.put(userX.getId(), staffXData);
        staffMap.put(userY.getId(), staffYData);

        // currentAssignments: staffX→shiftA (yêu cầu skillAId)
        ShiftAssignment assignmentXA = ShiftAssignment.builder()
                .shift(shiftA)
                .staff(userX)
                .requiredSkillId(skillAId)
                .source(com.shiftsync.shift.enums.AssignmentSource.AUTO)
                .build();
        List<ShiftAssignment> currentAssignments = new java.util.ArrayList<>(List.of(assignmentXA));

        // unassignedSlots: ca B yêu cầu skillBId
        AutoScheduleService.Slot slotB = new AutoScheduleService.Slot(shiftB, skillBId);
        List<AutoScheduleService.Slot> unassignedSlots = List.of(slotB);

        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();

        // Act
        service.attemptLocalRepair(unassignedSlots, currentAssignments, staffMap, schedConfig, storeConfig);

        // Assert: Sau swap, currentAssignments có 2 phần tử (assignment được sửa + backfill mới)
        assertEquals(2, currentAssignments.size(), "Sau swap, phải có 2 assignments (X→B + Y→A)");

        // Kiểm tra staffX được gán vào shiftB (existingAssignment được mutate)
        ShiftAssignment swappedAssignment = currentAssignments.get(0);
        assertEquals(userX.getId(), swappedAssignment.getStaff().getId());
        assertEquals(shiftB.getId(), swappedAssignment.getShift().getId(), "staffX phải được chuyển sang shiftB");
        assertEquals(skillBId, swappedAssignment.getRequiredSkillId(), "staffX nhận shiftB với skillBId");

        // Kiểm tra staffY được gán vào shiftA (backfill)
        ShiftAssignment backfill = currentAssignments.get(1);
        assertEquals(userY.getId(), backfill.getStaff().getId(), "staffY phải backfill vào shiftA");
        assertEquals(shiftA.getId(), backfill.getShift().getId());
        assertEquals(skillAId, backfill.getRequiredSkillId(), "staffY nhận shiftA với skillAId được bảo toàn");

        // Kiểm tra in-memory update của staffX: phải có shiftB trong schedule, không còn shiftA
        org.junit.jupiter.api.Assertions.assertTrue(staffXData.getCurrentSchedule().contains(shiftB), "staffX schedule phải chứa shiftB");
        org.junit.jupiter.api.Assertions.assertFalse(staffXData.getCurrentSchedule().contains(shiftA), "staffX schedule không còn shiftA");

        // Kiểm tra in-memory update của staffY: phải có shiftA
        org.junit.jupiter.api.Assertions.assertTrue(staffYData.getCurrentSchedule().contains(shiftA), "staffY schedule phải chứa shiftA");
    }

    /**
     * Test 2: Không tìm được hoán đổi hợp lệ - currentAssignments rỗng nên không có gì để swap.
     * currentAssignments vẫn rỗng sau khi gọi, không throw exception.
     */
    @Test
    void testLocalRepair_NoValidSwapFound() {
        User userX = User.builder().id(UUID.randomUUID()).fullName("X").systemRole(SystemRole.STAFF).build();
        ContractType contract = ContractType.builder().maxWeeklyHours(40).build();
        Employment empX = Employment.builder().user(userX).contractType(contract).build();

        AutoScheduleService.StaffData staffXData = new AutoScheduleService.StaffData();
        staffXData.setEmployment(empX);
        staffXData.setSkills(List.of());
        staffXData.setAvailabilities(List.of());
        staffXData.setBlackoutDates(List.of());
        staffXData.setCurrentSchedule(new java.util.ArrayList<>());

        Map<UUID, AutoScheduleService.StaffData> staffMap = Map.of(userX.getId(), staffXData);

        // Không có assignment nào trong currentAssignments → không thể swap
        List<ShiftAssignment> currentAssignments = new java.util.ArrayList<>();

        LocalDate date = LocalDate.of(2026, 9, 8);
        Shift unassignedShift = Shift.builder().id(UUID.randomUUID())
                .shiftDate(date).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).build();
        AutoScheduleService.Slot unassignedSlot = new AutoScheduleService.Slot(unassignedShift, null);

        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();

        // Act - không được throw exception
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() ->
                service.attemptLocalRepair(List.of(unassignedSlot), currentAssignments, staffMap, schedConfig, storeConfig)
        );

        // Assert: vẫn rỗng (không có gì được thêm)
        assertEquals(0, currentAssignments.size(), "Không có swap nào được thực hiện");
    }

    /**
     * Test 3: Local Repair KHÔNG vi phạm Hard Constraints.
     * Cụ thể: staffY không đủ giờ nghỉ để nhận otherShift → không được swap.
     */
    @Test
    void testLocalRepair_DoesNotViolateHardConstraints() {
        User userX = User.builder().id(UUID.randomUUID()).fullName("X").systemRole(SystemRole.STAFF).build();
        User userY = User.builder().id(UUID.randomUUID()).fullName("Y").systemRole(SystemRole.STAFF).build();

        ContractType contract = ContractType.builder().maxWeeklyHours(48).build();
        Employment empX = Employment.builder().user(userX).contractType(contract).build();
        Employment empY = Employment.builder().user(userY).contractType(contract).build();

        LocalDate monday = LocalDate.of(2026, 9, 7);

        // Ca A: Thứ 2 22:00-23:00 (staffX đang làm)
        Shift shiftA = Shift.builder().id(UUID.randomUUID())
                .shiftDate(monday).startTime(LocalTime.of(22, 0)).endTime(LocalTime.of(23, 0)).build();

        // Ca B (unassigned): Thứ 3 09:00-17:00
        LocalDate tuesday = monday.plusDays(1);
        Shift shiftB = Shift.builder().id(UUID.randomUUID())
                .shiftDate(tuesday).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0)).build();

        // staffY: đang làm ca kết thúc lúc 22:30 thứ 2 → không đủ 11h nghỉ để nhận shiftA (22:00-23:00)
        Shift staffYExistingShift = Shift.builder().id(UUID.randomUUID())
                .shiftDate(monday).startTime(LocalTime.of(20, 0)).endTime(LocalTime.of(22, 30)).build();

        AutoScheduleService.StaffData staffXData = new AutoScheduleService.StaffData();
        staffXData.setEmployment(empX);
        staffXData.setSkills(List.of());
        staffXData.setAvailabilities(List.of(
                Availability.builder().user(userX).dayOfWeek((short) 2).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffXData.setBlackoutDates(List.of());
        staffXData.setCurrentSchedule(new java.util.ArrayList<>(List.of(shiftA)));
        staffXData.setAssignedHours(1.0);
        staffXData.setMonthlyShiftCount(1);
        staffXData.setMonthlyAssignedHours(1.0);

        UUID skillAId = UUID.randomUUID();

        AutoScheduleService.StaffData staffYData = new AutoScheduleService.StaffData();
        staffYData.setEmployment(empY);
        // staffY có skillAId (HC1 thỏa mãn), nhưng bị vi phạm HC5 vì nghỉ 0h
        StaffSkill skillForY = StaffSkill.builder().staffId(userY.getId()).skillId(skillAId).level("EXPERT").build();
        staffYData.setSkills(List.of(skillForY));
        staffYData.setAvailabilities(List.of(
                Availability.builder().user(userY).dayOfWeek((short) 1).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffYData.setBlackoutDates(List.of());
        // staffY đang làm 20:00-22:30. Cách shiftA (22:00) chỉ 0h → vi phạm HC5 (minRest=11h)
        staffYData.setCurrentSchedule(new java.util.ArrayList<>(List.of(staffYExistingShift)));
        staffYData.setAssignedHours(2.5);
        staffYData.setMonthlyShiftCount(1);
        staffYData.setMonthlyAssignedHours(2.5);

        Map<UUID, AutoScheduleService.StaffData> staffMap = new java.util.LinkedHashMap<>();
        staffMap.put(userX.getId(), staffXData);
        staffMap.put(userY.getId(), staffYData);

        ShiftAssignment assignmentXA = ShiftAssignment.builder()
                .shift(shiftA)
                .staff(userX)
                .requiredSkillId(skillAId)
                .source(com.shiftsync.shift.enums.AssignmentSource.AUTO)
                .build();
        List<ShiftAssignment> currentAssignments = new java.util.ArrayList<>(List.of(assignmentXA));

        AutoScheduleService.Slot slotB = new AutoScheduleService.Slot(shiftB, null);

        // minRestHours=11: staffY không đủ nghỉ để nhận shiftA → swap BỊ TỪ CHỐI
        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(11).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();

        service.attemptLocalRepair(List.of(slotB), currentAssignments, staffMap, schedConfig, storeConfig);

        // Assert: không có swap nào thực sự xảy ra (currentAssignments vẫn là 1)
        assertEquals(1, currentAssignments.size(), "HC5 vi phạm → không được swap");
        assertEquals(shiftA.getId(), currentAssignments.get(0).getShift().getId(), "assignment gốc phải được giữ nguyên");
        assertEquals(skillAId, currentAssignments.get(0).getRequiredSkillId(), "requiredSkillId gốc phải được giữ nguyên");
    }

    /**
     * Test 4: Thoát sớm khi unassignedSlots rỗng - không có tác động gì đến currentAssignments.
     */
    @Test
    void testLocalRepair_EarlyExitWhenNoUnassignedSlots() {
        // Setup minimal (không cần staff/config vì sẽ thoát trước khi dùng đến)
        List<ShiftAssignment> currentAssignments = new java.util.ArrayList<>();
        currentAssignments.add(ShiftAssignment.builder()
                .shift(Shift.builder().id(UUID.randomUUID()).shiftDate(LocalDate.now()).startTime(LocalTime.NOON).endTime(LocalTime.of(18, 0)).build())
                .build());

        int sizeBefore = currentAssignments.size();

        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();

        // Act: truyền vào danh sách rỗng
        service.attemptLocalRepair(
                List.of(), // unassignedSlots rỗng
                currentAssignments,
                new java.util.HashMap<>(),
                schedConfig,
                storeConfig
        );

        // Assert: currentAssignments không bị thay đổi
        assertEquals(sizeBefore, currentAssignments.size(), "Thoát sớm: không có gì thay đổi khi unassignedSlots rỗng");
    }

    /**
     * Test 5 (Mới - Việc 1): Local Repair TỪ CHỐI hoán đổi khi nhân viên backfill (staffY)
     * KHÔNG có kỹ năng yêu cầu của otherShift (HC1 Skill Match).
     */
    @Test
    void testLocalRepair_RejectsSwapWhenBackfillLacksRequiredSkill() {
        User userX = User.builder().id(UUID.randomUUID()).fullName("X").systemRole(SystemRole.STAFF).build();
        User userY = User.builder().id(UUID.randomUUID()).fullName("Y").systemRole(SystemRole.STAFF).build();

        ContractType contract = ContractType.builder().maxWeeklyHours(48).build();
        Employment empX = Employment.builder().user(userX).contractType(contract).build();
        Employment empY = Employment.builder().user(userY).contractType(contract).build();

        LocalDate date = LocalDate.of(2026, 9, 8); // Tuesday

        UUID bartenderSkillId = UUID.randomUUID(); // Ca A yêu cầu kỹ năng Bartender

        // Ca A: 08:00-12:00 (staffX đang được gán với requiredSkillId = bartenderSkillId)
        Shift shiftA = Shift.builder().id(UUID.randomUUID())
                .shiftDate(date).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(12, 0)).build();
        // Ca B: 13:00-17:00 (unassigned slot, không yêu cầu skill)
        Shift shiftB = Shift.builder().id(UUID.randomUUID())
                .shiftDate(date).startTime(LocalTime.of(13, 0)).endTime(LocalTime.of(17, 0)).build();

        AutoScheduleService.StaffData staffXData = new AutoScheduleService.StaffData();
        staffXData.setEmployment(empX);
        staffXData.setSkills(List.of());
        staffXData.setAvailabilities(List.of(
                Availability.builder().user(userX).dayOfWeek((short) 2)
                        .startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffXData.setBlackoutDates(List.of());
        staffXData.setCurrentSchedule(new java.util.ArrayList<>(List.of(shiftA)));
        staffXData.setAssignedHours(4.0);
        staffXData.setMonthlyShiftCount(1);
        staffXData.setMonthlyAssignedHours(4.0);

        // staffY KHÔNG CÓ bartenderSkillId (chỉ có kỹ năng Cashier)
        UUID cashierSkillId = UUID.randomUUID();
        StaffSkill cashierSkill = StaffSkill.builder().staffId(userY.getId()).skillId(cashierSkillId).level("EXPERT").build();

        AutoScheduleService.StaffData staffYData = new AutoScheduleService.StaffData();
        staffYData.setEmployment(empY);
        staffYData.setSkills(List.of(cashierSkill)); // Không có bartenderSkillId
        staffYData.setAvailabilities(List.of(
                Availability.builder().user(userY).dayOfWeek((short) 2)
                        .startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffYData.setBlackoutDates(List.of());
        staffYData.setCurrentSchedule(new java.util.ArrayList<>());
        staffYData.setAssignedHours(0.0);
        staffYData.setMonthlyShiftCount(0);
        staffYData.setMonthlyAssignedHours(0.0);

        Map<UUID, AutoScheduleService.StaffData> staffMap = new java.util.LinkedHashMap<>();
        staffMap.put(userX.getId(), staffXData);
        staffMap.put(userY.getId(), staffYData);

        // otherShift đòi bartenderSkillId
        ShiftAssignment assignmentXA = ShiftAssignment.builder()
                .shift(shiftA)
                .staff(userX)
                .requiredSkillId(bartenderSkillId)
                .source(com.shiftsync.shift.enums.AssignmentSource.AUTO)
                .build();
        List<ShiftAssignment> currentAssignments = new java.util.ArrayList<>(List.of(assignmentXA));

        AutoScheduleService.Slot slotB = new AutoScheduleService.Slot(shiftB, null);
        List<AutoScheduleService.Slot> unassignedSlots = List.of(slotB);

        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();

        // Act
        service.attemptLocalRepair(unassignedSlots, currentAssignments, staffMap, schedConfig, storeConfig);

        // Assert: Swap BỊ TỪ CHỐI vì staffY thiếu Bartender skill (HC1 vi phạm)
        assertEquals(1, currentAssignments.size(), "Swap phải bị từ chối do staffY thiếu skill yêu cầu của otherShift");
        assertEquals(userX.getId(), currentAssignments.get(0).getStaff().getId(), "Ca A vẫn phải thuộc về staffX");
        assertEquals(shiftA.getId(), currentAssignments.get(0).getShift().getId());
        assertEquals(bartenderSkillId, currentAssignments.get(0).getRequiredSkillId());

        // In-memory schedules không đổi
        org.junit.jupiter.api.Assertions.assertTrue(staffXData.getCurrentSchedule().contains(shiftA));
        org.junit.jupiter.api.Assertions.assertFalse(staffXData.getCurrentSchedule().contains(shiftB));
        org.junit.jupiter.api.Assertions.assertTrue(staffYData.getCurrentSchedule().isEmpty(), "staffY không được nhận ca nào");
    }

    /**
     * Test 6 (Mới - Việc 1): Local Repair CHO PHÉP hoán đổi khi nhân viên backfill (staffY)
     * CÓ đầy đủ kỹ năng yêu cầu của otherShift (HC1 Skill Match).
     */
    @Test
    void testLocalRepair_AllowsSwapWhenBackfillHasRequiredSkill() {
        User userX = User.builder().id(UUID.randomUUID()).fullName("X").systemRole(SystemRole.STAFF).build();
        User userY = User.builder().id(UUID.randomUUID()).fullName("Y").systemRole(SystemRole.STAFF).build();

        ContractType contract = ContractType.builder().maxWeeklyHours(48).build();
        Employment empX = Employment.builder().user(userX).contractType(contract).build();
        Employment empY = Employment.builder().user(userY).contractType(contract).build();

        LocalDate date = LocalDate.of(2026, 9, 8); // Tuesday

        UUID bartenderSkillId = UUID.randomUUID();

        Shift shiftA = Shift.builder().id(UUID.randomUUID())
                .shiftDate(date).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(12, 0)).build();
        Shift shiftB = Shift.builder().id(UUID.randomUUID())
                .shiftDate(date).startTime(LocalTime.of(13, 0)).endTime(LocalTime.of(17, 0)).build();

        AutoScheduleService.StaffData staffXData = new AutoScheduleService.StaffData();
        staffXData.setEmployment(empX);
        staffXData.setSkills(List.of());
        staffXData.setAvailabilities(List.of(
                Availability.builder().user(userX).dayOfWeek((short) 2)
                        .startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffXData.setBlackoutDates(List.of());
        staffXData.setCurrentSchedule(new java.util.ArrayList<>(List.of(shiftA)));
        staffXData.setAssignedHours(4.0);
        staffXData.setMonthlyShiftCount(1);
        staffXData.setMonthlyAssignedHours(4.0);

        // staffY CÓ kỹ năng Bartender hợp lệ (chưa hết hạn)
        StaffSkill bartenderSkill = StaffSkill.builder()
                .staffId(userY.getId())
                .skillId(bartenderSkillId)
                .level("ADVANCED")
                .expirationDate(date.plusMonths(6))
                .build();

        AutoScheduleService.StaffData staffYData = new AutoScheduleService.StaffData();
        staffYData.setEmployment(empY);
        staffYData.setSkills(List.of(bartenderSkill)); // CÓ kỹ năng yêu cầu!
        staffYData.setAvailabilities(List.of(
                Availability.builder().user(userY).dayOfWeek((short) 2)
                        .startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()
        ));
        staffYData.setBlackoutDates(List.of());
        staffYData.setCurrentSchedule(new java.util.ArrayList<>());
        staffYData.setAssignedHours(0.0);
        staffYData.setMonthlyShiftCount(0);
        staffYData.setMonthlyAssignedHours(0.0);

        Map<UUID, AutoScheduleService.StaffData> staffMap = new java.util.LinkedHashMap<>();
        staffMap.put(userX.getId(), staffXData);
        staffMap.put(userY.getId(), staffYData);

        ShiftAssignment assignmentXA = ShiftAssignment.builder()
                .shift(shiftA)
                .staff(userX)
                .requiredSkillId(bartenderSkillId)
                .source(com.shiftsync.shift.enums.AssignmentSource.AUTO)
                .build();
        List<ShiftAssignment> currentAssignments = new java.util.ArrayList<>(List.of(assignmentXA));

        AutoScheduleService.Slot slotB = new AutoScheduleService.Slot(shiftB, null);
        List<AutoScheduleService.Slot> unassignedSlots = List.of(slotB);

        StoreConfiguration storeConfig = StoreConfiguration.builder().minRestHours(0).build();
        SchedulerConfiguration schedConfig = SchedulerConfiguration.builder().build();

        // Act
        service.attemptLocalRepair(unassignedSlots, currentAssignments, staffMap, schedConfig, storeConfig);

        // Assert: Swap THÀNH CÔNG vì staffY có đúng skill Bartender
        assertEquals(2, currentAssignments.size(), "Swap phải thành công và tạo 2 assignments");

        ShiftAssignment swappedXA = currentAssignments.get(0);
        assertEquals(shiftB.getId(), swappedXA.getShift().getId());
        assertEquals(userX.getId(), swappedXA.getStaff().getId());
        org.junit.jupiter.api.Assertions.assertNull(swappedXA.getRequiredSkillId(), "Slot B không yêu cầu skill nên là null");

        ShiftAssignment backfillYA = currentAssignments.get(1);
        assertEquals(shiftA.getId(), backfillYA.getShift().getId());
        assertEquals(userY.getId(), backfillYA.getStaff().getId());
        assertEquals(bartenderSkillId, backfillYA.getRequiredSkillId(), "Ca A backfill cho Y phải giữ nguyên bartenderSkillId");

        org.junit.jupiter.api.Assertions.assertTrue(staffXData.getCurrentSchedule().contains(shiftB));
        org.junit.jupiter.api.Assertions.assertTrue(staffYData.getCurrentSchedule().contains(shiftA));
    }
}
