package com.shiftsync.shift.controller;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shift.dto.SwapCreateRequest;
import com.shiftsync.shift.dto.SwapRespondRequest;
import com.shiftsync.shift.dto.ShiftSwapRequestDTO;
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
    public ResponseEntity<ShiftSwapRequestDTO> createSwapRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SwapCreateRequest request) {
        
        ShiftSwapRequest swap;
        if (request.getToStaffIds() != null && !request.getToStaffIds().isEmpty()) {
            if (request.getToShiftId() != null) {
                throw new com.shiftsync.shared.exception.BusinessException(
                        "Chỉ hỗ trợ chọn nhiều người khi nhường ca 1 chiều",
                        org.springframework.http.HttpStatus.BAD_REQUEST);
            }
            swap = shiftSwapService.createMultiGiveawayRequests(
                    userDetails.getId(),
                    request.getFromShiftId(),
                    request.getToStaffIds()
            ).get(0);
        } else {
            if (request.getToStaffId() == null) {
                throw new com.shiftsync.shared.exception.BusinessException(
                        "To staff ID is required",
                        org.springframework.http.HttpStatus.BAD_REQUEST);
            }
            swap = shiftSwapService.createSwapRequest(
                    userDetails.getId(),
                    request.getFromShiftId(),
                    request.getToStaffId(),
                    request.getToShiftId()
            );
        }
        ShiftSwapRequestDTO dto = shiftSwapService.toDTO(swap, userDetails.getId());
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Respond to a swap request (accept/reject)")
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/users/me/swaps/{requestId}/respond")
    public ResponseEntity<Void> respondToSwap(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SwapRespondRequest request) {
        
        shiftSwapService.respondToSwapRequest(requestId, userDetails.getId(), request.getAccept());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Manager approves swap request")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PostMapping("/swaps/{requestId}/approve")
    public ResponseEntity<Void> approveSwap(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails manager) {
        
        shiftSwapService.managerApproveSwapRequest(requestId, manager.getId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Manager rejects swap request")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PostMapping("/swaps/{requestId}/reject")
    public ResponseEntity<Void> rejectSwap(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails manager) {
        
        shiftSwapService.managerRejectSwapRequest(requestId, manager.getId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Cancel swap request")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/swaps/{requestId}/cancel")
    public ResponseEntity<Void> cancelSwap(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        shiftSwapService.cancelSwapRequest(requestId, userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get my swap requests (Staff/Manager/Admin)")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    @GetMapping("/users/me/swaps")
    public ResponseEntity<java.util.List<ShiftSwapRequestDTO>> getMySwapRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(shiftSwapService.getMySwapRequests(userDetails.getId()));
    }

    @Operation(summary = "Get all swap requests in store (Manager)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping("/stores/{storeId}/swaps")
    public ResponseEntity<java.util.List<ShiftSwapRequestDTO>> getStoreSwapRequests(
            @PathVariable UUID storeId,
            @RequestParam(required = false) com.shiftsync.shift.enums.SwapStatus status) {
        return ResponseEntity.ok(shiftSwapService.getStoreSwapRequests(storeId, status));
    }
}
