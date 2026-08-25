package com.shiftsync.store.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.dto.StoreConfigurationDTO;
import com.shiftsync.store.dto.StoreConfigurationUpdateRequest;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StoreConfigurationService {
    private final AuditLogService auditLogService;

    private final StoreConfigurationRepository storeConfigurationRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public StoreConfigurationDTO getStoreConfiguration(UUID storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));
        
        StoreConfiguration config = storeConfigurationRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    // Return default if not exists
                    StoreConfiguration defaultConfig = new StoreConfiguration();
                    defaultConfig.setStoreId(storeId);
                    return defaultConfig;
                });
        
        return mapToDTO(store, config);
    }

    @Transactional
    public StoreConfigurationDTO updateStoreConfiguration(UUID storeId, StoreConfigurationUpdateRequest request, UUID actorId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        // Update Store open/close times
        store.setOpenTime(request.getOpenTime());
        store.setCloseTime(request.getCloseTime());
        storeRepository.save(store);

        // Update or Create StoreConfiguration
        StoreConfiguration config = storeConfigurationRepository.findByStoreId(storeId)
                .orElse(new StoreConfiguration());
        
        config.setStoreId(storeId);
        config.setMaxHourPerWeek(request.getMaxHourPerWeek());
        config.setMinRestHours(request.getMinRestHours());
        config.setGeofenceRadiusM(request.getGeofenceRadiusM());
        config.setAvailabilityDeadlineHours(request.getAvailabilityDeadlineHours());
        config.setAllowedCheckInMinutes(request.getAllowedCheckInMinutes());
        config.setAllowedCheckOutMinutes(request.getAllowedCheckOutMinutes());
        config.setLateGraceMinutes(request.getLateGraceMinutes());
        config.setEarlyLeaveGraceMinutes(request.getEarlyLeaveGraceMinutes());

        StoreConfiguration savedConfig = storeConfigurationRepository.save(config);

        return mapToDTO(store, savedConfig);
    }

    private StoreConfigurationDTO mapToDTO(Store store, StoreConfiguration config) {
        return StoreConfigurationDTO.builder()
                .id(config.getId())
                .storeId(store.getId())
                .openTime(store.getOpenTime())
                .closeTime(store.getCloseTime())
                .maxHourPerWeek(config.getMaxHourPerWeek())
                .minRestHours(config.getMinRestHours())
                .geofenceRadiusM(config.getGeofenceRadiusM())
                .availabilityDeadlineHours(config.getAvailabilityDeadlineHours())
                .allowedCheckInMinutes(config.getAllowedCheckInMinutes())
                .allowedCheckOutMinutes(config.getAllowedCheckOutMinutes())
                .lateGraceMinutes(config.getLateGraceMinutes())
                .earlyLeaveGraceMinutes(config.getEarlyLeaveGraceMinutes())
                .build();
    }
}
