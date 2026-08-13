package com.shiftsync.shift.controller;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shift.dto.ShiftRegistrationDTO;
import com.shiftsync.shift.service.ShiftRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/shifts/{shiftId}/registrations")
@RequiredArgsConstructor
@Tag(name = "Shift Registration API", description = "Operations for shift registrations")
public class ShiftRegistrationController {

    private final ShiftRegistrationService registrationService;

    @Operation(summary = "Register for a shift (Employee)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')") // Depending on how you restrict who can register. Usually STAFF.
    @PostMapping
    public ResponseEntity<ShiftRegistrationDTO> registerForShift(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(registrationService.registerForShift(storeId, shiftId, userDetails.getId()));
    }

    @Operation(summary = "Get all registrations for a shift (Manager)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping
    public ResponseEntity<List<ShiftRegistrationDTO>> getRegistrations(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId) {
        return ResponseEntity.ok(registrationService.getRegistrations(storeId, shiftId));
    }

    @Operation(summary = "Approve a shift registration (Manager)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{registrationId}/approve")
    public ResponseEntity<ShiftRegistrationDTO> approveRegistration(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId,
            @PathVariable UUID registrationId) {
        return ResponseEntity.ok(registrationService.approveRegistration(storeId, shiftId, registrationId));
    }

    @Operation(summary = "Reject a shift registration (Manager)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{registrationId}/reject")
    public ResponseEntity<ShiftRegistrationDTO> rejectRegistration(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId,
            @PathVariable UUID registrationId) {
        return ResponseEntity.ok(registrationService.rejectRegistration(storeId, shiftId, registrationId));
    }
}
