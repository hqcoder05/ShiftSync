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
    @GetMapping
    public ResponseEntity<List<StaffRequestDTO>> getAllRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String typeCategory,
            @RequestParam(required = false) String search) {
        List<StaffRequestDTO> list = staffRequestService.getAllRequests(status, typeCategory, search);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Get request details by ID")
    @GetMapping("/{id}")
    public ResponseEntity<StaffRequestDTO> getRequestById(@PathVariable UUID id) {
        StaffRequestDTO dto = staffRequestService.getRequestById(id);
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Create a new staff request")
    @PostMapping
    public ResponseEntity<StaffRequestDTO> createRequest(@Valid @RequestBody StaffRequestCreateDTO createDTO) {
        StaffRequestDTO created = staffRequestService.createRequest(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Update request status (Approve or Reject)")
    @PutMapping("/{id}/status")
    public ResponseEntity<StaffRequestDTO> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody StaffRequestStatusUpdateDTO updateDTO) {
        StaffRequestDTO updated = staffRequestService.updateRequestStatus(id, updateDTO.getStatus());
        return ResponseEntity.ok(updated);
    }
}
