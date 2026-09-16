package com.shiftsync.layout.controller;

import com.shiftsync.layout.dto.*;
import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.layout.enums.SpatialType;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.layout.repository.WorkstationRepository;
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
@RequestMapping({"/api/stores/{storeId}", "/api/locations/{storeId}"})
@RequiredArgsConstructor
@Tag(name = "3D Layout & Workstations", description = "Generic Store Spatial Domain, Layouts, Zones, and Workstations")
public class LayoutController {

    private final StoreLayoutRepository storeLayoutRepository;
    private final StoreZoneRepository storeZoneRepository;
    private final WorkstationRepository workstationRepository;
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

        StoreZone parentZone = null;
        if (request.getParentZoneId() != null) {
            parentZone = storeZoneRepository.findById(request.getParentZoneId()).orElse(null);
        }

        StoreZone zone = StoreZone.builder()
                .store(store)
                .name(request.getName())
                .code(request.getCode())
                .zoneType(request.getZoneType() != null ? request.getZoneType() : SpatialType.ZONE)
                .parentZone(parentZone)
                .color(request.getColor())
                .description(request.getDescription())
                .x(request.getX())
                .y(request.getY())
                .z(request.getZ())
                .widthDim(request.getWidthDim() != null ? request.getWidthDim() : 3.0)
                .lengthDim(request.getLengthDim() != null ? request.getLengthDim() : 4.0)
                .heightDim(request.getHeightDim() != null ? request.getHeightDim() : 2.8)
                .capacity(request.getCapacity())
                .build();
        
        zone = storeZoneRepository.save(zone);

        return ResponseEntity.ok(toZoneDto(zone, storeId));
    }

    @Operation(summary = "Update a 3D zone")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/zones/{zoneId}")
    public ResponseEntity<StoreZoneDto> updateZone(@PathVariable UUID storeId, @PathVariable UUID zoneId, @Valid @RequestBody UpdateZoneRequest request) {
        StoreZone zone = storeZoneRepository.findById(zoneId)
                .orElseThrow(() -> new BusinessException("Zone not found", HttpStatus.NOT_FOUND));

        if (!zone.getStore().getId().equals(storeId)) {
            throw new BusinessException("Zone does not belong to the requested store", HttpStatus.FORBIDDEN);
        }

        if (request.getName() != null) zone.setName(request.getName());
        if (request.getCode() != null) zone.setCode(request.getCode());
        if (request.getZoneType() != null) zone.setZoneType(request.getZoneType());
        if (request.getColor() != null) zone.setColor(request.getColor());
        if (request.getDescription() != null) zone.setDescription(request.getDescription());
        if (request.getX() != null) zone.setX(request.getX());
        if (request.getY() != null) zone.setY(request.getY());
        if (request.getZ() != null) zone.setZ(request.getZ());
        if (request.getWidthDim() != null) zone.setWidthDim(request.getWidthDim());
        if (request.getLengthDim() != null) zone.setLengthDim(request.getLengthDim());
        if (request.getHeightDim() != null) zone.setHeightDim(request.getHeightDim());
        if (request.getCapacity() != null) zone.setCapacity(request.getCapacity());

        if (request.getParentZoneId() != null) {
            StoreZone parentZone = storeZoneRepository.findById(request.getParentZoneId()).orElse(null);
            zone.setParentZone(parentZone);
        }

        zone = storeZoneRepository.save(zone);
        return ResponseEntity.ok(toZoneDto(zone, storeId));
    }

    @Operation(summary = "Get all 3D zones of a store")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/zones")
    public ResponseEntity<List<StoreZoneDto>> getZones(@PathVariable UUID storeId) {
        List<StoreZone> zones = storeZoneRepository.findByStoreId(storeId);
        List<StoreZoneDto> dtos = zones.stream().map(z -> toZoneDto(z, storeId)).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "Delete a 3D zone from a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @DeleteMapping("/zones/{zoneId}")
    public ResponseEntity<Void> deleteZone(@PathVariable UUID storeId, @PathVariable UUID zoneId) {
        StoreZone zone = storeZoneRepository.findById(zoneId)
                .orElseThrow(() -> new BusinessException("Zone not found", HttpStatus.NOT_FOUND));

        if (!zone.getStore().getId().equals(storeId)) {
            throw new BusinessException("Zone does not belong to the requested store", HttpStatus.FORBIDDEN);
        }

        storeZoneRepository.delete(zone);
        return ResponseEntity.noContent().build();
    }

    // ── Workstations API ──
    @Operation(summary = "Get all workstations of a store")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/workstations")
    public ResponseEntity<List<WorkstationDto>> getWorkstations(@PathVariable UUID storeId) {
        List<Workstation> list = workstationRepository.findByStoreId(storeId);
        List<WorkstationDto> dtos = list.stream().map(this::toWorkstationDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "Add a workstation to a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/workstations")
    public ResponseEntity<WorkstationDto> addWorkstation(@PathVariable UUID storeId, @Valid @RequestBody CreateWorkstationRequest request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        StoreZone zone = null;
        if (request.getZoneId() != null) {
            zone = storeZoneRepository.findById(request.getZoneId()).orElse(null);
        }

        Workstation ws = Workstation.builder()
                .store(store)
                .zone(zone)
                .name(request.getName())
                .code(request.getCode())
                .workstationType(request.getWorkstationType() != null ? request.getWorkstationType() : "GENERIC_COUNTER")
                .x(request.getX())
                .y(request.getY())
                .z(request.getZ())
                .capacity(request.getCapacity() != null ? request.getCapacity() : 1)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        ws = workstationRepository.save(ws);
        return ResponseEntity.ok(toWorkstationDto(ws));
    }

    @Operation(summary = "Update a workstation")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/workstations/{workstationId}")
    public ResponseEntity<WorkstationDto> updateWorkstation(@PathVariable UUID storeId, @PathVariable UUID workstationId, @Valid @RequestBody UpdateWorkstationRequest request) {
        Workstation ws = workstationRepository.findById(workstationId)
                .orElseThrow(() -> new BusinessException("Workstation not found", HttpStatus.NOT_FOUND));

        if (!ws.getStore().getId().equals(storeId)) {
            throw new BusinessException("Workstation does not belong to the requested store", HttpStatus.FORBIDDEN);
        }

        if (request.getName() != null) ws.setName(request.getName());
        if (request.getCode() != null) ws.setCode(request.getCode());
        if (request.getWorkstationType() != null) ws.setWorkstationType(request.getWorkstationType());
        if (request.getX() != null) ws.setX(request.getX());
        if (request.getY() != null) ws.setY(request.getY());
        if (request.getZ() != null) ws.setZ(request.getZ());
        if (request.getCapacity() != null) ws.setCapacity(request.getCapacity());
        if (request.getIsActive() != null) ws.setIsActive(request.getIsActive());

        if (request.getZoneId() != null) {
            StoreZone zone = storeZoneRepository.findById(request.getZoneId()).orElse(null);
            ws.setZone(zone);
        }

        ws = workstationRepository.save(ws);
        return ResponseEntity.ok(toWorkstationDto(ws));
    }

    @Operation(summary = "Delete a workstation from a store")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @DeleteMapping("/workstations/{workstationId}")
    public ResponseEntity<Void> deleteWorkstation(@PathVariable UUID storeId, @PathVariable UUID workstationId) {
        Workstation ws = workstationRepository.findById(workstationId)
                .orElseThrow(() -> new BusinessException("Workstation not found", HttpStatus.NOT_FOUND));

        if (!ws.getStore().getId().equals(storeId)) {
            throw new BusinessException("Workstation does not belong to the requested store", HttpStatus.FORBIDDEN);
        }

        workstationRepository.delete(ws);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Run 3D Spatial Allocation for a shift")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping("/shifts/{shiftId}/allocate-zones")
    public ResponseEntity<SpatialAllocationResultDto> allocateZones(@PathVariable UUID storeId, @PathVariable UUID shiftId) {
        SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(storeId, shiftId);
        return ResponseEntity.ok(result);
    }

    private StoreZoneDto toZoneDto(StoreZone zone, UUID storeId) {
        return StoreZoneDto.builder()
                .id(zone.getId())
                .storeId(storeId)
                .name(zone.getName())
                .code(zone.getCode())
                .zoneType(zone.getZoneType())
                .parentZoneId(zone.getParentZone() != null ? zone.getParentZone().getId() : null)
                .color(zone.getColor())
                .description(zone.getDescription())
                .x(zone.getX())
                .y(zone.getY())
                .z(zone.getZ())
                .widthDim(zone.getWidthDim())
                .lengthDim(zone.getLengthDim())
                .heightDim(zone.getHeightDim())
                .capacity(zone.getCapacity())
                .build();
    }

    private WorkstationDto toWorkstationDto(Workstation ws) {
        return WorkstationDto.builder()
                .id(ws.getId())
                .storeId(ws.getStore().getId())
                .zoneId(ws.getZone() != null ? ws.getZone().getId() : null)
                .zoneName(ws.getZone() != null ? ws.getZone().getName() : null)
                .name(ws.getName())
                .code(ws.getCode())
                .workstationType(ws.getWorkstationType())
                .x(ws.getX())
                .y(ws.getY())
                .z(ws.getZ())
                .capacity(ws.getCapacity())
                .isActive(ws.getIsActive())
                .createdAt(ws.getCreatedAt())
                .updatedAt(ws.getUpdatedAt())
                .build();
    }
}
