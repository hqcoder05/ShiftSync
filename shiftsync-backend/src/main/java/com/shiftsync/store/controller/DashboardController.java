package com.shiftsync.store.controller;

import com.shiftsync.store.dto.DashboardMetricsDTO;
import com.shiftsync.store.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "APIs for store dashboard metrics")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Get store dashboard metrics")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<DashboardMetricsDTO> getDashboardMetrics(
            @PathVariable UUID storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) {
            startDate = YearMonth.now().atDay(1);
        }
        if (endDate == null) {
            endDate = YearMonth.now().atEndOfMonth();
        }

        DashboardMetricsDTO metrics = dashboardService.getDashboardMetrics(storeId, startDate, endDate);
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/chart")
    @Operation(summary = "Get store dashboard chart data (time-series)")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<java.util.List<com.shiftsync.store.dto.ChartDataDTO>> getChartData(
            @PathVariable UUID storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        if (startDate == null) {
            startDate = LocalDate.now().minusMonths(6).withDayOfMonth(1);
        }
        if (endDate == null) {
            endDate = YearMonth.now().atEndOfMonth();
        }

        java.util.List<com.shiftsync.store.dto.ChartDataDTO> chartData = dashboardService.getChartData(storeId, startDate, endDate);
        return ResponseEntity.ok(chartData);
    }
}
