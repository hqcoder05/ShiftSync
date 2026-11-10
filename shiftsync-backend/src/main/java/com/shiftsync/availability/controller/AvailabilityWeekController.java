package com.shiftsync.availability.controller;

import com.shiftsync.availability.dto.*;
import com.shiftsync.availability.service.AvailabilityWeekService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/availability/weeks") @RequiredArgsConstructor
public class AvailabilityWeekController {
    private final AvailabilityWeekService service;

    @GetMapping("/{weekStart}")
    public AvailabilityWeekResponse mine(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart, Authentication auth) {
        return service.getMine(auth.getName(), weekStart);
    }

    @PutMapping("/{weekStart}")
    public AvailabilityWeekResponse save(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @Valid @RequestBody AvailabilityWeekRequest request, Authentication auth) {
        return service.saveMine(auth.getName(), weekStart, request);
    }

    @GetMapping("/{weekStart}/users/{userId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canManagerAccessUser(authentication, #userId)) or (hasRole('STAFF') and authentication.principal.id == #userId)")
    public AvailabilityWeekResponse staff(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart, @PathVariable UUID userId) {
        return service.getForStaff(userId, weekStart);
    }

    @GetMapping("/{weekStart}/stores/{storeId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    public List<AvailabilityWeekResponse> store(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart, @PathVariable UUID storeId) {
        return service.getForStore(storeId, weekStart);
    }
}
