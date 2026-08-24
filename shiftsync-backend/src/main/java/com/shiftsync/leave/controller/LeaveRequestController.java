package com.shiftsync.leave.controller;

import com.shiftsync.leave.dto.LeaveApproveResponse;
import com.shiftsync.leave.dto.LeaveCreateRequest;
import com.shiftsync.leave.dto.LeaveRequestDTO;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.service.LeaveRequestService;
import com.shiftsync.shared.security.CustomUserDetails;
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
@RequestMapping("/api/stores/{storeId}/leave-requests")
@RequiredArgsConstructor
public class LeaveRequestController {
    private final LeaveRequestService leaveRequestService;

    @PreAuthorize("hasRole('ADMIN') or ((hasRole('STAFF') or hasRole('MANAGER')) and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping
    public ResponseEntity<LeaveRequestDTO> createLeaveRequest(
            @PathVariable UUID storeId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody LeaveCreateRequest request) {
        
        LeaveRequestDTO response = leaveRequestService.createLeaveRequest(storeId, userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping
    public ResponseEntity<List<LeaveRequestDTO>> getLeaveRequests(
            @PathVariable UUID storeId,
            @RequestParam(required = false) LeaveStatus status) {
        
        return ResponseEntity.ok(leaveRequestService.getLeaveRequests(storeId, status));
    }

    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{id}/approve")
    public ResponseEntity<LeaveApproveResponse> approveLeaveRequest(
            @PathVariable UUID storeId,
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails manager) {
        
        return ResponseEntity.ok(leaveRequestService.approveLeaveRequest(storeId, id, manager.getId()));
    }

    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{id}/reject")
    public ResponseEntity<LeaveRequestDTO> rejectLeaveRequest(
            @PathVariable UUID storeId,
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails manager) {
        
        return ResponseEntity.ok(leaveRequestService.rejectLeaveRequest(storeId, id, manager.getId()));
    }
}
