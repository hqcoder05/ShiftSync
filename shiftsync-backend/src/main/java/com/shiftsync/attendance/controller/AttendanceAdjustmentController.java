package com.shiftsync.attendance.controller;

import com.shiftsync.attendance.dto.AdjustmentCreateRequest;
import com.shiftsync.attendance.dto.AdjustmentResponseDTO;
import com.shiftsync.attendance.enums.AdjustmentStatus;
import com.shiftsync.attendance.service.AttendanceAdjustmentService;
import com.shiftsync.shared.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/attendance-adjustments")
@RequiredArgsConstructor
@Tag(name = "Attendance Adjustment", description = "APIs for adjusting attendance records")
@SecurityRequirement(name = "bearerAuth")
public class AttendanceAdjustmentController {

    private final AttendanceAdjustmentService service;

    @PostMapping
    @Operation(summary = "Submit an attendance adjustment request (Staff)")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<AdjustmentResponseDTO> createRequest(
            @PathVariable UUID storeId,
            @Valid @RequestBody AdjustmentCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(service.createRequest(userDetails.getId(), request));
    }

    @GetMapping
    @Operation(summary = "Get list of adjustment requests (Manager)")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<List<AdjustmentResponseDTO>> getRequests(
            @PathVariable UUID storeId,
            @RequestParam(required = false) AdjustmentStatus status) {
        return ResponseEntity.ok(service.getRequests(storeId, status));
    }

    @PutMapping("/{requestId}/approve")
    @Operation(summary = "Approve an adjustment request (Manager)")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<AdjustmentResponseDTO> approveRequest(
            @PathVariable UUID storeId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(service.approveRequest(storeId, requestId, userDetails.getId()));
    }

    @PutMapping("/{requestId}/reject")
    @Operation(summary = "Reject an adjustment request (Manager)")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<AdjustmentResponseDTO> rejectRequest(
            @PathVariable UUID storeId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(service.rejectRequest(storeId, requestId, userDetails.getId()));
    }
}
