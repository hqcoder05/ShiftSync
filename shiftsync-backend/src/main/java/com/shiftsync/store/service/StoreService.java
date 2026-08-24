package com.shiftsync.store.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.dto.StoreCreateRequest;
import com.shiftsync.store.dto.StoreDTO;
import com.shiftsync.store.dto.StoreUpdateRequest;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.mapper.StoreMapper;
import com.shiftsync.store.repository.StoreRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    @Transactional
    public StoreDTO createStore(StoreCreateRequest request) {
        validateStoreBusinessRules(request);

        Store store = Store.builder()
                .name(request.getName())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .openTime(request.getOpenTime())
                .closeTime(request.getCloseTime())
                .build();

        Store savedStore = storeRepository.save(store);
        return StoreMapper.toDTO(savedStore);
    }

    @Transactional(readOnly = true)
    public Page<StoreDTO> getAllStores(Pageable pageable) {
        return storeRepository.findAll(pageable)
                .map(StoreMapper::toDTO);
    }

    @Transactional(readOnly = true)
    public Page<StoreDTO> searchStores(String search, Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return getAllStores(pageable);
        }
        return storeRepository.searchStores(search, pageable).map(StoreMapper::toDTO);
    }

    @Transactional(readOnly = true)
    public Page<StoreDTO> getMyStores(UUID staffId, String search, Pageable pageable) {
        String searchQuery = (search == null || search.trim().isEmpty()) ? null : search.trim();
        return storeRepository.findStoresByStaffId(staffId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE, searchQuery, pageable)
                .map(StoreMapper::toDTO);
    }

    @Transactional(readOnly = true)
    public StoreDTO getStoreById(UUID id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Store not found with id: " + id, HttpStatus.NOT_FOUND));
        return StoreMapper.toDTO(store);
    }

    @Transactional
    public StoreDTO updateStore(UUID id, StoreUpdateRequest request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Store not found with id: " + id, HttpStatus.NOT_FOUND));

        validateStoreBusinessRules(request);

        store.setName(request.getName());
        store.setAddress(request.getAddress());
        store.setLatitude(request.getLatitude());
        store.setLongitude(request.getLongitude());
        store.setOpenTime(request.getOpenTime());
        store.setCloseTime(request.getCloseTime());

        Store updatedStore = storeRepository.save(store);
        return StoreMapper.toDTO(updatedStore);
    }

    @Transactional
    public void deleteStore(UUID id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (storeRepository.hasActiveEmployees(id)) {
            throw new BusinessException("Cannot delete Store: Store has active employees.", HttpStatus.CONFLICT);
        }
        if (storeRepository.hasFuturePublishedShifts(id)) {
            throw new BusinessException("Cannot delete Store: Store has future published shifts.", HttpStatus.CONFLICT);
        }

        storeRepository.delete(store);
    }

    private void validateStoreBusinessRules(StoreCreateRequest request) {
        validateTimeAndCoordinates(request.getOpenTime(), request.getCloseTime(), request.getLatitude(), request.getLongitude());
    }

    private void validateStoreBusinessRules(StoreUpdateRequest request) {
        validateTimeAndCoordinates(request.getOpenTime(), request.getCloseTime(), request.getLatitude(), request.getLongitude());
    }

    private void validateTimeAndCoordinates(java.time.LocalTime openTime, java.time.LocalTime closeTime,
                                            java.math.BigDecimal latitude, java.math.BigDecimal longitude) {
        if (openTime != null && closeTime != null && !openTime.isBefore(closeTime)) {
            throw new BusinessException("Open time must be before close time", HttpStatus.BAD_REQUEST);
        }
        if (latitude != null) {
            if (latitude.compareTo(java.math.BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(java.math.BigDecimal.valueOf(90)) > 0) {
                throw new BusinessException("Latitude must be between -90 and 90", HttpStatus.BAD_REQUEST);
            }
        }
        if (longitude != null) {
            if (longitude.compareTo(java.math.BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(java.math.BigDecimal.valueOf(180)) > 0) {
                throw new BusinessException("Longitude must be between -180 and 180", HttpStatus.BAD_REQUEST);
            }
        }
    }
}
