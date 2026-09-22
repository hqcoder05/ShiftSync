package com.shiftsync.payroll.service;

import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.StoreAccessService;
import com.shiftsync.store.entity.Store;
import com.shiftsync.auth.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PdfExportServiceTest {

    @Mock
    private PayrollRepository payrollRepository;

    @Mock
    private StoreAccessService storeAccessService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private PdfExportService pdfExportService;

    private UUID payrollId;
    private UUID staffId;
    private UUID managerId;
    private UUID storeId;
    private Payroll payroll;
    private CustomUserDetails staffUserDetails;
    private CustomUserDetails managerUserDetails;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        staffId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        storeId = UUID.randomUUID();

        Store store = Store.builder()
                .id(storeId)
                .name("ShiftSync Main Store")
                .build();

        PayrollPeriod period = PayrollPeriod.builder()
                .id(UUID.randomUUID())
                .store(store)
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 9, 30))
                .status(PayrollPeriodStatus.CONFIRMED)
                .build();

        User staffUser = User.builder()
                .id(staffId)
                .fullName("Nguyen Van A")
                .email("vana@shiftsync.com")
                .build();

        payroll = Payroll.builder()
                .id(payrollId)
                .payrollPeriod(period)
                .staff(staffUser)
                .totalHours(BigDecimal.valueOf(40.0))
                .otHours(BigDecimal.valueOf(5.0))
                .holidayHours(BigDecimal.ZERO)
                .baseAmount(BigDecimal.valueOf(910000))
                .otAmount(BigDecimal.valueOf(195000))
                .holidayAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(1105000))
                .build();

        staffUserDetails = mock(CustomUserDetails.class);
        lenient().when(staffUserDetails.getId()).thenReturn(staffId);

        managerUserDetails = mock(CustomUserDetails.class);
        lenient().when(managerUserDetails.getId()).thenReturn(managerId);
    }

    @Test
    void generatePayslipPdf_StaffOwner_Success() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        byte[] pdfBytes = pdfExportService.generatePayslipPdf(payrollId, staffUserDetails, authentication);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
        // Standard PDF header magic bytes "%PDF-"
        String header = new String(pdfBytes, 0, Math.min(5, pdfBytes.length));
        assertEquals("%PDF-", header);
    }

    @Test
    void generatePayslipPdf_ManagerWithStoreAccess_Success() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(storeAccessService.canAccessStore(authentication, storeId)).thenReturn(true);

        byte[] pdfBytes = pdfExportService.generatePayslipPdf(payrollId, managerUserDetails, authentication);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
        String header = new String(pdfBytes, 0, Math.min(5, pdfBytes.length));
        assertEquals("%PDF-", header);
    }

    @Test
    void generatePayslipPdf_UnauthorizedUser_ThrowsException() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(storeAccessService.canAccessStore(authentication, storeId)).thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                pdfExportService.generatePayslipPdf(payrollId, managerUserDetails, authentication)
        );
        assertEquals("Payroll not found or access denied", ex.getMessage());
    }

    @Test
    void generatePayslipPdf_ByStaffId_Success() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        byte[] pdfBytes = pdfExportService.generatePayslipPdf(payrollId, staffId);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    void generatePayslipPdf_ByWrongStaffId_ThrowsException() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        assertThrows(IllegalArgumentException.class, () ->
                pdfExportService.generatePayslipPdf(payrollId, managerId)
        );
    }
}
