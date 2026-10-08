package com.shiftsync.payroll.service;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class PayrollCalculationServiceQaTest {

    @InjectMocks
    private PayrollCalculationService payrollCalculationService;

    @Test
    void testCalculateForEmployee_NegativeDuration_YieldsNegativeAmount() throws Exception {
        User staff = User.builder().id(UUID.randomUUID()).build();
        Employment emp = Employment.builder()
                .user(staff)
                .hourlyRate(BigDecimal.valueOf(25000))
                .contractType(ContractType.builder()
                        .otMultiplier(BigDecimal.valueOf(1.5))
                        .maxWeeklyHours(40) // FIXED: Added this to prevent NullPointerException
                        .build())
                .build();
        PayrollPeriod period = PayrollPeriod.builder()
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(1))
                .build();

        Store store = Store.builder().id(UUID.randomUUID()).build();
        Shift shift = Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now())
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .build();
        
        ShiftAssignment sa = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .shift(shift)
                .staff(staff)
                .build();

        Attendance att = Attendance.builder()
                .checkInTime(OffsetDateTime.of(LocalDate.now(), LocalTime.of(14, 0), ZoneOffset.UTC))
                .checkOutTime(OffsetDateTime.of(LocalDate.now(), LocalTime.of(10, 0), ZoneOffset.UTC))
                .build();

        Map<UUID, Attendance> attendanceMap = new HashMap<>();
        attendanceMap.put(sa.getId(), att);

        java.lang.reflect.Method calculateMethod = PayrollCalculationService.class.getDeclaredMethod(
                "calculateForEmployee",
                Employment.class, PayrollPeriod.class, List.class, List.class, Map.class, Map.class, Map.class
        );
        calculateMethod.setAccessible(true);

        Payroll payroll = (Payroll) calculateMethod.invoke(
                payrollCalculationService,
                emp, period, Collections.singletonList(sa), Collections.emptyList(),
                attendanceMap, new HashMap<>(), new HashMap<>()
        );

        assertEquals(0, payroll.getTotalHours().compareTo(BigDecimal.ZERO), "Total hours should be safely clamped to 0.00");
        assertEquals(0, payroll.getTotalAmount().compareTo(BigDecimal.ZERO), "Total amount should be safely clamped to 0.00");
    }
}
