package com.shiftsync;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.attendance.service.AttendanceService;
import com.shiftsync.attendance.dto.AttendanceUpdateRequest;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.workforce.dto.WorkforceProposalCreateDTO;
import com.shiftsync.workforce.dto.WorkforceRequestCreateDTO;
import com.shiftsync.workforce.entity.WorkforceRequest;
import com.shiftsync.workforce.enums.WorkforceRequestStatus;
import com.shiftsync.workforce.repository.WorkforceRequestRepository;
import com.shiftsync.workforce.service.WorkforceRequestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
public class NextAuditVerificationTest {

    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EmploymentRepository employmentRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private ShiftAssignmentRepository shiftAssignmentRepository;
    @Autowired private PayrollCalculationService payrollCalculationService;
    @Autowired private PayrollPeriodRepository payrollPeriodRepository;
    @Autowired private PayrollRepository payrollRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private AttendanceService attendanceService;
    @Autowired private WorkforceRequestService workforceRequestService;
    @Autowired private WorkforceRequestRepository workforceRequestRepository;
    @Autowired private AvailabilityRepository availabilityRepository;
    @Autowired private StoreConfigurationRepository storeConfigurationRepository;
    @Autowired private TransactionTemplate transactionTemplate;

    @Test
    public void testPAY001_NoShowEmployeeReceivesFullScheduledPay() {
        Store store = storeRepository.save(Store.builder()
                .name("PAY001 Store")
                .latitude(BigDecimal.valueOf(10.0)).longitude(BigDecimal.valueOf(20.0))
                .build());

        User emp = userRepository.save(User.builder()
                .fullName("Test")
                .email("pay001_" + java.util.UUID.randomUUID().toString() + "@test.com")
                .passwordHash("hash")
                .systemRole(SystemRole.STAFF)
                .build());

        ContractType ct = contractTypeRepository.save(ContractType.builder()
                .name("Standard")
                .store(store)
                .maxWeeklyHours(40)
                .otMultiplier(BigDecimal.valueOf(1.5))
                .defaultHourlyRate(BigDecimal.valueOf(100))
                .build());

        employmentRepository.save(Employment.builder()
                .store(store)
                .user(emp)
                .contractType(ct).joinedDate(java.time.LocalDate.now().minusDays(10))
                .status(EmploymentStatus.ACTIVE)
                .hourlyRate(BigDecimal.valueOf(50000))
                .build());

        LocalDate shiftDate = LocalDate.now().minusDays(2);
        Shift shift = shiftRepository.save(Shift.builder()
                .store(store)
                .shiftDate(shiftDate)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0)) // 4 hours
                .availabilityDeadline(java.time.ZonedDateTime.now().plusDays(1))
                .status(ShiftStatus.PUBLISHED)
                .build());

        shiftAssignmentRepository.save(ShiftAssignment.builder()
                .shift(shift)
                .staff(emp)
                .source(AssignmentSource.MANUAL)
                .build());

        // Do NOT create an Attendance record

        // Execute payroll generation
        LocalDate periodStart = shiftDate.minusDays(1);
        LocalDate periodEnd = shiftDate.plusDays(1);

        payrollCalculationService.generatePayroll(store.getId(), periodStart, periodEnd);

        // Verify result
        PayrollPeriod period = payrollPeriodRepository.findOverlappingPeriods(store.getId(), periodStart, periodEnd).get(0);
        List<Payroll> payrolls = payrollRepository.findByPayrollPeriodId(period.getId());
        
        Payroll targetPayroll = payrolls.stream().filter(p -> p.getStaff().getId().equals(emp.getId())).findFirst().orElseThrow();
        
        System.out.println("PAY-001 Verification:");
        System.out.println("No-show employee calculated hours: " + targetPayroll.getTotalHours());
        System.out.println("No-show employee calculated amount: " + targetPayroll.getTotalAmount());
        
        assertThat(targetPayroll.getTotalHours().doubleValue()).isEqualTo(0.0);
    }

    @Test
    public void testBUSATT001_ManualUpdateWipesEarlyLeave() {
        Store store = storeRepository.save(Store.builder()
                .name("BUSATT001 Store")
                .latitude(BigDecimal.valueOf(10.0)).longitude(BigDecimal.valueOf(20.0))
                .build());

        StoreConfiguration config = storeConfigurationRepository.save(StoreConfiguration.builder()
                .storeId(store.getId())
                .lateGraceMinutes(15)
                .earlyLeaveGraceMinutes(15)
                .build());

        User emp = userRepository.save(User.builder()
                .fullName("Test")
                .email("busatt001_" + java.util.UUID.randomUUID().toString() + "@test.com")
                .passwordHash("hash")
                .systemRole(SystemRole.STAFF)
                .build());

        LocalDate shiftDate = LocalDate.now();
        Shift shift = shiftRepository.save(Shift.builder()
                .store(store)
                .shiftDate(shiftDate)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0)) // 4 hours
                .availabilityDeadline(java.time.ZonedDateTime.now().plusDays(1))
                .status(ShiftStatus.PUBLISHED)
                .build());

        ShiftAssignment assignment = shiftAssignmentRepository.save(ShiftAssignment.builder()
                .shift(shift)
                .staff(emp)
                .source(AssignmentSource.MANUAL)
                .build());

        // Create EARLY_LEAVE attendance
        Attendance attendance = attendanceRepository.save(Attendance.builder()
                .shiftAssignment(assignment)
                .checkInTime(OffsetDateTime.now().withHour(8).withMinute(0))
                .checkOutTime(OffsetDateTime.now().withHour(10).withMinute(0)) // Left 2 hours early
                .status(AttendanceStatus.EARLY_LEAVE)
                .build());

        System.out.println("BUS-ATT-001 Verification:");
        System.out.println("Before update status: " + attendance.getStatus());

        // Manager updates check-in time (e.g. they checked in slightly earlier)
        AttendanceUpdateRequest updateReq = new AttendanceUpdateRequest();
        updateReq.setCheckInTime(OffsetDateTime.now().withHour(7).withMinute(55));

        com.shiftsync.attendance.dto.AttendanceDTO dto = attendanceService.updateAttendance(store.getId(), attendance.getId(), updateReq);
        
        System.out.println("After update check-in only, status: " + dto.getStatus());

        assertThat(dto.getStatus().name()).isEqualTo("EARLY_LEAVE"); // Proving it NO LONGER wipes EARLY_LEAVE
    }

    @Test
    public void testWORKFORCE001_ProposalAcceptanceIgnoresNeededCount() {
        Store reqStore = storeRepository.save(Store.builder().name("ReqStore").build());
        Store targetStore = storeRepository.save(Store.builder().name("TargetStore").build());

        User creator = userRepository.save(User.builder()
                .fullName("Creator")
                .email("creator_wf_" + java.util.UUID.randomUUID().toString() + "@test.com").passwordHash("hash").systemRole(SystemRole.MANAGER).build());

        User staff1 = userRepository.save(User.builder()
                .fullName("Staff1")
                .email("staff1_wf_" + java.util.UUID.randomUUID().toString() + "@test.com").passwordHash("hash").systemRole(SystemRole.STAFF).build());
        User staff2 = userRepository.save(User.builder()
                .fullName("Staff2")
                .email("staff2_wf_" + java.util.UUID.randomUUID().toString() + "@test.com").passwordHash("hash").systemRole(SystemRole.STAFF).build());
        ContractType ct = contractTypeRepository.save(ContractType.builder()
                .name("Standard")
                .store(targetStore)
                .maxWeeklyHours(40)
                .otMultiplier(BigDecimal.valueOf(1.5))
                .defaultHourlyRate(BigDecimal.valueOf(100))
                .build());

        employmentRepository.save(Employment.builder().store(targetStore).user(staff1).status(EmploymentStatus.ACTIVE).hourlyRate(BigDecimal.valueOf(100)).joinedDate(LocalDate.now().minusDays(10)).contractType(ct).build());
        employmentRepository.save(Employment.builder().store(targetStore).user(staff2).status(EmploymentStatus.ACTIVE).hourlyRate(BigDecimal.valueOf(100)).joinedDate(LocalDate.now().minusDays(10)).contractType(ct).build());

        Shift shift = shiftRepository.save(Shift.builder()
                .store(reqStore)
                .shiftDate(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .availabilityDeadline(java.time.ZonedDateTime.now().plusDays(1))
                .status(ShiftStatus.PUBLISHED)
                .build());

        WorkforceRequestCreateDTO reqDto = new WorkforceRequestCreateDTO();
        reqDto.setTargetStoreId(targetStore.getId());
        reqDto.setShiftId(shift.getId());
        reqDto.setNeededCount(2); // We need 2 staff

        var createdReq = workforceRequestService.createRequest(reqStore.getId(), reqDto, creator.getId());
        UUID reqId = createdReq.getId();

        availabilityRepository.save(Availability.builder().user(staff1).dayOfWeek((short) (shift.getShiftDate().getDayOfWeek().getValue() % 7)).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()); availabilityRepository.save(Availability.builder().user(staff2).dayOfWeek((short) (shift.getShiftDate().getDayOfWeek().getValue() % 7)).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build()); WorkforceProposalCreateDTO prop1 = new WorkforceProposalCreateDTO();
        prop1.setStaffId(staff1.getId());
        var p1 = workforceRequestService.proposeStaff(targetStore.getId(), reqId, prop1, creator.getId());

        WorkforceProposalCreateDTO prop2 = new WorkforceProposalCreateDTO();
        prop2.setStaffId(staff2.getId());
        var p2 = workforceRequestService.proposeStaff(targetStore.getId(), reqId, prop2, creator.getId());

        System.out.println("WORKFORCE-001 Verification:");
        WorkforceRequest requestBefore = workforceRequestRepository.findById(reqId).orElseThrow();
        System.out.println("Before accept, status: " + requestBefore.getStatus() + ", neededCount: " + requestBefore.getNeededCount());

        // Staff 1 accepts
        workforceRequestService.respondToProposal(p1.getId(), true, staff1.getId());

        WorkforceRequest requestAfter1 = workforceRequestRepository.findById(reqId).orElseThrow();
        System.out.println("After Staff1 accepts, status: " + requestAfter1.getStatus() + ", neededCount: " + requestAfter1.getNeededCount());

        assertThat(requestAfter1.getStatus()).isNotEqualTo(WorkforceRequestStatus.COMPLETED); workforceRequestService.respondToProposal(p2.getId(), true, staff2.getId()); WorkforceRequest requestAfter2 = workforceRequestRepository.findById(reqId).orElseThrow(); assertThat(requestAfter2.getStatus()).isEqualTo(WorkforceRequestStatus.COMPLETED);
    }
}
