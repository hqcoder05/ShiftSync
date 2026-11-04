package com.shiftsync.payroll;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.payroll.controller.PayrollController;
import com.shiftsync.payroll.entity.*;
import com.shiftsync.payroll.enums.PayrollPeriodStatus;
import com.shiftsync.payroll.repository.*;
import com.shiftsync.payroll.service.*;
import com.shiftsync.shared.security.*;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real method-security, ownership check, PDF rendering and extraction; repositories mocked. */
@SpringJUnitConfig(PayslipPdfPrivacyAuditTest.Config.class)
class PayslipPdfPrivacyAuditTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity
    @Import({PayrollController.class,PdfExportService.class})
    static class Config {
        @Bean StoreAccessService storeAccessService(EmploymentRepository employment){return new StoreAccessService(employment);}
    }
    @MockitoBean EmploymentRepository employment;
    @MockitoBean PayrollRepository payroll;
    @MockitoBean PayrollPeriodRepository periods;
    @MockitoBean PayrollCalculationService calculations;
    @MockitoBean ExcelExportService excel;
    @MockitoBean com.shiftsync.shared.transaction.SerializableRetry serializableRetry;
    @Autowired PayrollController controller;
    @AfterEach void clear(){SecurityContextHolder.clearContext();}

    @Test void ordinaryStaffCannotDownloadCoworkersPayslipPdf() throws Exception {
        var store=Store.builder().id(UUID.randomUUID()).name("Audit store").build();
        var actor=User.builder().id(UUID.randomUUID()).email("actor@audit.invalid").systemRole(SystemRole.STAFF).build();
        var coworker=User.builder().id(UUID.randomUUID()).fullName("Confidential Coworker").email("coworker@audit.invalid").build();
        var period=PayrollPeriod.builder().id(UUID.randomUUID()).store(store).startDate(LocalDate.of(2030,11,1))
                .endDate(LocalDate.of(2030,11,30)).status(PayrollPeriodStatus.CONFIRMED).build();
        var row=Payroll.builder().id(UUID.randomUUID()).staff(coworker).payrollPeriod(period)
                .totalHours(new BigDecimal("40")).baseAmount(new BigDecimal("987654")).totalAmount(new BigDecimal("987654")).build();
        when(payroll.findById(row.getId())).thenReturn(Optional.of(row));
        var principal=new CustomUserDetails(actor);
        var auth=new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        // Non-member control: no ownership and no store membership is rejected.
        assertThrows(IllegalArgumentException.class,()->controller.downloadPayslipPdf(row.getId(),principal,auth));
        assertThrows(IllegalArgumentException.class,()->controller.downloadPayslipPdf(row.getId(),principal,auth));
        verifyNoInteractions(employment);
    }

    @Test void ordinaryStoreMemberCannotDownloadCoworkersPayslipPdf() {
        var store=Store.builder().id(UUID.randomUUID()).name("Audit store").build();
        var actor=User.builder().id(UUID.randomUUID()).email("actor@audit.invalid").systemRole(SystemRole.STAFF).build();
        var coworker=User.builder().id(UUID.randomUUID()).fullName("Confidential Coworker").email("coworker@audit.invalid").build();
        var period=PayrollPeriod.builder().id(UUID.randomUUID()).store(store).startDate(LocalDate.of(2030,11,1))
                .endDate(LocalDate.of(2030,11,30)).status(PayrollPeriodStatus.CONFIRMED).build();
        var row=Payroll.builder().id(UUID.randomUUID()).staff(coworker).payrollPeriod(period)
                .totalHours(new BigDecimal("40")).baseAmount(new BigDecimal("987654")).totalAmount(new BigDecimal("987654")).build();
        when(payroll.findById(row.getId())).thenReturn(Optional.of(row));
        when(employment.isStaffInStore(actor.getId(),store.getId(),EmploymentStatus.ACTIVE)).thenReturn(true);
        var principal=new CustomUserDetails(actor);
        var auth=new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThrows(IllegalArgumentException.class,()->controller.downloadPayslipPdf(row.getId(),principal,auth));
        verify(employment,never()).isStaffInStore(any(),any(),any());
    }
}
