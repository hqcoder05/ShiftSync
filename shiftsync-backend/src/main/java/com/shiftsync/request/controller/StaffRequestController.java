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

    @Operation(summary = "Get staff requests with optional filters (Manager/Admin gets all, Staff gets own)")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<StaffRequestDTO>> getAllRequests(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @RequestParam(required = false) com.shiftsync.request.enums.RequestStatus status,
            @RequestParam(required = false) String typeCategory,
            @RequestParam(required = false) String search) {
        boolean isManagerOrAdmin = userDetails != null && userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_ADMIN"));

        if (!isManagerOrAdmin && userDetails != null && userDetails.getUser() != null) {
            String requesterName = userDetails.getUser().getFullName();
            return ResponseEntity.ok(staffRequestService.getMyRequests(requesterName));
        }

        List<StaffRequestDTO> list = staffRequestService.getAllRequests(status, typeCategory, search);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Get my staff requests (Current User)")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public ResponseEntity<List<StaffRequestDTO>> getMyRequests(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails) {
        String requesterName = userDetails != null ? userDetails.getUser().getFullName() : "";
        List<StaffRequestDTO> list = staffRequestService.getMyRequests(requesterName);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Get request details by ID")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<StaffRequestDTO> getRequestById(@PathVariable UUID id) {
        StaffRequestDTO dto = staffRequestService.getRequestById(id);
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Create a new staff request")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @PostMapping
    public ResponseEntity<StaffRequestDTO> createRequest(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @Valid @RequestBody StaffRequestCreateDTO createDTO) {
        // Use the real name from token
        if (userDetails != null && userDetails.getUser() != null) {
            createDTO.setRequesterName(userDetails.getUser().getFullName());
        }
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
}
