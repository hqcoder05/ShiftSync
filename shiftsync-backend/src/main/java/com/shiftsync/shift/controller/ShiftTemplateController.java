package com.shiftsync.shift.controller;

import com.shiftsync.shift.dto.ShiftTemplateCreateRequest;
import com.shiftsync.shift.dto.ShiftTemplateDTO;
import com.shiftsync.shift.dto.ShiftTemplateUpdateRequest;
import com.shiftsync.shift.service.ShiftTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/shift-templates")
@RequiredArgsConstructor
@Tag(name = "Shift Template API", description = "CRUD operations for shift templates per store")
public class ShiftTemplateController {

    private final ShiftTemplateService shiftTemplateService;

    @Operation(summary = "Get all shift templates for a store")
    @PreAuthorize("@storeAccessService.canAccessStore(authentication, #storeId)")
    @GetMapping
    public ResponseEntity<List<ShiftTemplateDTO>> getTemplatesByStoreId(@PathVariable UUID storeId) {
        return ResponseEntity.ok(shiftTemplateService.getTemplatesByStoreId(storeId));
    }

    @Operation(summary = "Create a new shift template")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping
    public ResponseEntity<ShiftTemplateDTO> createTemplate(
            @PathVariable UUID storeId,
            @Valid @RequestBody ShiftTemplateCreateRequest request) {
        ShiftTemplateDTO created = shiftTemplateService.createTemplate(storeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Update an existing shift template")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{templateId}")
    public ResponseEntity<ShiftTemplateDTO> updateTemplate(
            @PathVariable UUID storeId,
            @PathVariable UUID templateId,
            @Valid @RequestBody ShiftTemplateUpdateRequest request) {
        return ResponseEntity.ok(shiftTemplateService.updateTemplate(storeId, templateId, request));
    }

    @Operation(summary = "Delete a shift template (Soft delete)")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @DeleteMapping("/{templateId}")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable UUID storeId,
            @PathVariable UUID templateId) {
        shiftTemplateService.deleteTemplate(storeId, templateId);
        return ResponseEntity.noContent().build();
    }
}
