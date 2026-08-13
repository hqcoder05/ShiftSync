package com.shiftsync.marketplace.controller;

import com.shiftsync.marketplace.service.MarketplaceService;
import com.shiftsync.shift.entity.Shift;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Marketplace", description = "Marketplace (Open Shift) Management APIs")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    @Operation(summary = "Publish an understaffed shift to the Marketplace")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/stores/{storeId}/marketplace/shifts/{shiftId}/publish")
    public ResponseEntity<Void> publishOpenShift(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId) {
        marketplaceService.publishToMarketplace(storeId, shiftId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Unpublish a shift from the Marketplace")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/stores/{storeId}/marketplace/shifts/{shiftId}/unpublish")
    public ResponseEntity<Void> unpublishOpenShift(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId) {
        marketplaceService.unpublishFromMarketplace(storeId, shiftId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Get list of active Open Shifts in a store")
    @PreAuthorize("isAuthenticated()") // Any authenticated user can view marketplace
    @GetMapping("/stores/{storeId}/marketplace/shifts")
    public ResponseEntity<List<Shift>> getOpenShifts(@PathVariable UUID storeId) {
        List<Shift> shifts = marketplaceService.getOpenShifts(storeId);
        return ResponseEntity.ok(shifts);
    }

    @Operation(summary = "Claim an Open Shift (Employee)")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/stores/{storeId}/marketplace/shifts/{shiftId}/claim")
    public ResponseEntity<Void> claimOpenShift(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails) {
        marketplaceService.claimOpenShift(storeId, shiftId, userDetails.getId());
        return ResponseEntity.ok().build();
    }
}
