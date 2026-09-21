package com.shiftsync.payroll.controller;

import com.shiftsync.payroll.dto.PayrollPeriodDTO;
import com.shiftsync.payroll.dto.PayrollDTO;
import com.shiftsync.payroll.dto.PayrollPeriodStatusUpdateRequest;
import com.shiftsync.payroll.dto.PayrollGenerateRequest;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.payroll.service.ExcelExportService;
import com.shiftsync.payroll.service.PayrollCalculationService;
import com.shiftsync.payroll.service.PdfExportService;
import com.shiftsync.shared.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    private final PdfExportService pdfExportService;
    private final ExcelExportService excelExportService;

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
    public ResponseEntity<List<PayrollPeriodDTO>> getPayrollPeriods(@PathVariable UUID storeId) {
        List<PayrollPeriodDTO> periods = payrollPeriodRepository.findByStoreIdOrderByStartDateDesc(storeId).stream()
                .map(p -> PayrollPeriodDTO.builder()
                        .id(p.getId())
                        .storeId(p.getStore().getId())
                        .startDate(p.getStartDate())
                        .endDate(p.getEndDate())
                        .status(p.getStatus())
                        .build())
                .toList();
        return ResponseEntity.ok(periods);
    }

    @Operation(summary = "Get payslips for a specific payroll period")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping("/stores/{storeId}/payroll/{periodId}/payslips")
    public ResponseEntity<List<PayrollDTO>> getPayslips(
            @PathVariable UUID storeId,
            @PathVariable UUID periodId) {
        List<PayrollDTO> payslips = payrollRepository.findByPayrollPeriodId(periodId).stream()
                .map(p -> PayrollDTO.builder()
                        .id(p.getId())
                        .periodId(p.getPayrollPeriod().getId())
                        .staffId(p.getStaff().getId())
                        .staffName(p.getStaff().getFullName())
                        .periodStartDate(p.getPayrollPeriod().getStartDate())
                        .periodEndDate(p.getPayrollPeriod().getEndDate())
                        .periodStatus(p.getPayrollPeriod().getStatus().name())
                        .totalHours(p.getTotalHours())
                        .payableHours(p.getTotalHours())
                        .otHours(p.getOtHours())
                        .holidayHours(p.getHolidayHours())
                        .baseAmount(p.getBaseAmount())
                        .otAmount(p.getOtAmount())
                        .holidayAmount(p.getHolidayAmount())
                        .totalAmount(p.getTotalAmount())
                        .generatedAt(p.getGeneratedAt())
                        .build())
                .toList();
        return ResponseEntity.ok(payslips);
    }

    @Operation(summary = "Get my payslips (STAFF)")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/users/me/payslips")
    public ResponseEntity<List<PayrollDTO>> getMyPayslips(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<PayrollDTO> myPayslips = payrollRepository.findByStaffIdOrderByPayrollPeriod_StartDateDesc(userDetails.getId()).stream()
                .map(p -> PayrollDTO.builder()
                        .id(p.getId())
                        .periodId(p.getPayrollPeriod().getId())
                        .staffId(p.getStaff().getId())
                        .staffName(p.getStaff().getFullName())
                        .periodStartDate(p.getPayrollPeriod().getStartDate())
                        .periodEndDate(p.getPayrollPeriod().getEndDate())
                        .periodStatus(p.getPayrollPeriod().getStatus().name())
                        .totalHours(p.getTotalHours())
                        .payableHours(p.getTotalHours())
                        .otHours(p.getOtHours())
                        .holidayHours(p.getHolidayHours())
                        .baseAmount(p.getBaseAmount())
                        .otAmount(p.getOtAmount())
                        .holidayAmount(p.getHolidayAmount())
                        .totalAmount(p.getTotalAmount())
                        .generatedAt(p.getGeneratedAt())
                        .build())
                .toList();
        return ResponseEntity.ok(myPayslips);
    }

    @Operation(summary = "Download payslip PDF")
    @PreAuthorize("isAuthenticated()")
    @GetMapping({"/users/me/payslips/{payrollId}/pdf", "/payslips/{payrollId}/pdf"})
    public ResponseEntity<byte[]> downloadPayslipPdf(
            @PathVariable UUID payrollId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication auth) {
        byte[] pdfBytes = pdfExportService.generatePayslipPdf(payrollId, userDetails, auth);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"payslip-" + payrollId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @Operation(summary = "Download store payroll Excel")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping({"/stores/{storeId}/payroll/{periodId}/excel", "/stores/{storeId}/payroll/{periodId}/export/excel"})
    public ResponseEntity<byte[]> downloadPayrollExcel(
            @PathVariable UUID storeId,
            @PathVariable UUID periodId) {
        byte[] excelBytes = excelExportService.generatePayrollExcel(periodId, storeId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"payroll-" + periodId + ".xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @Operation(summary = "Update payroll period status")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/stores/{storeId}/payroll/{periodId}/status")
    public ResponseEntity<Void> updatePayrollPeriodStatus(
            @PathVariable UUID storeId,
            @PathVariable UUID periodId,
            @Valid @RequestBody PayrollPeriodStatusUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        payrollCalculationService.updatePayrollPeriodStatus(storeId, periodId, request.getStatus(), userDetails != null ? userDetails.getId() : null);
        return ResponseEntity.ok().build();
    }

}
