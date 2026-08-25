package com.shiftsync.shift.controller;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.dto.ShiftCreateRequest;
import com.shiftsync.shift.dto.ShiftDTO;
import com.shiftsync.shift.dto.ShiftPublishRequest;
import com.shiftsync.shift.dto.ShiftRequirementRequest;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.service.AutoScheduleService;
import com.shiftsync.shift.service.ShiftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/stores/{storeId}/shifts")
@RequiredArgsConstructor
@Tag(name = "Shift API", description = "Operations for Shifts and Shift Requirements per store")
public class ShiftController {

    private final ShiftService shiftService;
    private final AutoScheduleService autoScheduleService;

    @Operation(summary = "Get all shifts for a store")
    @PreAuthorize("@storeAccessService.canAccessStore(authentication, #storeId)")
    @GetMapping
    public ResponseEntity<List<ShiftDTO>> getShiftsByStoreId(
            @PathVariable UUID storeId,
            @RequestParam(required = false) ShiftStatus status,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        boolean isStaff = userDetails.getUser().getSystemRole() == SystemRole.STAFF;
        return ResponseEntity.ok(shiftService.getShiftsByStoreId(storeId, status, isStaff));
    }

    @Operation(summary = "Create a new shift")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping
    public ResponseEntity<ShiftDTO> createShift(
            @PathVariable UUID storeId,
            @Valid @RequestBody ShiftCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shiftService.createShift(storeId, request));
    }

    @Operation(summary = "Set or update requirements for a shift")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{shiftId}/requirements")
    public ResponseEntity<ShiftDTO> setShiftRequirements(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId,
            @Valid @RequestBody List<ShiftRequirementRequest> requirements) {
        return ResponseEntity.ok(shiftService.setShiftRequirements(storeId, shiftId, requirements));
    }

    @Operation(summary = "Publish shifts for a specific date range")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/publish")
    public ResponseEntity<Void> publishShifts(
            @PathVariable UUID storeId,
            @Valid @RequestBody ShiftPublishRequest request, 
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails) {
        shiftService.publishShifts(storeId, request.getStartDate(), request.getEndDate(), userDetails != null ? userDetails.getId() : null);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Auto-schedule shifts for a specific date range")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/auto-schedule")
    public ResponseEntity<Void> autoSchedule(
            @PathVariable UUID storeId,
            @Valid @RequestBody AutoScheduleRequest request) {
        autoScheduleService.autoSchedule(storeId, request);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Update an existing shift")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{shiftId}")
    public ResponseEntity<ShiftDTO> updateShift(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId,
            @RequestBody ShiftCreateRequest request) {
        return ResponseEntity.ok(shiftService.updateShift(storeId, shiftId, request));
    }

    @Operation(summary = "Delete a shift")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @DeleteMapping("/{shiftId}")
    public ResponseEntity<Void> deleteShift(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId) {
        shiftService.deleteShift(storeId, shiftId);
        return ResponseEntity.noContent().build();
    }
}
