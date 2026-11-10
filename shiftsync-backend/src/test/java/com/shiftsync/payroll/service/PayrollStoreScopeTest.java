package com.shiftsync.payroll.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.payroll.controller.PayrollController;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.store.entity.Store;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PayrollStoreScopeTest {
    private Payroll payroll(UUID storeId, User staff) {
        Store store = Store.builder().id(storeId).name("Assigned store").build();
        PayrollPeriod period = PayrollPeriod.builder().id(UUID.randomUUID()).store(store)
                .startDate(LocalDate.of(2026, 10, 1)).endDate(LocalDate.of(2026, 10, 31)).build();
        return Payroll.builder().id(UUID.randomUUID()).staff(staff).payrollPeriod(period).build();
    }

    @Test void personalPayslipsExposeTheirActualStoreForAttendanceGrouping() {
        PayrollRepository repository = mock(PayrollRepository.class);
        User staff = User.builder().id(UUID.randomUUID()).fullName("Staff").build();
        UUID storeId = UUID.randomUUID();
        when(repository.findByStaffIdOrderByPayrollPeriod_StartDateDesc(staff.getId()))
                .thenReturn(List.of(payroll(storeId, staff)));
        var response = new PayrollController(null, null, repository, null, null).getMyPayslips(new CustomUserDetails(staff));
        assertEquals(storeId, response.getBody().getFirst().getStoreId());
        assertEquals("Assigned store", response.getBody().getFirst().getStoreName());
        verify(repository).findByStaffIdOrderByPayrollPeriod_StartDateDesc(staff.getId());
    }

    @Test void storePathCannotExposeASeparateStoresPayrollPeriod() {
        PayrollRepository repository = mock(PayrollRepository.class);
        UUID requestedStore = UUID.randomUUID(), periodId = UUID.randomUUID();
        User staff = User.builder().id(UUID.randomUUID()).fullName("Staff").build();
        when(repository.findByPayrollPeriodId(periodId)).thenReturn(List.of(payroll(UUID.randomUUID(), staff)));
        var response = new PayrollController(null, null, repository, null, null).getPayslips(requestedStore, periodId);
        assertTrue(response.getBody().isEmpty());
    }
}
