package com.shiftsync.payroll.service;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.enums.EmploymentType;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.entity.Holiday;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.HolidayRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollCalculationServiceTest {

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

    @InjectMocks
    private PayrollCalculationService payrollCalculationService;

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

        employment = new Employment();
        employment.setUser(staff);
        employment.setStore(store);
        employment.setEmploymentType(EmploymentType.PART_TIME); // 24 hours max
        employment.setHourlyRate(new BigDecimal("20.00"));
        employment.setStatus(EmploymentStatus.ACTIVE);

        startDate = LocalDate.of(2023, 10, 1);
        endDate = LocalDate.of(2023, 10, 31);
    }

    @Test
    void testStandardShift() {
        when(storeRepository.findById(store.getId())).thenReturn(Optional.of(store));
        when(payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(store.getId(), startDate, endDate)).thenReturn(Optional.empty());
        when(payrollPeriodRepository.save(any(PayrollPeriod.class))).thenAnswer(i -> i.getArguments()[0]);
        when(employmentRepository.findByStoreIdAndStatus(store.getId(), EmploymentStatus.ACTIVE)).thenReturn(List.of(employment));

        // Mock Holiday
        when(holidayRepository.findByHolidayDateBetween(startDate, endDate)).thenReturn(List.of());

        // Create a standard shift
        Shift shift = new Shift();
        shift.setId(UUID.randomUUID());
        shift.setShiftDate(LocalDate.of(2023, 10, 2)); // Monday
        shift.setStatus(ShiftStatus.COMPLETED);

        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setId(UUID.randomUUID());
        assignment.setShift(shift);
        assignment.setStaff(staff);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(assignment));

        // Create attendance: 4 hours
        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setShiftAssignment(assignment);
        att.setCheckInTime(OffsetDateTime.of(2023, 10, 2, 8, 0, 0, 0, ZoneOffset.UTC));
        att.setCheckOutTime(OffsetDateTime.of(2023, 10, 2, 12, 0, 0, 0, ZoneOffset.UTC));

        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(att));

        // Act
        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        // Assert
        ArgumentCaptor<List<Payroll>> captor = ArgumentCaptor.forClass(List.class);
        verify(payrollRepository).saveAll(captor.capture());
        
        List<Payroll> payrolls = captor.getValue();
        assertEquals(1, payrolls.size());
        Payroll p = payrolls.get(0);
        
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("80.00"), p.getBaseAmount()); // 4 * 20
        assertEquals(new BigDecimal("0.00"), p.getOtAmount());
        assertEquals(new BigDecimal("0.00"), p.getHolidayAmount());
        assertEquals(new BigDecimal("80.00"), p.getTotalAmount());
    }

    @Test
    void testHolidayShift() {
        when(storeRepository.findById(store.getId())).thenReturn(Optional.of(store));
        when(payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(store.getId(), startDate, endDate)).thenReturn(Optional.empty());
        when(payrollPeriodRepository.save(any(PayrollPeriod.class))).thenAnswer(i -> i.getArguments()[0]);
        when(employmentRepository.findByStoreIdAndStatus(store.getId(), EmploymentStatus.ACTIVE)).thenReturn(List.of(employment));
        
        // Mock Holiday (Rate: 3.0)
        Holiday holiday = new Holiday();
        holiday.setHolidayDate(LocalDate.of(2023, 10, 2));
        holiday.setRateMultiplier(new BigDecimal("3.00"));
        when(holidayRepository.findByHolidayDateBetween(startDate, endDate)).thenReturn(List.of(holiday));

        // Create a shift on holiday
        Shift shift = new Shift();
        shift.setId(UUID.randomUUID());
        shift.setShiftDate(LocalDate.of(2023, 10, 2)); // Holiday
        shift.setStatus(ShiftStatus.COMPLETED);

        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setId(UUID.randomUUID());
        assignment.setShift(shift);
        assignment.setStaff(staff);

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(assignment));

        // Create attendance: 4 hours
        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setShiftAssignment(assignment);
        att.setCheckInTime(OffsetDateTime.of(2023, 10, 2, 8, 0, 0, 0, ZoneOffset.UTC));
        att.setCheckOutTime(OffsetDateTime.of(2023, 10, 2, 12, 0, 0, 0, ZoneOffset.UTC));

        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(att));

        // Act
        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        // Assert
        ArgumentCaptor<List<Payroll>> captor = ArgumentCaptor.forClass(List.class);
        verify(payrollRepository).saveAll(captor.capture());
        
        List<Payroll> payrolls = captor.getValue();
        assertEquals(1, payrolls.size());
        Payroll p = payrolls.get(0);
        
        assertEquals(new BigDecimal("4.00"), p.getTotalHours());
        assertEquals(new BigDecimal("4.00"), p.getHolidayHours());
        assertEquals(new BigDecimal("0.00"), p.getBaseAmount()); 
        assertEquals(new BigDecimal("240.00"), p.getHolidayAmount()); // 4 * 20 * 3.0
        assertEquals(new BigDecimal("240.00"), p.getTotalAmount());
    }

    @Test
    void testOvertimeShift() {
        when(storeRepository.findById(store.getId())).thenReturn(Optional.of(store));
        when(payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(store.getId(), startDate, endDate)).thenReturn(Optional.empty());
        when(payrollPeriodRepository.save(any(PayrollPeriod.class))).thenAnswer(i -> i.getArguments()[0]);
        when(employmentRepository.findByStoreIdAndStatus(store.getId(), EmploymentStatus.ACTIVE)).thenReturn(List.of(employment));
        
        // Mock Holiday
        when(holidayRepository.findByHolidayDateBetween(startDate, endDate)).thenReturn(List.of());

        // Part-time MAX = 24h. We simulate a total of 26 hours in one week.
        // Shift 1: 20 hours (Monday to Thursday somehow)
        Shift shift1 = new Shift();
        shift1.setId(UUID.randomUUID());
        shift1.setShiftDate(LocalDate.of(2023, 10, 2)); // Monday
        shift1.setStatus(ShiftStatus.COMPLETED);

        ShiftAssignment assignment1 = new ShiftAssignment();
        assignment1.setId(UUID.randomUUID());
        assignment1.setShift(shift1);
        assignment1.setStaff(staff);
        
        Attendance att1 = new Attendance();
        att1.setId(UUID.randomUUID());
        att1.setShiftAssignment(assignment1);
        att1.setCheckInTime(OffsetDateTime.of(2023, 10, 2, 0, 0, 0, 0, ZoneOffset.UTC));
        att1.setCheckOutTime(OffsetDateTime.of(2023, 10, 2, 20, 0, 0, 0, ZoneOffset.UTC)); // 20 hrs

        // Shift 2: 6 hours (Friday)
        Shift shift2 = new Shift();
        shift2.setId(UUID.randomUUID());
        shift2.setShiftDate(LocalDate.of(2023, 10, 6)); // Friday, same week
        shift2.setStatus(ShiftStatus.COMPLETED);

        ShiftAssignment assignment2 = new ShiftAssignment();
        assignment2.setId(UUID.randomUUID());
        assignment2.setShift(shift2);
        assignment2.setStaff(staff);

        Attendance att2 = new Attendance();
        att2.setId(UUID.randomUUID());
        att2.setShiftAssignment(assignment2);
        att2.setCheckInTime(OffsetDateTime.of(2023, 10, 6, 8, 0, 0, 0, ZoneOffset.UTC));
        att2.setCheckOutTime(OffsetDateTime.of(2023, 10, 6, 14, 0, 0, 0, ZoneOffset.UTC)); // 6 hrs

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(assignment1, assignment2));
                
        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(att1, att2));

        // Act
        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        // Assert
        ArgumentCaptor<List<Payroll>> captor = ArgumentCaptor.forClass(List.class);
        verify(payrollRepository).saveAll(captor.capture());
        
        List<Payroll> payrolls = captor.getValue();
        assertEquals(1, payrolls.size());
        Payroll p = payrolls.get(0);
        
        // Total 26 hours. Base: 24h, OT: 2h.
        assertEquals(new BigDecimal("26.00"), p.getTotalHours());
        assertEquals(new BigDecimal("2.00"), p.getOtHours());
        assertEquals(new BigDecimal("480.00"), p.getBaseAmount()); // 24 * 20
        assertEquals(new BigDecimal("60.00"), p.getOtAmount());    // 2 * 20 * 1.5
        assertEquals(new BigDecimal("540.00"), p.getTotalAmount());
    }

    @Test
    void testGeneratePayroll_WhenPeriodIsLocked() {
        PayrollPeriod lockedPeriod = new PayrollPeriod();
        lockedPeriod.setStatus(PayrollPeriodStatus.CONFIRMED);
        
        when(payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(store.getId(), startDate, endDate))
                .thenReturn(Optional.of(lockedPeriod));
                
        com.shiftsync.shared.exception.BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(
                com.shiftsync.shared.exception.BusinessException.class, 
                () -> payrollCalculationService.generatePayroll(store.getId(), startDate, endDate)
        );
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("Cannot regenerate payroll. Period is already"));
    }

    @Test
    void testHolidayOvernightShift() {
        when(storeRepository.findById(store.getId())).thenReturn(Optional.of(store));
        when(payrollPeriodRepository.findByStoreIdAndStartDateAndEndDate(store.getId(), startDate, endDate)).thenReturn(Optional.empty());
        when(payrollPeriodRepository.save(any(PayrollPeriod.class))).thenAnswer(i -> i.getArguments()[0]);
        when(employmentRepository.findByStoreIdAndStatus(store.getId(), EmploymentStatus.ACTIVE)).thenReturn(List.of(employment));
        
        // Day 1: Holiday (Rate 3.0), Day 2: Normal (Rate 1.0)
        Holiday holiday = new Holiday();
        holiday.setHolidayDate(LocalDate.of(2023, 10, 2));
        holiday.setRateMultiplier(new BigDecimal("3.00"));
        when(holidayRepository.findByHolidayDateBetween(startDate, endDate)).thenReturn(List.of(holiday));

        // Create an overnight shift (22:00 to 06:00) starting on holiday
        Shift shift = new Shift();
        shift.setId(UUID.randomUUID());
        shift.setShiftDate(LocalDate.of(2023, 10, 2)); 
        shift.setStatus(ShiftStatus.COMPLETED);

        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setId(UUID.randomUUID());
        assignment.setShift(shift);
        assignment.setStaff(employment.getUser());

        when(shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateBetween(
                store.getId(), startDate, endDate)).thenReturn(List.of(assignment));

        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setShiftAssignment(assignment);
        // 22:00 to 06:00
        att.setCheckInTime(OffsetDateTime.of(2023, 10, 2, 22, 0, 0, 0, ZoneOffset.UTC));
        att.setCheckOutTime(OffsetDateTime.of(2023, 10, 3, 6, 0, 0, 0, ZoneOffset.UTC));

        when(attendanceRepository.findByShiftAssignment_Shift_Store_IdAndShiftAssignment_Shift_ShiftDateBetween(store.getId(), startDate, endDate))
                .thenReturn(List.of(att));

        payrollCalculationService.generatePayroll(store.getId(), startDate, endDate);

        ArgumentCaptor<List<Payroll>> captor = ArgumentCaptor.forClass((Class) List.class);
        verify(payrollRepository).saveAll(captor.capture());
        
        List<Payroll> payrolls = captor.getValue();
        assertEquals(1, payrolls.size());
        Payroll p = payrolls.get(0);
        
        // Total 8 hours. 2 hours on Holiday (22:00 - 00:00). 6 hours on Normal (00:00 - 06:00)
        assertEquals(new BigDecimal("8.00"), p.getTotalHours());
        assertEquals(new BigDecimal("2.00"), p.getHolidayHours()); // 2 hours holiday
        
        // Base Amount = 6 hours * 20 = 120.00
        assertEquals(new BigDecimal("120.00"), p.getBaseAmount()); 
        // Holiday Amount = 2 hours * 20 * 3.0 = 120.00
        assertEquals(new BigDecimal("120.00"), p.getHolidayAmount()); 
        // Total Amount = 120 + 120 = 240.00
        assertEquals(new BigDecimal("240.00"), p.getTotalAmount());
    }
}
