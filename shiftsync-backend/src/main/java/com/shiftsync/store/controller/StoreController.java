package com.shiftsync.store.controller;

import com.shiftsync.store.dto.StoreCreateRequest;
import com.shiftsync.store.dto.StoreDTO;
import com.shiftsync.store.dto.StoreUpdateRequest;
import com.shiftsync.store.service.StoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/stores")
@Tag(name = "Store Management", description = "Endpoints for managing store branches (CRUD)")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Create a new store branch", description = "Registers a new store branch with custom geofencing parameters and operational hours.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Store successfully created"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed")
    })
    public ResponseEntity<StoreDTO> createStore(@Valid @RequestBody StoreCreateRequest request) {
        StoreDTO storeDTO = storeService.createStore(request);
        return new ResponseEntity<>(storeDTO, HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "Get list of all store branches", description = "Retrieves a paginated list of all registered stores. Use ?page=0&size=20&sort=createdAt,desc for pagination.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved stores list"),
        @ApiResponse(responseCode = "401", description = "Unauthorized request"),
        @ApiResponse(responseCode = "403", description = "Access forbidden")
    })
    public ResponseEntity<Page<StoreDTO>> getAllStores(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            org.springframework.security.core.Authentication authentication) {
        
        com.shiftsync.shared.security.CustomUserDetails details = (com.shiftsync.shared.security.CustomUserDetails) authentication.getPrincipal();
        
        if (details.getUser().getSystemRole() == com.shiftsync.shared.security.SystemRole.ADMIN) {
            return ResponseEntity.ok(storeService.searchStores(search, pageable));
        } else {
            return ResponseEntity.ok(storeService.getMyStores(details.getId(), search, pageable));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @storeAccessService.canAccessStore(authentication, #id)")
    @Operation(summary = "Get store details by ID", description = "Fetches details of a specific store branch by its UUID.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Store found and details retrieved"),
        @ApiResponse(responseCode = "401", description = "Unauthorized request"),
        @ApiResponse(responseCode = "403", description = "Access forbidden"),
        @ApiResponse(responseCode = "404", description = "Store not found")
    })
    public ResponseEntity<StoreDTO> getStoreById(@PathVariable UUID id) {
        StoreDTO storeDTO = storeService.getStoreById(id);
        return ResponseEntity.ok(storeDTO);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #id))")
    @Operation(summary = "Update an existing store branch", description = "Modifies store parameters like location coordinates and operational hours.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Store successfully updated"),
        @ApiResponse(responseCode = "400", description = "Invalid payload or validation failed"),
        @ApiResponse(responseCode = "401", description = "Unauthorized request"),
        @ApiResponse(responseCode = "403", description = "Access forbidden"),
        @ApiResponse(responseCode = "404", description = "Store not found")
    })
    public ResponseEntity<StoreDTO> updateStore(
            @PathVariable UUID id,
            @Valid @RequestBody StoreUpdateRequest request) {
        StoreDTO storeDTO = storeService.updateStore(id, request);
        return ResponseEntity.ok(storeDTO);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a store branch", description = "Permanently removes a store branch from the system.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Store successfully deleted"),
        @ApiResponse(responseCode = "401", description = "Unauthorized request"),
        @ApiResponse(responseCode = "403", description = "Access forbidden"),
        @ApiResponse(responseCode = "404", description = "Store not found")
    })
    public ResponseEntity<Void> deleteStore(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails) {
        storeService.deleteStore(id, userDetails != null ? userDetails.getId() : null);
        return ResponseEntity.noContent().build();
    }
}
