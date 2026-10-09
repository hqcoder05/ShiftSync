package com.shiftsync;

import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.entity.LeaveBalance;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.leave.repository.LeaveBalanceRepository;
import com.shiftsync.leave.service.LeaveRequestService;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.entity.PayrollPeriod;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.UUID;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
public class ConcurrencyVerificationTest {

    @Autowired
    private LeaveRequestService leaveRequestService;
    
    @Autowired
    private LeaveRequestRepository leaveRequestRepository;
    
    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private PayrollCalculationService payrollCalculationService;

    @Autowired
    private PayrollPeriodRepository payrollPeriodRepository;

    @Test
    public void verifyCon001_LeaveApproveCancelRace() throws InterruptedException {
        // Run multiple iterations to increase race condition hit probability
        int iterations = 10;
        int hitCount = 0;
        
        for (int i = 0; i < iterations; i++) {
            String uuid = UUID.randomUUID().toString();
            // Setup data
            Store store = storeRepository.save(Store.builder().name("Test Store CON-001 " + uuid).build());
            User manager = userRepository.save(User.builder()
                    .fullName("Manager " + i).email("manager_" + uuid + "@test.com")
                    .passwordHash("hash").systemRole(SystemRole.MANAGER).build());
            User staff = userRepository.save(User.builder()
                    .fullName("Staff " + i).email("staff_" + uuid + "@test.com")
                    .passwordHash("hash").systemRole(SystemRole.STAFF).build());
                    
            LeaveBalance balance = leaveBalanceRepository.save(LeaveBalance.builder()
                    .store(store).staff(staff)
                    .year(2026).annualEntitlement(12).usedDays(0).build());
                    
            LeaveRequest request = leaveRequestRepository.save(LeaveRequest.builder()
                    .store(store).staff(staff)
                    .leaveType(LeaveType.ANNUAL).status(LeaveStatus.PENDING)
                    .startDate(LocalDate.now().plusDays(10)).endDate(LocalDate.now().plusDays(11))
                    .reason("Vacation").build());
    
            UUID storeId = store.getId();
            UUID leaveId = request.getId();
            UUID managerId = manager.getId();
            UUID staffId = staff.getId();
    
            // Concurrency execution
            int threads = 2;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch latch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);
    
            executor.submit(() -> {
                try {
                    latch.await();
                    setSecurityContext(managerId, SystemRole.MANAGER);
                    leaveRequestService.approveLeaveRequest(storeId, leaveId, managerId);
                } catch (Exception e) {
                    System.out.println("T1 Ex: " + e.getMessage());
                } finally {
                    doneLatch.countDown();
                }
            });
    
            executor.submit(() -> {
                try {
                    latch.await();
                    setSecurityContext(staffId, SystemRole.STAFF);
                    leaveRequestService.cancelLeaveRequest(storeId, leaveId, staffId);
                } catch (Exception e) {
                    System.out.println("T2 Ex: " + e.getMessage());
                } finally {
                    doneLatch.countDown();
                }
            });
    
            // Trigger race
            latch.countDown();
            doneLatch.await(5, TimeUnit.SECONDS);
            executor.shutdown();
    
            // Verification
            Optional<LeaveRequest> finalRequestOpt = leaveRequestRepository.findById(leaveId);
            LeaveBalance finalBalance = leaveBalanceRepository.findById(balance.getId()).orElseThrow();
            
            System.out.println("It " + i + " -> ReqPresent: " + finalRequestOpt.isPresent() + " Used: " + finalBalance.getUsedDays());
    
            // If request is deleted (not present) BUT usedDays > 0, it means the race condition occurred and balance was lost!
            if (finalRequestOpt.isEmpty() && finalBalance.getUsedDays() > 0) {
                hitCount++;
            }
        }
        
        System.out.println("=== CON-001 RESULT ===");
        System.out.println("Race condition hit rate: " + hitCount + "/" + iterations);
    }
    
    @Test
    public void verifyCon002_PayrollGenerationRace() throws InterruptedException {
        int iterations = 10;
        int hitCount = 0;
        
        for (int i = 0; i < iterations; i++) {
            String uuid = UUID.randomUUID().toString();
            Store store = storeRepository.save(Store.builder().name("Test Store CON-002 " + uuid).build());
            UUID storeId = store.getId();
            LocalDate start = LocalDate.of(2026, 1, 1);
            LocalDate end = LocalDate.of(2026, 1, 31);
            
            int threads = 10;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch latch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);
            
            for (int t = 0; t < threads; t++) {
                executor.submit(() -> {
                    try {
                        latch.await();
                        payrollCalculationService.generatePayroll(storeId, start, end);
                    } catch (Exception e) {
                        System.out.println("CON-002 Ex: " + e.getMessage());
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }
            
            latch.countDown();
            doneLatch.await(5, TimeUnit.SECONDS);
            executor.shutdown();
            
            List<PayrollPeriod> periods = payrollPeriodRepository.findAll();
            long count = periods.stream().filter(p -> p.getStore().getId().equals(storeId)).count();
            
            System.out.println("CON-002 It " + i + " -> Count: " + count);
            if (count > 1) {
                hitCount++;
            }
        }
        
        System.out.println("=== CON-002 RESULT ===");
        System.out.println("Race condition hit rate: " + hitCount + "/" + iterations);
    }

    @Autowired
    private com.shiftsync.shift.service.AutoScheduleService autoScheduleService;
    
    @Autowired
    private com.shiftsync.skill.repository.SkillRepository skillRepository;
    
    @Autowired
    private com.shiftsync.shift.repository.ShiftRepository shiftRepository;
    
    @Autowired
    private com.shiftsync.shift.repository.ShiftAssignmentRepository shiftAssignmentRepository;
    
    @Autowired
    private com.shiftsync.skill.repository.StaffSkillRepository staffSkillRepository;
    
    @Autowired
    private com.shiftsync.employment.repository.EmploymentRepository employmentRepository;
    
    @Autowired
    private com.shiftsync.employment.repository.ContractTypeRepository contractTypeRepository;
    
    @Test
    public void verifyCon003_AutoScheduleRace() throws InterruptedException {
        int iterations = 10;
        int hitCount = 0;
        
        for (int i = 0; i < iterations; i++) {
            String uuid = UUID.randomUUID().toString();
            Store store = storeRepository.save(Store.builder().name("Test Store CON-003 " + uuid).build());
            UUID storeId = store.getId();
            LocalDate weekStart = LocalDate.now().with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY));
            
            // Create a single DRAFT shift requiring 1 staff
            com.shiftsync.shift.entity.Shift shift = shiftRepository.save(com.shiftsync.shift.entity.Shift.builder()
                    .store(store)
                    .shiftDate(weekStart)
                    .startTime(java.time.LocalTime.of(8, 0))
                    .endTime(java.time.LocalTime.of(17, 0))
                    .status(com.shiftsync.shift.enums.ShiftStatus.DRAFT)
                    .availabilityDeadline(java.time.ZonedDateTime.now())
                    .build());
                    
            com.shiftsync.skill.entity.Skill dummySkill = new com.shiftsync.skill.entity.Skill();
            dummySkill.setName("Dummy " + uuid);
            dummySkill.setStore(store);
            dummySkill = skillRepository.save(dummySkill);
            
            // Add requirement for 1 staff
            shift.getRequirements().add(com.shiftsync.shift.entity.ShiftSkillRequirement.builder()
                .shift(shift)
                .skill(dummySkill) // dummy
                .requiredCount(1)
                .build());
            shiftRepository.save(shift);
            
            User staff = userRepository.save(User.builder()
                    .fullName("Staff CON-003 " + i).email("staff_con003_" + uuid + "@test.com")
                    .passwordHash("hash").systemRole(SystemRole.STAFF).build());
                    
            com.shiftsync.employment.entity.ContractType ct = new com.shiftsync.employment.entity.ContractType();
            ct.setStore(store);
            ct.setName("CT " + uuid);
            ct.setMaxWeeklyHours(40);
            ct.setOtMultiplier(java.math.BigDecimal.valueOf(1.5));
            ct.setDefaultHourlyRate(java.math.BigDecimal.valueOf(20.0));
            contractTypeRepository.save(ct);
            
            com.shiftsync.employment.entity.Employment employment = new com.shiftsync.employment.entity.Employment();
            employment.setUser(staff);
            employment.setStore(store);
            employment.setJoinedDate(LocalDate.now().minusYears(1));
            employment.setStatus(com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
            employment.setHourlyRate(java.math.BigDecimal.valueOf(20.0));
            employment.setContractType(ct);
            employmentRepository.save(employment);
            
            staffSkillRepository.save(com.shiftsync.skill.entity.StaffSkill.builder()
                    .staffId(staff.getId())
                    .skillId(dummySkill.getId())
                    .level(com.shiftsync.skill.entity.SkillLevel.BEGINNER)
                    .build());
            
            int threads = 2;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch latch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);
            
            com.shiftsync.shift.dto.AutoScheduleRequest req = new com.shiftsync.shift.dto.AutoScheduleRequest();
            req.setStartDate(weekStart);
            req.setEndDate(weekStart.plusDays(6));
            
            for (int t = 0; t < threads; t++) {
                executor.submit(() -> {
                    try {
                        latch.await();
                        autoScheduleService.autoSchedule(storeId, req);
                    } catch (Exception e) {
                        System.out.println("CON-003 Ex: " + e.getMessage());
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }
            
            latch.countDown();
            doneLatch.await(5, TimeUnit.SECONDS);
            executor.shutdown();
            
            long count = shiftAssignmentRepository.findAll().stream()
                .filter(a -> a.getShift().getId().equals(shift.getId()))
                .count();
                
            System.out.println("CON-003 It " + i + " -> Assigned: " + count);
            // Required count is 1, so if > 1 it means race occurred
            if (count > 1) {
                hitCount++;
            }
        }
        
        System.out.println("=== CON-003 RESULT ===");
        System.out.println("Race condition hit rate: " + hitCount + "/" + iterations);
    }
    
    @Autowired
    private com.shiftsync.shift.service.ShiftSwapService shiftSwapService;

    @Autowired
    private com.shiftsync.shift.repository.ShiftSwapRequestRepository shiftSwapRequestRepository;

    @Test
    public void verifyCon004_ShiftSwapApprovalRace() throws InterruptedException {
        int iterations = 10;
        int hitCount = 0;
        
        for (int i = 0; i < iterations; i++) {
            String uuid = UUID.randomUUID().toString();
            Store store = storeRepository.save(Store.builder().name("Test Store CON-004 " + uuid).build());
            
            User manager = userRepository.save(User.builder()
                    .fullName("Manager CON-004 " + i).email("manager_con004_" + uuid + "@test.com")
                    .passwordHash("hash").systemRole(SystemRole.MANAGER).build());
            
            User staff1 = userRepository.save(User.builder()
                    .fullName("Staff1 " + i).email("staff1_con004_" + uuid + "@test.com")
                    .passwordHash("hash").systemRole(SystemRole.STAFF).build());
                    
            User staff2 = userRepository.save(User.builder()
                    .fullName("Staff2 " + i).email("staff2_con004_" + uuid + "@test.com")
                    .passwordHash("hash").systemRole(SystemRole.STAFF).build());
            
            com.shiftsync.shift.entity.Shift shift = shiftRepository.save(com.shiftsync.shift.entity.Shift.builder()
                    .store(store)
                    .shiftDate(LocalDate.now().plusDays(5))
                    .startTime(java.time.LocalTime.of(8, 0))
                    .endTime(java.time.LocalTime.of(17, 0))
                    .status(com.shiftsync.shift.enums.ShiftStatus.PUBLISHED)
                    .availabilityDeadline(java.time.ZonedDateTime.now())
                    .build());
                    
            com.shiftsync.shift.entity.ShiftAssignment assignment = shiftAssignmentRepository.save(
                    com.shiftsync.shift.entity.ShiftAssignment.builder()
                            .shift(shift).staff(staff1).build());
                            
            com.shiftsync.shift.entity.ShiftSwapRequest swap = shiftSwapRequestRepository.save(
                    com.shiftsync.shift.entity.ShiftSwapRequest.builder()
                            .fromShift(shift).fromStaff(staff1).toStaff(staff2)
                            .status(com.shiftsync.shift.enums.SwapStatus.PENDING)
                            .employeeAccepted(true)
                            .build());
            
            UUID storeId = store.getId();
            UUID swapId = swap.getId();
            UUID managerId = manager.getId();
            
            int threads = 2;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch latch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);
            
            for (int t = 0; t < threads; t++) {
                executor.submit(() -> {
                    try {
                        latch.await();
                        setSecurityContext(managerId, SystemRole.MANAGER);
                        shiftSwapService.managerApproveSwapRequest(swapId, managerId);
                    } catch (Exception e) {
                        System.out.println("CON-004 Ex: " + e.getMessage());
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }
            
            latch.countDown();
            doneLatch.await(5, TimeUnit.SECONDS);
            executor.shutdown();
            
            // Check if multiple approvals resulted in duplicate assignments or corrupted state
            long assignmentCount = shiftAssignmentRepository.findAll().stream()
                .filter(a -> a.getShift().getId().equals(shift.getId()))
                .count();
                
            System.out.println("CON-004 It " + i + " -> Assignment count: " + assignmentCount);
            if (assignmentCount > 1) {
                hitCount++;
            }
        }
        
        System.out.println("=== CON-004 RESULT ===");
        System.out.println("Race condition hit rate: " + hitCount + "/" + iterations);
    }

    @Autowired
    private com.shiftsync.attendance.service.AttendanceService attendanceService;

    @Autowired
    private com.shiftsync.attendance.repository.AttendanceRepository attendanceRepository;

    @Test
    public void verifyCon005_AttendanceCheckInRace() throws InterruptedException {
        int iterations = 10;
        int hitCount = 0;
        
        for (int i = 0; i < iterations; i++) {
            String uuid = UUID.randomUUID().toString();
            Store store = storeRepository.save(Store.builder().name("Test Store CON-005 " + uuid)
                    .latitude(java.math.BigDecimal.valueOf(10.0)).longitude(java.math.BigDecimal.valueOf(20.0)).build());
            User staff = userRepository.save(User.builder()
                    .fullName("Staff CON-005 " + i).email("staff_" + uuid + "@test.com")
                    .passwordHash("hash").systemRole(SystemRole.STAFF).build());
            
            com.shiftsync.shift.entity.Shift shift = shiftRepository.save(com.shiftsync.shift.entity.Shift.builder()
                    .store(store)
                    .shiftDate(LocalDate.now())
                    .startTime(java.time.LocalTime.of(8, 0))
                    .endTime(java.time.LocalTime.of(17, 0))
                    .status(com.shiftsync.shift.enums.ShiftStatus.PUBLISHED)
                    .availabilityDeadline(java.time.ZonedDateTime.now())
                    .build());
                    
            com.shiftsync.shift.entity.ShiftAssignment assignment = shiftAssignmentRepository.save(
                    com.shiftsync.shift.entity.ShiftAssignment.builder()
                            .shift(shift).staff(staff).build());
                            
            UUID staffId = staff.getId();
            UUID shiftId = shift.getId();
            
            int threads = 2;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch latch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);
            
            for (int t = 0; t < threads; t++) {
                executor.submit(() -> {
                    try {
                        latch.await();
                        attendanceService.submitSelfie(staffId, shiftId, 10.0, 20.0, new byte[]{1,2,3});
                    } catch (Exception e) {
                        System.out.println("CON-005 Ex: " + e.getMessage());
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }
            
            latch.countDown();
            doneLatch.await(5, TimeUnit.SECONDS);
            executor.shutdown();
            
            long count = attendanceRepository.findAll().stream()
                .filter(a -> a.getShiftAssignment().getId().equals(assignment.getId()))
                .count();
                
            System.out.println("CON-005 It " + i + " -> Count: " + count);
            if (count > 1) {
                hitCount++;
            }
        }
        
        System.out.println("=== CON-005 RESULT ===");
        System.out.println("Race condition hit rate: " + hitCount + "/" + iterations);
    }

    
    private void setSecurityContext(UUID userId, SystemRole role) {
        User u = userRepository.findById(userId).orElseThrow();
        CustomUserDetails details = new CustomUserDetails(u);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities())
        );
    }
}
