package com.shiftsync.incident.controller;

import com.shiftsync.incident.dto.IncidentDTOs.*;
import com.shiftsync.incident.entity.*;
import com.shiftsync.incident.service.IncidentService;
import com.shiftsync.shared.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stores/{storeId}/incidents")
@PreAuthorize("isAuthenticated()")
public class IncidentController {
    private final IncidentService service;
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidentDTO> create(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam IncidentCategory category, @RequestParam(required = false) IncidentSeverity severity,
            @RequestParam String description, @RequestParam UUID clientRequestId,
            @RequestParam(required = false) UUID shiftId, @RequestParam(required = false) List<MultipartFile> photos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(storeId, user.getId(), category, severity, description, clientRequestId, shiftId, photos));
    }
    @GetMapping("/my")
    public List<IncidentDTO> mine(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user, @RequestParam(defaultValue = "100") int limit) {
        return service.mine(storeId, user.getId(), limit);
    }
    @GetMapping
    public List<IncidentDTO> all(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user, @RequestParam(defaultValue = "100") int limit) {
        return service.all(storeId, user.getId(), limit);
    }
    @GetMapping("/{id}")
    public IncidentDTO detail(@PathVariable UUID storeId, @PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails user) {
        return service.detail(storeId, user.getId(), id);
    }
    @PatchMapping("/{id}/status")
    public IncidentDTO review(@PathVariable UUID storeId, @PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails user, @Valid @RequestBody ReviewRequest request) {
        return service.review(storeId, user.getId(), id, request);
    }
    @GetMapping("/{id}/photos/{photoId}")
    public ResponseEntity<byte[]> photo(@PathVariable UUID storeId, @PathVariable UUID id, @PathVariable UUID photoId, @AuthenticationPrincipal CustomUserDetails user) {
        IncidentPhoto photo = service.photo(storeId, user.getId(), id, photoId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.getContentType()))
                .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"incident-" + photoId + (photo.getContentType().equals("image/png") ? ".png\"" : ".jpg\""))
                .body(photo.getData());
    }
}
