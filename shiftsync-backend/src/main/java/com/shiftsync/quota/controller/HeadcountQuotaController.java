package com.shiftsync.quota.controller;

import com.shiftsync.quota.dto.*;
import com.shiftsync.quota.service.HeadcountQuotaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Headcount Quotas API", description = "Dynamic API-driven Headcount Quotas & Demand Planning")
@PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
public class HeadcountQuotaController {

    private final HeadcountQuotaService quotaService;

    @Operation(summary = "Get list of branches for store dropdown")
    @GetMapping("/api/branches")
    public ResponseEntity<List<BranchDTO>> getBranches() {
        return ResponseEntity.ok(quotaService.getBranches());
    }

    @Operation(summary = "Get list of operational positions (excluding Leader/Manager)")
    @GetMapping("/api/positions")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #branchId))")
    public ResponseEntity<List<PositionDTO>> getPositions(@RequestParam UUID branchId) {
        return ResponseEntity.ok(quotaService.getPositions(branchId));
    }

    @Operation(summary = "Get daily headcount quotas for a specific branch and date")
    @GetMapping("/api/headcount-quotas")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #branchId))")
    public ResponseEntity<DailyQuotaResponse> getDailyQuotas(
            @RequestParam UUID branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(quotaService.getDailyQuotas(branchId, date));
    }

    @Operation(summary = "Get 7-day weekly matrix headcount quotas for a specific branch and weekStart")
    @GetMapping("/api/headcount-quotas/weekly")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #branchId))")
    public ResponseEntity<WeeklyMatrixQuotaResponse> getWeeklyQuotas(
            @RequestParam UUID branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(quotaService.getWeeklyQuotas(branchId, weekStart));
    }

    @Operation(summary = "Update quota count or Min/Target/Max inline")
    @PutMapping("/api/headcount-quotas/{quotaId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #request.branchId))")
    public ResponseEntity<Map<String, Object>> updateQuota(
            @PathVariable String quotaId,
            @Valid @RequestBody UpdateQuotaRequest request) {
        quotaService.updateQuota(quotaId, request);
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thành công"));
    }

    @Operation(summary = "Update monthly salary budget for branch")
    @PutMapping("/api/headcount-quotas/budget")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, T(java.util.UUID).fromString(#req['branchId'].toString())))")
    public ResponseEntity<Map<String, Object>> updateBudget(@RequestBody Map<String, Object> req) {
        UUID branchId = UUID.fromString(req.get("branchId").toString());
        long budget = Long.parseLong(req.get("monthlyBudget").toString());
        quotaService.updateMonthlyBudget(branchId, budget);
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật ngân sách thành công"));
    }

    @Operation(summary = "Auto fill standard quotas for selected day or week")
    @PostMapping("/api/headcount-quotas/auto-fill")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #request.branchId))")
    public ResponseEntity<Map<String, Object>> autoFillQuotas(
            @Valid @RequestBody AutoFillQuotaRequest request) {
        quotaService.autoFillQuotas(request);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã tự động lấp đầy định biên theo chuẩn"));
    }

    @Operation(summary = "Apply headcount quotas directly to Scheduler")
    @PostMapping("/api/headcount-quotas/apply-to-scheduler")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #request.branchId))")
    public ResponseEntity<Map<String, Object>> applyToScheduler(
            @Valid @RequestBody ApplySchedulerRequest request) {
        return ResponseEntity.ok(quotaService.applyToScheduler(request));
    }

    @Operation(summary = "Get summary metrics for headcount quotas (hours, cost, SLA, budget)")
    @GetMapping("/api/headcount-quotas/summary")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #branchId))")
    public ResponseEntity<QuotaSummaryResponse> getSummary(
            @RequestParam UUID branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(quotaService.getSummary(branchId, date, weekStart));
    }
}