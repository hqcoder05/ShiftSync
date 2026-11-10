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
    private final com.shiftsync.employment.repository.EmploymentRepository employmentRepository;

    @Operation(summary = "Get all staff requests with optional filters")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<StaffRequestDTO>> getAllRequests(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @RequestParam(required = false) com.shiftsync.request.enums.RequestStatus status,
            @RequestParam(required = false) String typeCategory,
            @RequestParam(required = false) String search) {
        List<StaffRequestDTO> list = staffRequestService.getAllRequests(status, typeCategory, search, null)
                .stream().filter(dto -> canView(userDetails, dto)).toList();
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Get request details by ID")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<StaffRequestDTO> getRequestById(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @PathVariable UUID id) {
        StaffRequestDTO dto = staffRequestService.getRequestById(id);
        if (!canView(userDetails, dto)) {
            throw new org.springframework.security.access.AccessDeniedException("You can only view your own requests or requests in your store");
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
        createDTO.setRequesterId(userDetails.getId());
        if (createDTO.getStoreId() == null) {
            var employments = employmentRepository.findByUserIdAndStatus(userDetails.getId(),
                    com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
            var storeIds = employments.stream().map(e -> e.getStore().getId()).distinct().toList();
            if (storeIds.size() != 1) {
                throw new com.shiftsync.shared.exception.BusinessException("Choose an active store for this request", HttpStatus.BAD_REQUEST);
            }
            createDTO.setStoreId(storeIds.getFirst());
        }
        if (userDetails.getUser().getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN &&
                !employmentRepository.existsByUserIdAndStoreIdAndStatus(userDetails.getId(), createDTO.getStoreId(),
                        com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)) {
            throw new org.springframework.security.access.AccessDeniedException("You do not belong to this store");
        }
        StaffRequestDTO created = staffRequestService.createRequest(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Update request status (Approve or Reject)")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PutMapping("/{id}/status")
    public ResponseEntity<StaffRequestDTO> updateStatus(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody StaffRequestStatusUpdateDTO updateDTO) {
        StaffRequestDTO request = staffRequestService.getRequestById(id);
        if (!canReview(userDetails, request)) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot review requests in another store");
        }
        StaffRequestDTO updated = staffRequestService.updateRequestStatus(id, updateDTO.getStatus(),
                userDetails.getId(), userDetails.getUser().getFullName(), updateDTO.getNote());
        return ResponseEntity.ok(updated);
    }

    private boolean canView(com.shiftsync.shared.security.CustomUserDetails user, StaffRequestDTO request) {
        if (user == null) return false;
        return user.getId().equals(request.getRequesterId()) || canReview(user, request);
    }

    private boolean canReview(com.shiftsync.shared.security.CustomUserDetails user, StaffRequestDTO request) {
        if (user == null) return false;
        var role = user.getUser().getSystemRole();
        if (role == com.shiftsync.shared.security.SystemRole.ADMIN) return true;
        return role == com.shiftsync.shared.security.SystemRole.MANAGER && request.getStoreId() != null &&
                employmentRepository.existsByUserIdAndStoreIdAndStatus(user.getId(), request.getStoreId(),
                        com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
    }
}
