package com.shiftsync;

import com.shiftsync.attendance.dto.AttendanceUpdateRequest;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.attendance.service.AttendanceService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shared.exception.BusinessException;
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
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.jpa.JpaObjectRetrievalFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class PostFixDataIntegrityVerificationTest {

    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EmploymentRepository employmentRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private ShiftAssignmentRepository shiftAssignmentRepository;
    @Autowired private StoreService storeService;
    @Autowired private ShiftService shiftService;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private PayrollCalculationService payrollCalculationService;
    @Autowired private PayrollPeriodRepository payrollPeriodRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private AttendanceService attendanceService;
    @Autowired private WorkforceRequestService workforceRequestService;
    @Autowired private SkillRepository skillRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private TransactionTemplate transactionTemplate;

    @Test
    public void testDI001_SoftDelete_Store_OrphanReferences() {
        Store store = Store.builder().name("DI001 Store").address("123 Test").latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).category(StoreCategory.FOOD_BEVERAGE).build();
        final Store finalStore = storeRepository.save(store);

        User manager = User.builder().email("mgr"+UUID.randomUUID()+"@test.com").passwordHash("h").fullName("M").systemRole(com.shiftsync.shared.security.SystemRole.MANAGER).build();
        final User finalManager = userRepository.save(manager);

        User staff = User.builder().email("stf"+UUID.randomUUID()+"@test.com").passwordHash("h").fullName("S").systemRole(com.shiftsync.shared.security.SystemRole.STAFF).build();
        final User finalStaff = userRepository.save(staff);

        ContractType ct = ContractType.builder().store(finalStore).name("FT").maxWeeklyHours(40).otMultiplier(BigDecimal.ONE).defaultHourlyRate(BigDecimal.TEN).build();
        ct = contractTypeRepository.save(ct);

        Employment emp = Employment.builder().store(finalStore).user(finalStaff).contractType(ct).status(EmploymentStatus.ACTIVE).joinedDate(LocalDate.now()).hourlyRate(BigDecimal.TEN).build();
        final Employment finalEmp = employmentRepository.save(emp);

        Shift shift = Shift.builder().store(finalStore).shiftDate(LocalDate.now()).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).status(ShiftStatus.PUBLISHED).availabilityDeadline(LocalDate.now().atTime(0, 0).atZone(ZoneOffset.UTC)).build();
        final Shift finalShift = shiftRepository.save(shift);

        ShiftAssignment sa = ShiftAssignment.builder().shift(finalShift).staff(finalStaff).source(AssignmentSource.MANUAL).build();
        final ShiftAssignment finalSa = shiftAssignmentRepository.save(sa);

        // The remediation added BusinessException when deleting store with active employees
        assertThrows(BusinessException.class, () -> storeService.deleteStore(finalStore.getId(), finalManager.getId()));
        
        // Let's also verify that if we inactive the employment, it deletes successfully
        finalEmp.setStatus(EmploymentStatus.INACTIVE);
        employmentRepository.save(finalEmp);
        finalShift.setStatus(ShiftStatus.COMPLETED); // Not future published
        shiftRepository.save(finalShift);

        assertDoesNotThrow(() -> storeService.deleteStore(finalStore.getId(), finalManager.getId()));

        // Verify cascading soft-deletes
        assertTrue(storeRepository.findById(finalStore.getId()).isEmpty()); // effectively true if @SQLRestriction applies
        
        // Traversing should not fail
        assertDoesNotThrow(() -> shiftService.getShiftsByStaffId(finalStaff.getId()));
    }

    @Test
    public void testDI002_OverlappingPayrollPeriods() {
        Store store = Store.builder().name("DI002 Store").address("123 Test").latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).category(StoreCategory.FOOD_BEVERAGE).build();
        final Store finalStore = storeRepository.save(store);
        final UUID storeId = finalStore.getId();
        
        Store storeB = Store.builder().name("DI002 Store B").address("123 Test").latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).category(StoreCategory.FOOD_BEVERAGE).build();
        final Store finalStoreB = storeRepository.save(storeB);
        final UUID storeBId = finalStoreB.getId();

        // A = 01 -> 15
        LocalDate pAStart = LocalDate.of(2026, 9, 1);
        LocalDate pAEnd = LocalDate.of(2026, 9, 15);
        payrollCalculationService.generatePayroll(storeId, pAStart, pAEnd);

        // CASE A: Exact duplicate (recalculates, doesn't throw)
        assertDoesNotThrow(() -> payrollCalculationService.generatePayroll(storeId, pAStart, pAEnd));
        assertEquals(1, payrollPeriodRepository.findByStoreIdOrderByStartDateDesc(storeId).size());
        
        // CASE B: Partial overlap at beginning (10 -> 20)
        assertThrows(BusinessException.class, () -> payrollCalculationService.generatePayroll(storeId, LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 20)));

        // CASE C: Partial overlap at end (Aug 20 -> Sep 5)
        assertThrows(BusinessException.class, () -> payrollCalculationService.generatePayroll(storeId, LocalDate.of(2026, 8, 20), LocalDate.of(2026, 9, 5)));

        // CASE D: Contained interval (05 -> 10)
        assertThrows(BusinessException.class, () -> payrollCalculationService.generatePayroll(storeId, LocalDate.of(2026, 9, 5), LocalDate.of(2026, 9, 10)));

        // CASE E: Containing interval (Aug 20 -> Sep 20)
        assertThrows(BusinessException.class, () -> payrollCalculationService.generatePayroll(storeId, LocalDate.of(2026, 8, 20), LocalDate.of(2026, 9, 20)));

        // CASE F: Adjacent periods (16 -> 30) ALLOWED
        assertDoesNotThrow(() -> payrollCalculationService.generatePayroll(storeId, LocalDate.of(2026, 9, 16), LocalDate.of(2026, 9, 30)));

        // CASE G: Different store (10 -> 20) ALLOWED
        assertDoesNotThrow(() -> payrollCalculationService.generatePayroll(storeBId, LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 20)));
    }

    @Test
    public void testDI003_FinalizedPayrollAttendanceImmutability() {
        Store store = Store.builder().name("DI003 Store").address("123 Test").latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).category(StoreCategory.FOOD_BEVERAGE).build();
        final Store finalStore = storeRepository.save(store);
        final UUID storeId = finalStore.getId();

        User staff = User.builder().email("stf3"+UUID.randomUUID()+"@test.com").passwordHash("h").fullName("S").systemRole(com.shiftsync.shared.security.SystemRole.STAFF).build();
        final User finalStaff = userRepository.save(staff);
        final UUID staffId = finalStaff.getId();

        Shift shift = Shift.builder().store(finalStore).shiftDate(LocalDate.of(2026, 8, 5)).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).status(ShiftStatus.PUBLISHED).availabilityDeadline(LocalDate.now().atTime(0, 0).atZone(ZoneOffset.UTC)).build();
        final Shift finalShift = shiftRepository.save(shift);
        final UUID shiftId = finalShift.getId();

        ShiftAssignment sa = ShiftAssignment.builder().shift(finalShift).staff(finalStaff).source(AssignmentSource.MANUAL).build();
        final ShiftAssignment finalSa = shiftAssignmentRepository.save(sa);

        Attendance att = Attendance.builder().shiftAssignment(finalSa).checkInTime(OffsetDateTime.of(2026, 8, 5, 9, 0, 0, 0, ZoneOffset.UTC)).checkOutTime(OffsetDateTime.of(2026, 8, 5, 17, 0, 0, 0, ZoneOffset.UTC)).build();
        final Attendance finalAtt = attendanceRepository.save(att);
        final UUID attId = finalAtt.getId();

        // CASE A: Without finalized payroll
        // Can update
        final AttendanceUpdateRequest req = new AttendanceUpdateRequest();
        req.setCheckInTime(OffsetDateTime.of(2026, 8, 5, 8, 0, 0, 0, ZoneOffset.UTC));
        req.setCheckOutTime(OffsetDateTime.of(2026, 8, 5, 16, 0, 0, 0, ZoneOffset.UTC));
        assertDoesNotThrow(() -> attendanceService.updateAttendance(storeId, attId, req));

        // Generate and CONFIRM payroll
        payrollCalculationService.generatePayroll(storeId, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 15));
        PayrollPeriod p = payrollPeriodRepository.findByStoreIdOrderByStartDateDesc(storeId).get(0);
        p.setStatus(PayrollPeriodStatus.CONFIRMED);
        payrollPeriodRepository.save(p);

        // CASE B: CONFIRMED
        assertThrows(BusinessException.class, () -> attendanceService.updateAttendance(storeId, attId, req));
        assertThrows(BusinessException.class, () -> attendanceService.deleteAttendance(storeId, attId));
        assertThrows(BusinessException.class, () -> attendanceService.submitSelfie(staffId, shiftId, 0.0, 0.0, null));
        
        // CASE C: PAID
        p.setStatus(PayrollPeriodStatus.PAID);
        payrollPeriodRepository.save(p);
        assertThrows(BusinessException.class, () -> attendanceService.updateAttendance(storeId, attId, req));
        assertThrows(BusinessException.class, () -> attendanceService.deleteAttendance(storeId, attId));
        
        // Ensure not soft-deleted
        assertTrue(attendanceRepository.findById(attId).isPresent());

        // CASE D: Outside finalized payroll date range
        Shift shift2 = Shift.builder().store(finalStore).shiftDate(LocalDate.of(2026, 8, 20)).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).status(ShiftStatus.PUBLISHED).availabilityDeadline(LocalDate.now().atTime(0, 0).atZone(ZoneOffset.UTC)).build();
        shift2 = shiftRepository.save(shift2);
        ShiftAssignment sa2 = ShiftAssignment.builder().shift(shift2).staff(finalStaff).source(AssignmentSource.MANUAL).build();
        sa2 = shiftAssignmentRepository.save(sa2);
        Attendance att2 = Attendance.builder().shiftAssignment(sa2).checkInTime(OffsetDateTime.of(2026, 8, 20, 9, 0, 0, 0, ZoneOffset.UTC)).build();
        final Attendance finalAtt2 = attendanceRepository.save(att2);
        final UUID att2Id = finalAtt2.getId();
        assertDoesNotThrow(() -> attendanceService.deleteAttendance(storeId, att2Id)); // Should succeed
    }
    
    @Test
    public void testDI005_WorkforceRequestSchema() {
        Store storeA = Store.builder().name("DI005 A").address("123 Test").latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).category(StoreCategory.FOOD_BEVERAGE).build();
        final Store finalStoreA = storeRepository.save(storeA);
        final UUID storeAId = finalStoreA.getId();

        Store storeB = Store.builder().name("DI005 B").address("123 Test").latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).category(StoreCategory.FOOD_BEVERAGE).build();
        final Store finalStoreB = storeRepository.save(storeB);
        final UUID storeBId = finalStoreB.getId();

        User manager = User.builder().email("mgr5"+UUID.randomUUID()+"@test.com").passwordHash("h").fullName("M").systemRole(com.shiftsync.shared.security.SystemRole.MANAGER).build();
        final User finalManager = userRepository.save(manager);
        final UUID managerId = finalManager.getId();

        Shift shift = Shift.builder().store(finalStoreA).shiftDate(LocalDate.now()).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).status(ShiftStatus.PUBLISHED).availabilityDeadline(LocalDate.now().atTime(0, 0).atZone(ZoneOffset.UTC)).build();
        final Shift finalShift = shiftRepository.save(shift);

        Skill skill = Skill.builder().name("Barista").description("Makes coffee").store(finalStoreA).build();
        final Skill finalSkill = skillRepository.save(skill);

        final WorkforceRequestCreateDTO req = new WorkforceRequestCreateDTO();
        req.setTargetStoreId(storeBId);
        req.setShiftId(finalShift.getId());
        req.setSkillId(finalSkill.getId());
        req.setNeededCount(3);

        // TEST 1 - CREATE
        WorkforceRequestResponseDTO res = workforceRequestService.createRequest(storeAId, req, managerId);
        assertEquals(finalSkill.getId(), res.getSkillId());
        assertEquals(3, res.getNeededCount());

        // TEST 2 - RETRIEVE
        List<WorkforceRequestResponseDTO> incoming = workforceRequestService.getIncomingRequests(storeBId);
        assertEquals(1, incoming.size());
        assertEquals(finalSkill.getId(), incoming.get(0).getSkillId());
        assertEquals(3, incoming.get(0).getNeededCount());

        // TEST 3 - INVALID COUNT (Caught by DB check constraint)
        req.setNeededCount(0);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> workforceRequestService.createRequest(storeAId, req, managerId));
        req.setNeededCount(-1);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> workforceRequestService.createRequest(storeAId, req, managerId));

        // TEST 4 - INVALID SKILL
        req.setNeededCount(2);
        req.setSkillId(UUID.randomUUID());
        assertThrows(BusinessException.class, () -> workforceRequestService.createRequest(storeAId, req, managerId));
    }
}
