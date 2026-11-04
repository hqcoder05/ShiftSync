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
        List<StaffRequestDTO> list = staffRequestService.getAllRequests(status, typeCategory, search, null).stream()
                .filter(request -> canAccess(request, userDetails)).toList();
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Get request details by ID")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<StaffRequestDTO> getRequestById(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails,
            @PathVariable UUID id) {
        StaffRequestDTO dto = staffRequestService.getRequestById(id);
        if (!canAccess(dto, userDetails)) throw new org.springframework.security.access.AccessDeniedException("Không có quyền xem yêu cầu này");
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
        var stores = employmentRepository.findByUserIdAndStatus(userDetails.getId(), com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)
                .stream().map(e -> e.getStore().getId()).distinct().toList();
        if (createDTO.getStoreId() == null && stores.size() == 1) createDTO.setStoreId(stores.get(0));
        if (createDTO.getStoreId() == null || !stores.contains(createDTO.getStoreId())) {
            throw new org.springframework.security.access.AccessDeniedException("Chọn cửa hàng bạn đang làm việc");
        }
        StaffRequestDTO created = staffRequestService.createRequest(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Update request status (Approve or Reject)")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PutMapping("/{id}/status")
    public ResponseEntity<StaffRequestDTO> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody StaffRequestStatusUpdateDTO updateDTO,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails) {
        StaffRequestDTO existing = staffRequestService.getRequestById(id);
        if (!canManage(existing, userDetails)) throw new org.springframework.security.access.AccessDeniedException("Không có quyền xử lý yêu cầu này");
        StaffRequestDTO updated = staffRequestService.updateRequestStatus(id, updateDTO.getStatus());
        return ResponseEntity.ok(updated);
    }

    private boolean canAccess(StaffRequestDTO request, com.shiftsync.shared.security.CustomUserDetails userDetails) {
        return userDetails != null && (userDetails.getId().equals(request.getRequesterId()) || canManage(request, userDetails));
    }

    private boolean canManage(StaffRequestDTO request, com.shiftsync.shared.security.CustomUserDetails userDetails) {
        if (userDetails == null || userDetails.getUser() == null) return false;
        var role = userDetails.getUser().getSystemRole();
        if (role == com.shiftsync.shared.security.SystemRole.ADMIN) return true;
        return role == com.shiftsync.shared.security.SystemRole.MANAGER && request.getStoreId() != null
                && employmentRepository.existsByUserIdAndStoreIdAndStatus(userDetails.getId(), request.getStoreId(), com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
    }
}
