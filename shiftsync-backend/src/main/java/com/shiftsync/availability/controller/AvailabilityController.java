package com.shiftsync.availability.controller;

import com.shiftsync.availability.dto.AvailabilityRequest;
import com.shiftsync.availability.dto.AvailabilityResponse;
import com.shiftsync.availability.service.AvailabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/availability")
@Tag(name = "Availability Management", description = "Endpoints for employees to manage their free time slots")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping
    @Operation(summary = "Get my availability", description = "Fetches all declared free time slots for the currently authenticated user.")
    @ApiResponse(responseCode = "200", description = "List retrieved successfully")
    public ResponseEntity<List<AvailabilityResponse>> getMyAvailability(Authentication authentication) {
        List<AvailabilityResponse> responses = availabilityService.getMyAvailability(authentication.getName());
        return ResponseEntity.ok(responses);
    }

    @PostMapping
    @Operation(summary = "Create an availability slot", description = "Declares a new free time slot for a specific day of the week.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Availability successfully created"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload or end time before start time"),
        @ApiResponse(responseCode = "409", description = "Time slot overlaps with existing availability")
    })
    public ResponseEntity<AvailabilityResponse> createAvailability(
            @Valid @RequestBody AvailabilityRequest request, Authentication authentication) {
        AvailabilityResponse response = availabilityService.createAvailability(authentication.getName(), request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an availability slot", description = "Modifies an existing time slot for the authenticated user.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Availability successfully updated"),
        @ApiResponse(responseCode = "403", description = "Permission denied to modify this record"),
        @ApiResponse(responseCode = "404", description = "Availability not found"),
        @ApiResponse(responseCode = "409", description = "Time slot overlaps with existing availability")
    })
    public ResponseEntity<AvailabilityResponse> updateAvailability(
            @PathVariable UUID id, @Valid @RequestBody AvailabilityRequest request, Authentication authentication) {
        AvailabilityResponse response = availabilityService.updateAvailability(id, authentication.getName(), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an availability slot", description = "Removes an availability slot from the system.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Availability successfully deleted"),
        @ApiResponse(responseCode = "403", description = "Permission denied to delete this record"),
        @ApiResponse(responseCode = "404", description = "Availability not found")
    })
    public ResponseEntity<Void> deleteAvailability(@PathVariable UUID id, Authentication authentication) {
        availabilityService.deleteAvailability(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
