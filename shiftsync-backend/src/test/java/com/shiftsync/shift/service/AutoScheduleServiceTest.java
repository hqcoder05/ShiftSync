package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.entity.BlackoutDate;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.availability.repository.BlackoutDateRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.enums.EmploymentType;
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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
        User userA = User.builder().id(UUID.randomUUID()).fullName("A").build();
        User userB = User.builder().id(UUID.randomUUID()).fullName("B").build();
        User userC = User.builder().id(UUID.randomUUID()).fullName("C").build(); // Filtered: Exceeds hours
        User userD = User.builder().id(UUID.randomUUID()).fullName("D").build(); // Filtered: Skill missing

        Employment empA = Employment.builder().user(userA).employmentType(EmploymentType.FULL_TIME).build();
        Employment empB = Employment.builder().user(userB).employmentType(EmploymentType.FULL_TIME).build();
        Employment empC = Employment.builder().user(userC).employmentType(EmploymentType.PART_TIME).build(); 
        Employment empD = Employment.builder().user(userD).employmentType(EmploymentType.FULL_TIME).build();
        
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
        // Part-time max = 24. Assign C to 24 hours already in current schedule.
        Shift shiftC = Shift.builder().shiftDate(targetDate.minusDays(1)).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build(); // 24h
        ShiftAssignment assignC = ShiftAssignment.builder().staff(userC).shift(shiftC).build();
        
        // Existing assignment for B to calculate fairness / hour weights (Assigned 8 hours)
        Shift shiftB = Shift.builder().shiftDate(targetDate.minusDays(2)).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(8, 0)).build();
        ShiftAssignment assignB = ShiftAssignment.builder().staff(userB).shift(shiftB).build();
        
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(targetDate), eq(targetDate)))
                .thenReturn(List.of(assignC, assignB));
                
        LocalDate monthStart = targetDate.withDayOfMonth(1);
        LocalDate monthEnd = targetDate.withDayOfMonth(targetDate.lengthOfMonth());
        when(shiftAssignmentRepository.findByStaffIdInAndShift_ShiftDateBetween(anyList(), eq(monthStart), eq(monthEnd)))
                .thenReturn(List.of(assignC, assignB));

        // Act
        service.autoSchedule(storeId, request);
        
        // Assert
        ArgumentCaptor<List<ShiftAssignment>> assignmentsCaptor = ArgumentCaptor.forClass(List.class);
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
    void testGetAvailabilityScore_AvailabilityLimitation() {
        AutoScheduleService.StaffData empData = new AutoScheduleService.StaffData();
        Shift shift = Shift.builder().shiftDate(LocalDate.now()).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).build();
        
        double score = service.getAvailabilityScore(empData, shift);
        
        // LIMITATION-Availability-Score: Score is hardcoded to 1.0
        assertEquals(1.0, score, "Limitation: Availability score must always be 1.0 currently. If you changed the logic, update this test!");
    }
}
