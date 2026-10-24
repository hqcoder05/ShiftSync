package com.shiftsync.layout.controller;
import com.shiftsync.layout.dto.*;
import com.shiftsync.layout.service.EquipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequiredArgsConstructor
@RequestMapping("/api/stores/{storeId}/workstations/{workstationId}/equipment")
public class EquipmentController {
 private final EquipmentService service;
 @GetMapping
 @PreAuthorize("hasRole('ADMIN') or @storeAccessService.canAccessStore(authentication, #storeId)")
 public List<EquipmentDto> list(@PathVariable UUID storeId, @PathVariable UUID workstationId) { return service.list(storeId, workstationId); }
 @PostMapping
 @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
 public EquipmentDto create(@PathVariable UUID storeId, @PathVariable UUID workstationId, @Valid @RequestBody EquipmentRequest request) { return service.save(storeId, workstationId, null, request); }
 @PutMapping("/{equipmentId}")
 @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
 public EquipmentDto update(@PathVariable UUID storeId, @PathVariable UUID workstationId, @PathVariable UUID equipmentId, @Valid @RequestBody EquipmentRequest request) { return service.save(storeId, workstationId, equipmentId, request); }
}
