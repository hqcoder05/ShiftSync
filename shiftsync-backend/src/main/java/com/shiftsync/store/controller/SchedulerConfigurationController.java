package com.shiftsync.store.controller;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.dto.SchedulerConfigUpdateDTO;
import com.shiftsync.store.dto.SchedulerConfigurationDTO;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/scheduler-config")
@RequiredArgsConstructor
@Tag(name = "Scheduler Configuration API", description = "Operations for scheduler configuration")
public class SchedulerConfigurationController {
    private final AuditLogService auditLogService;

    private final SchedulerConfigurationRepository repository;

    @Operation(summary = "Update scheduler configuration weights")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PutMapping
    public ResponseEntity<SchedulerConfigurationDTO> updateConfig(
            @PathVariable UUID storeId,
            @Valid @RequestBody SchedulerConfigUpdateDTO dto, @org.springframework.security.core.annotation.AuthenticationPrincipal com.shiftsync.shared.security.CustomUserDetails userDetails) {
        
        BigDecimal sum = dto.getFairnessWeight()
                .add(dto.getSkillWeight())
                .add(dto.getHourWeight())
                .add(dto.getRestTimeWeight())
                .add(dto.getAvailabilityWeight());
                
        if (sum.compareTo(BigDecimal.ONE) != 0) {
            throw new BusinessException("Sum of weights must be exactly 1.0", HttpStatus.BAD_REQUEST);
        }

        SchedulerConfiguration config = repository.findByStoreId(storeId)
                .orElseThrow(() -> new BusinessException("Config not found", HttpStatus.NOT_FOUND));

        
        java.util.Map<String, Object> beforeData = new java.util.HashMap<>();
        beforeData.put("fairnessWeight", config.getFairnessWeight());
        beforeData.put("skillWeight", config.getSkillWeight());
        beforeData.put("hourWeight", config.getHourWeight());
        beforeData.put("restTimeWeight", config.getRestTimeWeight());
        beforeData.put("availabilityWeight", config.getAvailabilityWeight());

        config.setFairnessWeight(dto.getFairnessWeight());
        config.setSkillWeight(dto.getSkillWeight());
        config.setHourWeight(dto.getHourWeight());
        config.setRestTimeWeight(dto.getRestTimeWeight());
        config.setAvailabilityWeight(dto.getAvailabilityWeight());

        repository.save(config);
        
        SchedulerConfigurationDTO responseDto = SchedulerConfigurationDTO.builder()
                .id(config.getId())
                .storeId(config.getStoreId())
                .fairnessWeight(config.getFairnessWeight())
                .skillWeight(config.getSkillWeight())
                .hourWeight(config.getHourWeight())
                .restTimeWeight(config.getRestTimeWeight())
                .availabilityWeight(config.getAvailabilityWeight())
                .build();
                
        
        auditLogService.log(userDetails != null ? userDetails.getId() : null, "UPDATE_SCHEDULER_CONFIG", "SchedulerConfiguration", storeId, 
                beforeData, 
                responseDto);

        return ResponseEntity.ok(responseDto);
    }
}
