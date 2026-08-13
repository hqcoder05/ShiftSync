package com.shiftsync.payroll.controller;

import com.shiftsync.payroll.dto.PayrollGenerateRequest;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.shared.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Payroll", description = "APIs for Payroll Management")
public class PayrollController {

    private final PayrollCalculationService payrollCalculationService;
    private final PayrollPeriodRepository payrollPeriodRepository;
    private final PayrollRepository payrollRepository;
    private final com.shiftsync.payroll.service.PdfExportService pdfExportService;
    private final com.shiftsync.payroll.service.ExcelExportService excelExportService;

    @Operation(summary = "Generate payroll for a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/stores/{storeId}/payroll/generate")
    public ResponseEntity<Void> generatePayroll(
            @PathVariable UUID storeId,
            @Valid @RequestBody PayrollGenerateRequest request) {
        payrollCalculationService.generatePayroll(storeId, request.getStartDate(), request.getEndDate());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Get all payroll periods for a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping("/stores/{storeId}/payroll")
    public ResponseEntity<List<PayrollPeriod>> getPayrollPeriods(@PathVariable UUID storeId) {
        List<PayrollPeriod> periods = payrollPeriodRepository.findByStoreIdOrderByStartDateDesc(storeId);
        return ResponseEntity.ok(periods);
    }

    @Operation(summary = "Get payslips for a specific payroll period")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping("/stores/{storeId}/payroll/{periodId}/payslips")
    public ResponseEntity<List<Payroll>> getPayslips(
            @PathVariable UUID storeId,
            @PathVariable UUID periodId) {
        List<Payroll> payslips = payrollRepository.findByPayrollPeriodId(periodId);
        return ResponseEntity.ok(payslips);
    }

    @Operation(summary = "Get my payslips (STAFF)")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/users/me/payslips")
    public ResponseEntity<List<Payroll>> getMyPayslips(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<Payroll> myPayslips = payrollRepository.findByStaffIdOrderByPayrollPeriod_StartDateDesc(userDetails.getId());
        return ResponseEntity.ok(myPayslips);
    }

    @Operation(summary = "Download payslip as PDF (STAFF)")
    @PreAuthorize("isAuthenticated()")
    @GetMapping(value = "/users/me/payslips/{payrollId}/pdf", produces = "application/pdf")
    public ResponseEntity<byte[]> downloadPayslipPdf(
            @PathVariable UUID payrollId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        byte[] pdfBytes = pdfExportService.generatePayslipPdf(payrollId, userDetails.getId());
        
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"payslip_" + payrollId + ".pdf\"")
                .body(pdfBytes);
    }

    @Operation(summary = "Download payroll report as Excel (MANAGER)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping(value = "/stores/{storeId}/payroll/{periodId}/export/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> downloadPayrollExcel(
            @PathVariable UUID storeId,
            @PathVariable UUID periodId) {
        
        byte[] excelBytes = excelExportService.generatePayrollExcel(periodId, storeId);
        
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"payroll_report_" + periodId + ".xlsx\"")
                .body(excelBytes);
    }
}
