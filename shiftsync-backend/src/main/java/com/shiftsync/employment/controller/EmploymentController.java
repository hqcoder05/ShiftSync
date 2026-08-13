package com.shiftsync.employment.controller;

import com.shiftsync.employment.dto.EmploymentCreateRequest;
import com.shiftsync.employment.dto.EmploymentDTO;
import com.shiftsync.employment.service.EmploymentService;
import com.shiftsync.shared.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Employment Management", description = "Manage staff assignments to stores")
public class EmploymentController {

    private final EmploymentService employmentService;

    public EmploymentController(EmploymentService employmentService) {
        this.employmentService = employmentService;
    }

    @PostMapping("/stores/{storeId}/staff")
    @Operation(summary = "Assign staff to a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<EmploymentDTO> assignStaff(
            @PathVariable UUID storeId,
            @Valid @RequestBody EmploymentCreateRequest request) {
        
        EmploymentDTO response = employmentService.assignStaffToStore(storeId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @DeleteMapping("/stores/{storeId}/staff/{staffId}")
    @Operation(summary = "Remove staff from a store (Soft delete)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<Void> removeStaff(@PathVariable UUID storeId, @PathVariable UUID staffId) {
        employmentService.removeStaffFromStore(storeId, staffId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stores/{storeId}/staff")
    @Operation(summary = "Get staff for a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<Page<EmploymentDTO>> getStaffByStore(
            @PathVariable UUID storeId,
            Pageable pageable) {
        return ResponseEntity.ok(employmentService.getStaffByStore(storeId, pageable));
    }

    @GetMapping("/users/{staffId}/stores")
    @Operation(summary = "Get stores a staff belongs to")
    @PreAuthorize("hasRole('ADMIN') or ((hasRole('STAFF') or hasRole('MANAGER')) and authentication.principal.id == #staffId)")
    public ResponseEntity<List<EmploymentDTO>> getStoresByStaff(
            @PathVariable UUID staffId,
            Authentication authentication) {
        return ResponseEntity.ok(employmentService.getStoresByStaff(staffId));
    }
}
