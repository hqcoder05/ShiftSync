package com.shiftsync.shift.controller;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shift.dto.SwapCreateRequest;
import com.shiftsync.shift.dto.SwapRespondRequest;
import com.shiftsync.shift.entity.ShiftSwapRequest;
import com.shiftsync.shift.service.ShiftSwapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Shift Swap", description = "Shift Swap Management APIs")
public class ShiftSwapController {

    private final ShiftSwapService shiftSwapService;

    @Operation(summary = "Create a swap request")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/users/me/swaps")
    public ResponseEntity<ShiftSwapRequest> createSwapRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SwapCreateRequest request) {
        
        ShiftSwapRequest swap = shiftSwapService.createSwapRequest(
                userDetails.getId(),
                request.getFromShiftId(),
                request.getToStaffId(),
                request.getToShiftId()
        );
        return ResponseEntity.ok(swap);
    }

    @Operation(summary = "Respond to a swap request (accept/reject)")
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/users/me/swaps/{requestId}/respond")
    public ResponseEntity<Void> respondToSwap(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SwapRespondRequest request) {
        
        shiftSwapService.respondToSwapRequest(requestId, userDetails.getId(), request.getAccept());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Manager approves swap request")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PostMapping("/swaps/{requestId}/approve")
    public ResponseEntity<Void> approveSwap(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails manager) {
        
        shiftSwapService.managerApproveSwapRequest(requestId, manager.getId());
        return ResponseEntity.ok().build();
    }
}
