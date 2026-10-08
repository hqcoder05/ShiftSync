package com.shiftsync.employment.controller;

import com.shiftsync.employment.dto.ContractTypeCreateRequest;
import com.shiftsync.employment.dto.ContractTypeDTO;
import com.shiftsync.employment.service.ContractTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/contract-types")
@RequiredArgsConstructor
@Tag(name = "Contract Type API", description = "Manage contract types for a store")
@PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
public class ContractTypeController {

    private final ContractTypeService contractTypeService;

    @Operation(summary = "Get all contract types for a store")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or ((hasRole('MANAGER') or hasRole('STAFF')) and @storeAccessService.canAccessStore(authentication, #storeId))")
    public ResponseEntity<List<ContractTypeDTO>> getContractTypes(@PathVariable UUID storeId) {
        return ResponseEntity.ok(contractTypeService.getContractTypes(storeId));
    }

    @Operation(summary = "Create a new contract type")
    @PostMapping
    public ResponseEntity<ContractTypeDTO> createContractType(
            @PathVariable UUID storeId,
            @Valid @RequestBody ContractTypeCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractTypeService.createContractType(storeId, request));
    }

    @Operation(summary = "Update an existing contract type")
    @PutMapping("/{contractTypeId}")
    public ResponseEntity<ContractTypeDTO> updateContractType(
            @PathVariable UUID storeId,
            @PathVariable UUID contractTypeId,
            @Valid @RequestBody ContractTypeCreateRequest request) {
        return ResponseEntity.ok(contractTypeService.updateContractType(storeId, contractTypeId, request));
    }

    @Operation(summary = "Delete a contract type")
    @DeleteMapping("/{contractTypeId}")
    public ResponseEntity<Void> deleteContractType(
            @PathVariable UUID storeId,
            @PathVariable UUID contractTypeId) {
        contractTypeService.deleteContractType(storeId, contractTypeId);
        return ResponseEntity.noContent().build();
    }
}
