package com.shiftsync.request.controller;

import com.shiftsync.request.dto.StaffRequestCreateDTO;
import com.shiftsync.request.dto.StaffRequestDTO;
import com.shiftsync.request.dto.StaffRequestStatusUpdateDTO;
import com.shiftsync.request.service.StaffRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
@Tag(name = "Requests", description = "Staff Requests & Shift Marketplace Approval APIs")
public class StaffRequestController {

    private final StaffRequestService staffRequestService;

    @Operation(summary = "Get all staff requests with optional filters")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<StaffRequestDTO>> getAllRequests(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @RequestParam(required = false) com.shiftsync.request.enums.RequestStatus status,
            @RequestParam(required = false) String typeCategory,
            @RequestParam(required = false) String search) {
        String requesterFilter = null;
        if (userDetails != null && isStaffOnly(userDetails)) {
            requesterFilter = userDetails.getUser().getFullName();
        }
        List<StaffRequestDTO> list = staffRequestService.getAllRequests(status, typeCategory, search, requesterFilter);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Get request details by ID")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<StaffRequestDTO> getRequestById(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @PathVariable UUID id) {
        StaffRequestDTO dto = staffRequestService.getRequestById(id);
        if (userDetails != null && isStaffOnly(userDetails)) {
            if (dto.getRequesterName() == null || !dto.getRequesterName().equalsIgnoreCase(userDetails.getUser().getFullName())) {
                throw new org.springframework.security.access.AccessDeniedException("You can only view your own requests");
            }
        }
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Create a new staff request")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @PostMapping
    public ResponseEntity<StaffRequestDTO> createRequest(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @Valid @RequestBody StaffRequestCreateDTO createDTO) {
        // Ignored requesterName from FE, use the real name from token
        createDTO.setRequesterName(userDetails.getUser().getFullName());
        StaffRequestDTO created = staffRequestService.createRequest(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Update request status (Approve or Reject)")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PutMapping("/{id}/status")
    public ResponseEntity<StaffRequestDTO> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody StaffRequestStatusUpdateDTO updateDTO) {
        StaffRequestDTO updated = staffRequestService.updateRequestStatus(id, updateDTO.getStatus());
        return ResponseEntity.ok(updated);
    }

    private boolean isStaffOnly(com.shiftsync.shared.security.CustomUserDetails userDetails) {
        boolean hasStaff = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
        boolean hasManagerOrAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MANAGER"));
        return hasStaff && !hasManagerOrAdmin;
    }
}
