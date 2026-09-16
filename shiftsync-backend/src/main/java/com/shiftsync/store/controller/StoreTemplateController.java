package com.shiftsync.store.controller;

import com.shiftsync.store.dto.StoreTemplateDto;
import com.shiftsync.store.service.StoreTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Store Templates", description = "Generic Store Template & Layout Presets Catalog")
public class StoreTemplateController {

    private final StoreTemplateService storeTemplateService;

    @Operation(summary = "Get all store templates catalog")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/store-templates")
    public ResponseEntity<List<StoreTemplateDto>> getAllTemplates() {
        return ResponseEntity.ok(storeTemplateService.getAllTemplates());
    }

    @Operation(summary = "Get store template by ID")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/store-templates/{templateId}")
    public ResponseEntity<StoreTemplateDto> getTemplateById(@PathVariable UUID templateId) {
        return ResponseEntity.ok(storeTemplateService.getTemplateById(templateId));
    }

    @Operation(summary = "Apply a store template to a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/stores/{storeId}/apply-template/{templateId}")
    public ResponseEntity<Void> applyTemplate(@PathVariable UUID storeId, @PathVariable UUID templateId) {
        storeTemplateService.applyTemplateToStore(storeId, templateId);
        return ResponseEntity.ok().build();
    }
}
