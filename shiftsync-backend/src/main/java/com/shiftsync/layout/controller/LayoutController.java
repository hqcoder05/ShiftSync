package com.shiftsync.layout.controller;

import com.shiftsync.layout.dto.CreateLayoutRequest;
import com.shiftsync.layout.dto.CreateZoneRequest;
import com.shiftsync.layout.dto.StoreLayoutDto;
import com.shiftsync.layout.dto.StoreZoneDto;
import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.layout.service.SpatialAllocationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stores/{storeId}")
@RequiredArgsConstructor
@Tag(name = "3D Layout", description = "3D Store Layout & Spatial Staff Allocation")
public class LayoutController {

    private final StoreLayoutRepository storeLayoutRepository;
    private final StoreZoneRepository storeZoneRepository;
    private final StoreRepository storeRepository;
    private final SpatialAllocationService spatialAllocationService;

    @Operation(summary = "Set 3D layout for a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/layout")
    public ResponseEntity<StoreLayoutDto> createOrUpdateLayout(@PathVariable UUID storeId, @Valid @RequestBody CreateLayoutRequest request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        StoreLayout layout = storeLayoutRepository.findByStoreId(storeId).orElse(new StoreLayout());
        layout.setStore(store);
        layout.setLength(request.getLength());
        layout.setWidth(request.getWidth());
        layout.setHeight(request.getHeight());
        
        layout = storeLayoutRepository.save(layout);

        return ResponseEntity.ok(StoreLayoutDto.builder()
                .id(layout.getId())
                .storeId(storeId)
                .length(layout.getLength())
                .width(layout.getWidth())
                .height(layout.getHeight())
                .build());
    }

    @Operation(summary = "Get 3D layout of a store")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/layout")
    public ResponseEntity<StoreLayoutDto> getLayout(@PathVariable UUID storeId) {
        StoreLayout layout = storeLayoutRepository.findByStoreId(storeId)
                .orElseThrow(() -> new BusinessException("Layout not found", HttpStatus.NOT_FOUND));

        return ResponseEntity.ok(StoreLayoutDto.builder()
                .id(layout.getId())
                .storeId(storeId)
                .length(layout.getLength())
                .width(layout.getWidth())
                .height(layout.getHeight())
                .build());
    }

    @Operation(summary = "Add a 3D zone to a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/zones")
    public ResponseEntity<StoreZoneDto> addZone(@PathVariable UUID storeId, @Valid @RequestBody CreateZoneRequest request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        StoreZone zone = StoreZone.builder()
                .store(store)
                .name(request.getName())
                .x(request.getX())
                .y(request.getY())
                .z(request.getZ())
                .capacity(request.getCapacity())
                .build();
        
        zone = storeZoneRepository.save(zone);

        return ResponseEntity.ok(StoreZoneDto.builder()
                .id(zone.getId())
                .storeId(storeId)
                .name(zone.getName())
                .x(zone.getX())
                .y(zone.getY())
                .z(zone.getZ())
                .capacity(zone.getCapacity())
                .build());
    }

    @Operation(summary = "Get all 3D zones of a store")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/zones")
    public ResponseEntity<List<StoreZoneDto>> getZones(@PathVariable UUID storeId) {
        List<StoreZone> zones = storeZoneRepository.findByStoreId(storeId);
        
        List<StoreZoneDto> dtos = zones.stream().map(zone -> StoreZoneDto.builder()
                .id(zone.getId())
                .storeId(storeId)
                .name(zone.getName())
                .x(zone.getX())
                .y(zone.getY())
                .z(zone.getZ())
                .capacity(zone.getCapacity())
                .build()).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "Run 3D Spatial Allocation for a shift")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/shifts/{shiftId}/allocate-zones")
    public ResponseEntity<Void> allocateZones(@PathVariable UUID storeId, @PathVariable UUID shiftId) {
        spatialAllocationService.allocateZonesForShift(shiftId);
        return ResponseEntity.ok().build();
    }
}
