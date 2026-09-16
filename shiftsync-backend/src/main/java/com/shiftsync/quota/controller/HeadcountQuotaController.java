package com.shiftsync.quota.controller;

import com.shiftsync.quota.dto.*;
import com.shiftsync.quota.service.HeadcountQuotaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Headcount Quotas API", description = "Dynamic API-driven Headcount Quotas & Demand Planning")
public class HeadcountQuotaController {

    private final HeadcountQuotaService quotaService;

    @Operation(summary = "Get list of branches for store dropdown")
    @GetMapping("/api/branches")
    public ResponseEntity<List<BranchDTO>> getBranches() {
        return ResponseEntity.ok(quotaService.getBranches());
    }

    @Operation(summary = "Get list of operational positions (excluding Leader/Manager)")
    @GetMapping("/api/positions")
    public ResponseEntity<List<PositionDTO>> getPositions(@RequestParam UUID branchId) {
        return ResponseEntity.ok(quotaService.getPositions(branchId));
    }

    @Operation(summary = "Get daily headcount quotas for a specific branch and date")
    @GetMapping("/api/headcount-quotas")
    public ResponseEntity<DailyQuotaResponse> getDailyQuotas(
            @RequestParam UUID branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(quotaService.getDailyQuotas(branchId, date));
    }

    @Operation(summary = "Get 7-day weekly matrix headcount quotas for a specific branch and weekStart")
    @GetMapping("/api/headcount-quotas/weekly")
    public ResponseEntity<WeeklyMatrixQuotaResponse> getWeeklyQuotas(
            @RequestParam UUID branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(quotaService.getWeeklyQuotas(branchId, weekStart));
    }

    @Operation(summary = "Update quota count or Min/Target/Max inline")
    @PutMapping("/api/headcount-quotas/{quotaId}")
    public ResponseEntity<Map<String, Object>> updateQuota(
            @PathVariable String quotaId,
            @RequestBody UpdateQuotaRequest request) {
        quotaService.updateQuota(quotaId, request);
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật định biên thành công"));
    }

    @Operation(summary = "Update monthly salary budget for branch")
    @PutMapping("/api/headcount-quotas/budget")
    public ResponseEntity<Map<String, Object>> updateBudget(@RequestBody Map<String, Object> req) {
        UUID branchId = UUID.fromString(req.get("branchId").toString());
        long budget = Long.parseLong(req.get("monthlyBudget").toString());
        quotaService.updateMonthlyBudget(branchId, budget);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã cập nhật ngân sách tối đa", "monthlyBudget", budget));
    }

    @Operation(summary = "Auto fill standard quotas for selected day or week")
    @PostMapping("/api/headcount-quotas/auto-fill")
    public ResponseEntity<Map<String, Object>> autoFillQuotas(
            @RequestBody AutoFillQuotaRequest request) {
        quotaService.autoFillQuotas(request);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã tự động lấp đầy định biên theo chuẩn"));
    }

    @Operation(summary = "Apply headcount quotas directly to Scheduler")
    @PostMapping("/api/headcount-quotas/apply-to-scheduler")
    public ResponseEntity<Map<String, Object>> applyToScheduler(
            @RequestBody ApplySchedulerRequest request) {
        return ResponseEntity.ok(quotaService.applyToScheduler(request));
    }

    @Operation(summary = "Get summary metrics for headcount quotas (hours, cost, SLA, budget)")
    @GetMapping("/api/headcount-quotas/summary")
    public ResponseEntity<QuotaSummaryResponse> getSummary(
            @RequestParam UUID branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(quotaService.getSummary(branchId, date, weekStart));
    }
}
