package com.shiftsync.store.controller;

import com.shiftsync.store.dto.StoreConfigurationDTO;
import com.shiftsync.store.dto.StoreConfigurationUpdateRequest;
import com.shiftsync.store.service.StoreConfigurationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/configuration")
@RequiredArgsConstructor
@Tag(name = "Store Configuration", description = "Store Configuration APIs (FR-32)")
public class StoreConfigurationController {

    private final StoreConfigurationService storeConfigurationService;

    @Operation(summary = "Get store configuration")
    @PreAuthorize("hasRole('ADMIN') or @storeAccessService.canAccessStore(authentication, #storeId)")
    @GetMapping
    public ResponseEntity<StoreConfigurationDTO> getConfiguration(@PathVariable UUID storeId) {
        return ResponseEntity.ok(storeConfigurationService.getStoreConfiguration(storeId));
    }

    @Operation(summary = "Update store configuration")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping
    public ResponseEntity<StoreConfigurationDTO> updateConfiguration(
            @PathVariable UUID storeId,
            @Valid @RequestBody StoreConfigurationUpdateRequest request) {
        return ResponseEntity.ok(storeConfigurationService.updateStoreConfiguration(storeId, request));
    }
}
