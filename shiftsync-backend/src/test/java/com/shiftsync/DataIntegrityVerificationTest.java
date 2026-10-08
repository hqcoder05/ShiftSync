package com.shiftsync;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.attendance.service.AttendanceService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.auth.service.UserService;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.service.ShiftService;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.enums.StoreCategory;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.store.service.StoreService;
import com.shiftsync.workforce.dto.WorkforceRequestCreateDTO;
import com.shiftsync.workforce.dto.WorkforceRequestResponseDTO;
import com.shiftsync.workforce.service.WorkforceRequestService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.jpa.JpaObjectRetrievalFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
public class DataIntegrityVerificationTest {

    @Autowired private StoreRepository storeRepository;
    @Autowired private StoreService storeService;
    @Autowired private UserRepository userRepository;
    @Autowired private UserService userService;
    @Autowired private EmploymentRepository employmentRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private ShiftService shiftService;
    @Autowired private ShiftAssignmentRepository shiftAssignmentRepository;
    @Autowired private PayrollPeriodRepository payrollPeriodRepository;
    @Autowired private PayrollRepository payrollRepository;
    @Autowired private PayrollCalculationService payrollCalculationService;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private AttendanceService attendanceService;
    @Autowired private WorkforceRequestService workforceRequestService;
    @Autowired private com.shiftsync.employment.repository.ContractTypeRepository contractTypeRepository;

    @Test
    public void testDI001_SoftDelete_Store_OrphanReferences() {
        // Setup
        Store store = Store.builder()
                .name("Soft Delete Test Store")
                .address("123 Test St")
                .latitude(BigDecimal.valueOf(10.0))
                .longitude(BigDecimal.valueOf(20.0))
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .category(StoreCategory.FOOD_BEVERAGE)
                .build();
        store = storeRepository.save(store);

        User manager = User.builder()
                .email("admin" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Admin")
                .systemRole(com.shiftsync.shared.security.SystemRole.MANAGER)
                .build();
        manager = userRepository.save(manager);

        User staff = User.builder()
                .email("staff" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Staff")
                .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                .build();
        staff = userRepository.save(staff);


        com.shiftsync.employment.entity.ContractType ct = com.shiftsync.employment.entity.ContractType.builder()
                .store(store)
                .name("FULL_TIME")
                .maxWeeklyHours(40)
                .otMultiplier(BigDecimal.valueOf(1.5))
                .defaultHourlyRate(BigDecimal.valueOf(20000))
                .build();
        ct = contractTypeRepository.save(ct);

        Employment emp = Employment.builder()
                .store(store)
                .user(staff)
                .contractType(ct)
                .hourlyRate(BigDecimal.valueOf(20000))
                .joinedDate(LocalDate.now().minusDays(10))
                .status(EmploymentStatus.INACTIVE) // bypassing hasActiveEmployees check
                .build();
        emp = employmentRepository.save(emp);

        Shift shift = Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now().minusDays(1)) // Past shift to bypass hasFuturePublishedShifts check
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.COMPLETED)
                .availabilityDeadline(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).minusDays(2))
                .build();
        shift = shiftRepository.save(shift);

        ShiftAssignment sa = ShiftAssignment.builder()
                .shift(shift)
                .staff(staff)
                .source(AssignmentSource.MANUAL)
                .assignedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        sa = shiftAssignmentRepository.save(sa);

        // Act - Soft Delete Store
        storeService.deleteStore(store.getId(), manager.getId());

        // Assert - verify orphans and exception
        System.out.println("DI-001 Store Deleted: " + storeRepository.findById(store.getId()).isEmpty());
        
        try {
            shiftService.getShiftsByStaffId(staff.getId());
            System.out.println("DI-001 Ex: Did NOT throw EntityNotFoundException");
        } catch (EntityNotFoundException | JpaObjectRetrievalFailureException e) {
            System.out.println("DI-001 Ex: Threw " + e.getClass().getSimpleName());
        }
    }

    @Test
    public void testDI002_OverlappingPayrollPeriods() {
        Store store = Store.builder()
                .name("Payroll Test Store")
                .address("123 Test St")
                .latitude(BigDecimal.valueOf(10.0))
                .longitude(BigDecimal.valueOf(20.0))
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .category(StoreCategory.FOOD_BEVERAGE)
                .build();
        store = storeRepository.save(store);

        User staff = User.builder()
                .email("payrollstaff" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Payroll Staff")
                .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                .build();
        staff = userRepository.save(staff);


        com.shiftsync.employment.entity.ContractType ct = com.shiftsync.employment.entity.ContractType.builder()
                .store(store)
                .name("FULL_TIME")
                .maxWeeklyHours(40)
                .otMultiplier(BigDecimal.valueOf(1.5))
                .defaultHourlyRate(BigDecimal.valueOf(20000))
                .build();
        ct = contractTypeRepository.save(ct);

        Employment emp = Employment.builder()
                .store(store)
                .user(staff)
                .contractType(ct)
                .hourlyRate(BigDecimal.valueOf(20000))
                .joinedDate(LocalDate.now().minusDays(30))
                .status(EmploymentStatus.ACTIVE)
                .build();
        emp = employmentRepository.save(emp);

        Shift shift = Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now().minusDays(15))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.COMPLETED)
                .availabilityDeadline(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).minusDays(20))
                .build();
        shift = shiftRepository.save(shift);

        ShiftAssignment sa = ShiftAssignment.builder()
                .shift(shift)
                .staff(staff)
                .source(AssignmentSource.MANUAL)
                .assignedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        sa = shiftAssignmentRepository.save(sa);

        Attendance att = Attendance.builder()
                .shiftAssignment(sa)
                .checkInTime(OffsetDateTime.now(ZoneOffset.UTC).minusDays(15).withHour(9).withMinute(0))
                .checkOutTime(OffsetDateTime.now(ZoneOffset.UTC).minusDays(15).withHour(17).withMinute(0))
                .status(com.shiftsync.attendance.enums.AttendanceStatus.PRESENT)
                .build();
        attendanceRepository.save(att);

        // Generate P1
        LocalDate p1Start = LocalDate.now().minusDays(20);
        LocalDate p1End = LocalDate.now().minusDays(10);
        payrollCalculationService.generatePayroll(store.getId(), p1Start, p1End);

        // Generate P2
        LocalDate p2Start = LocalDate.now().minusDays(15);
        LocalDate p2End = LocalDate.now().minusDays(5);
        UUID storeIdForLambda = store.getId();
        Assertions.assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> {
            payrollCalculationService.generatePayroll(storeIdForLambda, p2Start, p2End);
        });

        List<PayrollPeriod> periods = payrollPeriodRepository.findByStoreIdOrderByStartDateDesc(store.getId());
        System.out.println("DI-002 Periods Count: " + periods.size());
        Assertions.assertEquals(1, periods.size());
    }

    @Test
    public void testDI003_DeleteFinalizedAttendance() {
        Store store = Store.builder()
                .name("Attendance Test Store")
                .address("123 Test St")
                .latitude(BigDecimal.valueOf(10.0))
                .longitude(BigDecimal.valueOf(20.0))
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .category(StoreCategory.FOOD_BEVERAGE)
                .build();
        store = storeRepository.save(store);

        User staff = User.builder()
                .email("attstaff" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Att Staff")
                .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                .build();
        staff = userRepository.save(staff);


        com.shiftsync.employment.entity.ContractType ct = com.shiftsync.employment.entity.ContractType.builder()
                .store(store)
                .name("FULL_TIME")
                .maxWeeklyHours(40)
                .otMultiplier(BigDecimal.valueOf(1.5))
                .defaultHourlyRate(BigDecimal.valueOf(20000))
                .build();
        ct = contractTypeRepository.save(ct);

        Employment emp = Employment.builder()
                .store(store)
                .user(staff)
                .contractType(ct)
                .hourlyRate(BigDecimal.valueOf(20000))
                .joinedDate(LocalDate.now().minusDays(30))
                .status(EmploymentStatus.ACTIVE)
                .build();
        emp = employmentRepository.save(emp);

        Shift shift = Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now().minusDays(15))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.COMPLETED)
                .availabilityDeadline(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).minusDays(20))
                .build();
        shift = shiftRepository.save(shift);

        ShiftAssignment sa = ShiftAssignment.builder()
                .shift(shift)
                .staff(staff)
                .source(AssignmentSource.MANUAL)
                .assignedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        sa = shiftAssignmentRepository.save(sa);

        Attendance att = Attendance.builder()
                .shiftAssignment(sa)
                .checkInTime(OffsetDateTime.now(ZoneOffset.UTC).minusDays(15).withHour(9).withMinute(0))
                .checkOutTime(OffsetDateTime.now(ZoneOffset.UTC).minusDays(15).withHour(17).withMinute(0))
                .status(com.shiftsync.attendance.enums.AttendanceStatus.PRESENT)
                .build();
        att = attendanceRepository.save(att);

        // Generate and confirm payroll
        LocalDate pStart = LocalDate.now().minusDays(20);
        LocalDate pEnd = LocalDate.now().minusDays(10);
        payrollCalculationService.generatePayroll(store.getId(), pStart, pEnd);

        Optional<PayrollPeriod> periodOpt = payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(store.getId(), pStart, pEnd);
        PayrollPeriod period = periodOpt.get();
        period.setStatus(PayrollPeriodStatus.PAID);
        payrollPeriodRepository.save(period);

        // Try to delete attendance
        try {
            attendanceService.deleteAttendance(store.getId(), att.getId());
            System.out.println("DI-003 Deleted: YES (Finalized payroll was bypassed)");
            System.out.println("DI-003 Attendance still exists in DB? " + attendanceRepository.findById(att.getId()).isPresent());
        } catch (Exception e) {
            System.out.println("DI-003 Deleted: NO (" + e.getClass().getSimpleName() + ")");
        }
    }

    @Test
    public void testDI005_WorkforceRequestSchema() {
        Store storeA = Store.builder()
                .name("Store A")
                .address("123 Test St")
                .latitude(BigDecimal.valueOf(10.0))
                .longitude(BigDecimal.valueOf(20.0))
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .category(StoreCategory.FOOD_BEVERAGE)
                .build();
        storeA = storeRepository.save(storeA);

        Store storeB = Store.builder()
                .name("Store B")
                .address("123 Test St")
                .latitude(BigDecimal.valueOf(10.0))
                .longitude(BigDecimal.valueOf(20.0))
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0))
                .category(StoreCategory.FOOD_BEVERAGE)
                .build();
        storeB = storeRepository.save(storeB);

        User admin = User.builder()
                .email("wfa" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Admin")
                .systemRole(com.shiftsync.shared.security.SystemRole.ADMIN)
                .build();
        admin = userRepository.save(admin);

        Shift shift = Shift.builder()
                .store(storeA)
                .shiftDate(LocalDate.now().plusDays(15))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.PUBLISHED)
                .availabilityDeadline(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).minusDays(20))
                .build();
        shift = shiftRepository.save(shift);

        WorkforceRequestCreateDTO dto = new WorkforceRequestCreateDTO();
        dto.setTargetStoreId(storeB.getId());
        dto.setShiftId(shift.getId());

        try {
            WorkforceRequestResponseDTO response = workforceRequestService.createRequest(storeA.getId(), dto, admin.getId());
            System.out.println("DI-005 Request created: YES");
            System.out.println("DI-005 Response has Needed Count? No such property in DTO");
            System.out.println("DI-005 Response has Skill ID? No such property in DTO");
        } catch (Exception e) {
            System.out.println("DI-005 Request created: NO (" + e.getClass().getSimpleName() + ")");
        }
    }
}
