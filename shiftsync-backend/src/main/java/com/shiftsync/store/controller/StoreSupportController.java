package com.shiftsync.store.controller;

import com.shiftsync.store.dto.StoreSupportDTO;
import com.shiftsync.store.service.StoreSupportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/stores/{storeId}/support")
public class StoreSupportController {
    private final StoreSupportService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or @storeAccessService.canAccessStore(authentication, #storeId)")
    public StoreSupportDTO get(@PathVariable UUID storeId) { return service.get(storeId); }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public StoreSupportDTO save(@PathVariable UUID storeId, @Valid @RequestBody StoreSupportDTO request) {
        return service.save(storeId, request);
    }
}
