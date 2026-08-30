package com.shiftsync.workforce.controller;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.workforce.dto.WorkforceProposalCreateDTO;
import com.shiftsync.workforce.dto.WorkforceProposalResponseDTO;
import com.shiftsync.workforce.dto.WorkforceRequestCreateDTO;
import com.shiftsync.workforce.dto.WorkforceRequestResponseDTO;
import com.shiftsync.workforce.service.WorkforceRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/workforce-requests")
@RequiredArgsConstructor
public class WorkforceRequestController {

    private final WorkforceRequestService workforceRequestService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<WorkforceRequestResponseDTO> createRequest(
            @PathVariable UUID storeId,
            @Valid @RequestBody WorkforceRequestCreateDTO dto,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workforceRequestService.createRequest(storeId, dto, userDetails.getId()));
    }

    @GetMapping("/incoming")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<List<WorkforceRequestResponseDTO>> getIncomingRequests(@PathVariable UUID storeId) {
        return ResponseEntity.ok(workforceRequestService.getIncomingRequests(storeId));
    }

    @GetMapping("/outgoing")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<List<WorkforceRequestResponseDTO>> getOutgoingRequests(@PathVariable UUID storeId) {
        return ResponseEntity.ok(workforceRequestService.getOutgoingRequests(storeId));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<Void> cancelRequest(
            @PathVariable UUID storeId,
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        workforceRequestService.cancelRequest(storeId, id, userDetails.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<Void> rejectRequest(
            @PathVariable UUID storeId,
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        workforceRequestService.rejectRequest(storeId, id, userDetails.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/proposals")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<WorkforceProposalResponseDTO> proposeStaff(
            @PathVariable UUID storeId,
            @PathVariable UUID id,
            @Valid @RequestBody WorkforceProposalCreateDTO dto,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workforceRequestService.proposeStaff(storeId, id, dto, userDetails.getId()));
    }
}



