package com.shiftsync.payroll.service;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.enums.LeaveType;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.repository.HolidayRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollCalculationServicePaidLeaveTest {

    @Mock
    private PayrollPeriodRepository payrollPeriodRepository;
    @Mock
    private PayrollRepository payrollRepository;
    @Mock
    private HolidayRepository holidayRepository;
    @Mock
    private EmploymentRepository employmentRepository;
    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private SkillRepository skillRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private com.shiftsync.audit.service.AuditLogService auditLogService;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @InjectMocks
    private PayrollCalculationService payrollCalculationService;

    @Captor
    private ArgumentCaptor<List<Payroll>> captor;

    private Store store;
    private User staff;
    private Employment employment;
    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        store = new Store();
        store.setId(UUID.randomUUID());

        staff = new User();
        staff.setId(UUID.randomUUID());
        staff.setSystemRole(com.shiftsync.shared.security.SystemRole.STAFF);

        employment = new Employment();
        employment.setUser(staff);
        employment.setStore(store);
        employment.setContractType(ContractType.builder()
                .id(UUID.randomUUID())
                .name("FULL_TIME")
                .maxWeeklyHours(48)
                .otMultiplier(new BigDecimal("1.50"))
                .defaultHourlyRate(new BigDecimal("20.00"))
                .build());
        employment.setHourlyRate(new BigDecimal("20.00"));
        employment.setStatus(EmploymentStatus.ACTIVE);

        startDate = LocalDate.of(2023, 10, 1);
        endDate = LocalDate.of(2023, 10, 31);

        lenient().when(storeRepository.findById(store.getId())).thenReturn(Optional.of(store));
        lenient().when(payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(store.getId(), startDate, endDate)).thenReturn(Optional.empty());
        lenient().when(payrollPeriodRepository.save(any(PayrollPeriod.class))).thenAnswer(i -> i.getArguments()[0]);
        lenient().when(employmentRepository.findByStoreIdAndStatus(store.getId(), EmploymentStatus.ACTIVE)).thenReturn(List.of(employment));
        lenient().when(holidayRepository.findByHolidayDateBetween(startDate, endDate)).thenReturn(List.of());
        lenient().when(skillRepository.findByStoreId(any())).thenReturn(List.of());
    }

    private ShiftAssignment createAssignment(LocalDate date, LocalTime start, LocalTime end) {
        Shift shift = new Shift();
        shift.setId(UUID.randomUUID());
        shift.setShiftDate(date);
        shift.setStartTime(start);
        shift.setEndTime(end);
        shift.setStatus(ShiftStatus.COMPLETED);

        ShiftAssignment sa = new ShiftAssignment();
        sa.setId(UUID.randomUUID());
        sa.setShift(shift);
        sa.setStaff(staff);
        return sa;
    }

    private LeaveRequest createLeave(LeaveType type, LeaveStatus status, LocalDate start, LocalDate end) {
        return LeaveRequest.builder()
                .id(UUID.randomUUID())
                .staff(staff)
                .store(store)
                .leaveType(type)
                .status(status)
                .startDate(start)
                .endDate(end)
                .build();
    }

    @Test
    @DisplayName("Case 1: APPROVED + ANNUAL -> paid leave được tính")
    void testCase1_ApprovedAnnualLeave_CalculatesPaidLeave() {
        LocalDate date = LocalDate.of(2023, 10, 2);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("80.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("80.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 2: APPROVED + PERSONAL -> paid leave được tính")
    void testCase2_ApprovedPersonalLeave_CalculatesPaidLeave() {
        LocalDate date = LocalDate.of(2023, 10, 3);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(8, 0), LocalTime.of(14, 0)); // 6h
        LeaveRequest leave = createLeave(LeaveType.PERSONAL, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("6.00"), p.getTotalHours());
        assertEquals(new BigDecimal("120.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("120.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 3: APPROVED + SICK -> paid leave được tính theo metadata hiện tại (isPaid = true)")
    void testCase3_ApprovedSickLeave_CalculatesPaidLeave() {
        LocalDate date = LocalDate.of(2023, 10, 4);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h
        LeaveRequest leave = createLeave(LeaveType.SICK, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("80.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("80.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 4: APPROVED + UNPAID -> không tính paid leave")
    void testCase4_ApprovedUnpaidLeave_DoesNotCalculatePaidLeave() {
        LocalDate date = LocalDate.of(2023, 10, 5);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h
        LeaveRequest leave = createLeave(LeaveType.UNPAID, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("0.00"), p.getTotalHours());
        assertEquals(new BigDecimal("0.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("0.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 5: APPROVED + OTHER -> không tính paid leave")
    void testCase5_ApprovedOtherLeave_DoesNotCalculatePaidLeave() {
        LocalDate date = LocalDate.of(2023, 10, 6);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0));
        LeaveRequest leave = createLeave(LeaveType.OTHER, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("0.00"), p.getTotalHours());
        assertEquals(new BigDecimal("0.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("0.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 6: APPROVED + EMERGENCY -> không tính paid leave (isPaid = false)")
    void testCase6_ApprovedEmergencyLeave_DoesNotCalculatePaidLeave() {
        LocalDate date = LocalDate.of(2023, 10, 7);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0));
        LeaveRequest leave = createLeave(LeaveType.EMERGENCY, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("0.00"), p.getTotalHours());
        assertEquals(new BigDecimal("0.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("0.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 7: PENDING + ANNUAL -> không tính paid leave")
    void testCase7_PendingAnnualLeave_DoesNotCalculatePaidLeave() {
        LocalDate date = LocalDate.of(2023, 10, 2);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0));
        // Repository only returns APPROVED leaves in findApprovedLeavesInPeriod
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of());
        // Staff did not attend, assignment is empty because staff was not on approved leave either
        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(BigDecimal.ZERO, p.getTotalHours());
        assertEquals(BigDecimal.ZERO, p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 8: REJECTED + ANNUAL -> không tính paid leave")
    void testCase8_RejectedAnnualLeave_DoesNotCalculatePaidLeave() {
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of());
        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(BigDecimal.ZERO, p.getTotalHours());
        assertEquals(BigDecimal.ZERO, p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 9: Leave ngoài payroll period -> không tính")
    void testCase9_LeaveOutsidePeriod_DoesNotCalculate() {
        // Leave is in November (outside October period)
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, LocalDate.of(2023, 11, 1), LocalDate.of(2023, 11, 5));
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));
        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(BigDecimal.ZERO, p.getTotalHours());
        assertEquals(BigDecimal.ZERO, p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 10: Leave giao một phần payroll period -> chỉ tính phần giao")
    void testCase10_LeavePartiallyIntersecting_OnlyCalculatesIntersectingDays() {
        // Leave from Oct 30 to Nov 2 (4 days, but only Oct 30 and Oct 31 in period)
        LocalDate oct30 = LocalDate.of(2023, 10, 30);
        LocalDate oct31 = LocalDate.of(2023, 10, 31);
        ShiftAssignment sa1 = createAssignment(oct30, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h
        ShiftAssignment sa2 = createAssignment(oct31, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, oct30, LocalDate.of(2023, 11, 2));

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa1, sa2));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        // Only 2 days in period * 4h = 8h
        assertEquals(new BigDecimal("8.00"), p.getTotalHours());
        assertEquals(new BigDecimal("160.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("160.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 11: Không có scheduled shift -> không tự động tính 8h")
    void testCase11_NoScheduledShift_DoesNotAssume8Hours() {
        LocalDate date = LocalDate.of(2023, 10, 10);
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of()); // No active assignments
        when(shiftAssignmentRepository.findAssignmentForStaffOnDateIncludingDeleted(staff.getId(), date))
                .thenReturn(Optional.empty()); // No unassigned/deleted shift either
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(BigDecimal.ZERO, p.getTotalHours());
        assertEquals(BigDecimal.ZERO, p.getBaseAmount());
        assertEquals(BigDecimal.ZERO, p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 12: Ca 4h -> entitlement 4h")
    void testCase12_Shift4Hours_Entitlement4Hours() {
        LocalDate date = LocalDate.of(2023, 10, 11);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("80.00"), p.getBaseAmount());
    }

    @Test
    @DisplayName("Case 13: Ca 6h -> entitlement 6h")
    void testCase13_Shift6Hours_Entitlement6Hours() {
        LocalDate date = LocalDate.of(2023, 10, 12);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(8, 0), LocalTime.of(14, 0)); // 6h
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("6.00"), p.getTotalHours());
        assertEquals(new BigDecimal("120.00"), p.getBaseAmount());
    }

    @Test
    @DisplayName("Case 14: Paid leave không tạo duplicate payroll")
    void testCase14_PaidLeaveDoesNotCreateDuplicatePayroll() {
        LocalDate date = LocalDate.of(2023, 10, 2);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(9, 0), LocalTime.of(13, 0));
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, date, date);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size());
    }

    @Test
    @DisplayName("Case 15: Worked hours + paid leave không double-pay cùng một giờ")
    void testCase15_DoublePaymentProtection_WorkedAndLeaveDoNotDoublePay() {
        LocalDate date = LocalDate.of(2023, 10, 2);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(8, 0), LocalTime.of(12, 0)); // 4h
        LeaveRequest leave = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, date, date);

        // Staff worked the entire 4h
        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setShiftAssignment(sa);
        att.setCheckInTime(OffsetDateTime.of(2023, 10, 2, 8, 0, 0, 0, ZoneOffset.UTC));
        att.setCheckOutTime(OffsetDateTime.of(2023, 10, 2, 12, 0, 0, 0, ZoneOffset.UTC)); // 4h worked

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(att));
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        // Total hours must be 4.00, NOT 8.00!
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("80.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("80.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 16: Nhiều leave trong cùng payroll period")
    void testCase16_MultipleLeavesInSamePeriod_CalculatesAll() {
        LocalDate date1 = LocalDate.of(2023, 10, 2);
        LocalDate date2 = LocalDate.of(2023, 10, 5);

        ShiftAssignment sa1 = createAssignment(date1, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h
        ShiftAssignment sa2 = createAssignment(date2, LocalTime.of(8, 0), LocalTime.of(14, 0)); // 6h

        LeaveRequest leave1 = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, date1, date1);
        LeaveRequest leave2 = createLeave(LeaveType.PERSONAL, LeaveStatus.APPROVED, date2, date2);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa1, sa2));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave1, leave2));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        // 4h + 6h = 10h
        assertEquals(new BigDecimal("10.00"), p.getTotalHours());
        assertEquals(new BigDecimal("200.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("200.00"), p.getTotalAmount());
    }

    @Test
    @DisplayName("Case 17: Legacy overlapping approved leave -> không double count")
    void testCase17_LegacyOverlappingApprovedLeaves_DoesNotDoubleCount() {
        LocalDate oct2 = LocalDate.of(2023, 10, 2);
        ShiftAssignment sa = createAssignment(oct2, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h

        // Two overlapping leaves both covering Oct 2
        LeaveRequest leave1 = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, LocalDate.of(2023, 10, 1), LocalDate.of(2023, 10, 3));
        LeaveRequest leave2 = createLeave(LeaveType.ANNUAL, LeaveStatus.APPROVED, LocalDate.of(2023, 10, 2), LocalDate.of(2023, 10, 4));

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of());
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of(leave1, leave2));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        // Oct 2 had 4h. Even though both leave1 and leave2 cover Oct 2, it is only counted once: 4.00 hours!
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("80.00"), p.getBaseAmount());
    }

    @Test
    @DisplayName("Case 18: Payroll calculation cũ không có LeaveRequest -> kết quả cũ không thay đổi")
    void testCase18_LegacyPayrollCalculationWithoutLeave_Unchanged() {
        LocalDate date = LocalDate.of(2023, 10, 2);
        ShiftAssignment sa = createAssignment(date, LocalTime.of(8, 0), LocalTime.of(12, 0)); // 4h

        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setShiftAssignment(sa);
        att.setCheckInTime(OffsetDateTime.of(2023, 10, 2, 8, 0, 0, 0, ZoneOffset.UTC));
        att.setCheckOutTime(OffsetDateTime.of(2023, 10, 2, 12, 0, 0, 0, ZoneOffset.UTC));

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(sa));
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(att));
        when(leaveRequestRepository.findApprovedLeavesInPeriod(store.getId(), LeaveStatus.APPROVED, startDate, endDate))
                .thenReturn(List.of());

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        verify(payrollRepository).saveAll(captor.capture());
        Payroll p = captor.getValue().get(0);
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("80.00"), p.getBaseAmount());
        assertEquals(new BigDecimal("80.00"), p.getTotalAmount());
    }
}
