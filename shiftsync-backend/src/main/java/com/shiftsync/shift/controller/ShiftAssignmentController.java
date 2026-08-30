package com.shiftsync.shift.controller;

import com.shiftsync.shift.dto.ShiftAssignmentCreateRequest;
import com.shiftsync.shift.dto.ShiftAssignmentResponseDTO;
import com.shiftsync.shift.service.ShiftAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/shifts/{shiftId}/assignments")
@RequiredArgsConstructor
@Tag(name = "Shift Assignment API", description = "Operations for shift assignments")
public class ShiftAssignmentController {

    private final ShiftAssignmentService assignmentService;

    @Operation(summary = "Assign a staff to a shift (Manager)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping
    public ResponseEntity<ShiftAssignmentResponseDTO> assignStaff(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId,
            @Valid @RequestBody ShiftAssignmentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(assignmentService.assignStaffToShift(storeId, shiftId, request.getStaffId()));
    }

    @Operation(summary = "Get assignments for a shift")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @GetMapping
    public ResponseEntity<java.util.List<ShiftAssignmentResponseDTO>> getAssignments(
            @PathVariable UUID storeId,
            @PathVariable UUID shiftId) {
        return ResponseEntity.ok(assignmentService.getAssignmentsByShiftId(storeId, shiftId));
    }
}
