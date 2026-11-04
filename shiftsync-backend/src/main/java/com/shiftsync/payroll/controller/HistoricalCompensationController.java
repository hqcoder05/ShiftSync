package com.shiftsync.payroll.controller;

import com.shiftsync.payroll.dto.HistoricalCompensationRequest;
import com.shiftsync.payroll.service.HistoricalCompensationService;
import com.shiftsync.shared.security.CustomUserDetails;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stores/{storeId}/payroll/compensation-history")
@RequiredArgsConstructor
public class HistoricalCompensationController {
    private final HistoricalCompensationService service;

    @GetMapping("/{type}/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    public HistoricalCompensationService.HistoryResult history(@PathVariable UUID storeId, @PathVariable String type,
            @PathVariable UUID entityId) {
        return service.history(storeId, type, entityId);
    }

    @PostMapping("/{type}/{entityId}/untracked-reconciliations")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, java.util.List<UUID>> reconcileUntracked(@PathVariable UUID storeId, @PathVariable String type,
            @PathVariable UUID entityId, @Valid @RequestBody com.shiftsync.payroll.dto.UntrackedCompensationReconciliationRequest request,
            @AuthenticationPrincipal CustomUserDetails actor) {
        return Map.of("revisionIds", service.reconcileUntracked(storeId, type, entityId, request, actor.getId()));
    }

    @PostMapping("/{type}/{entityId}/reconciliations")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, UUID> reconcile(@PathVariable UUID storeId, @PathVariable String type,
            @PathVariable UUID entityId, @Valid @RequestBody HistoricalCompensationRequest request,
            @AuthenticationPrincipal CustomUserDetails actor) {
        return Map.of("revisionId", service.reconcile(storeId, type, entityId, request, actor.getId()));
    }
}
