package com.shiftsync.shift.service;

import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import com.shiftsync.shift.dto.ShiftTemplateCreateRequest;
import com.shiftsync.shift.dto.ShiftTemplateDTO;
import com.shiftsync.shift.dto.ShiftTemplateUpdateRequest;
import com.shiftsync.shift.entity.ShiftTemplate;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftTemplateService {

    private final ShiftTemplateRepository shiftTemplateRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public List<ShiftTemplateDTO> getTemplatesByStoreId(UUID storeId) {
        verifyStoreExists(storeId);
        return shiftTemplateRepository.findByStoreId(storeId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ShiftTemplateDTO createTemplate(UUID storeId, ShiftTemplateCreateRequest request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found with id: " + storeId, HttpStatus.NOT_FOUND));

        validateTimeWithStore(store, request.getStartTime(), request.getEndTime());
        
        if (shiftTemplateRepository.existsByStoreIdAndName(storeId, request.getName())) {
            throw new BusinessException("Template name already exists in this store", HttpStatus.CONFLICT);
        }

        ShiftTemplate template = ShiftTemplate.builder()
                .store(store)
                .name(request.getName())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .isActive(true)
                .build();

        template = shiftTemplateRepository.save(template);
        return mapToDTO(template);
    }

    @Transactional
    public ShiftTemplateDTO updateTemplate(UUID storeId, UUID templateId, ShiftTemplateUpdateRequest request) {
        ShiftTemplate template = shiftTemplateRepository.findByIdAndStoreId(templateId, storeId)
                .orElseThrow(() -> new BusinessException("Shift template not found in this store", HttpStatus.NOT_FOUND));

        validateTimeWithStore(template.getStore(), request.getStartTime(), request.getEndTime());
        
        if (shiftTemplateRepository.existsByStoreIdAndNameAndIdNot(storeId, request.getName(), templateId)) {
            throw new BusinessException("Template name already exists in this store", HttpStatus.CONFLICT);
        }

        template.setName(request.getName());
        template.setStartTime(request.getStartTime());
        template.setEndTime(request.getEndTime());

        template = shiftTemplateRepository.save(template);
        return mapToDTO(template);
    }

    @Transactional
    public void deleteTemplate(UUID storeId, UUID templateId) {
        ShiftTemplate template = shiftTemplateRepository.findByIdAndStoreId(templateId, storeId)
                .orElseThrow(() -> new BusinessException("Shift template not found in this store", HttpStatus.NOT_FOUND));
        
        shiftTemplateRepository.delete(template); // Soft delete is handled by @SQLDelete
    }

    @Transactional
    public int deactivateOutOfBoundsTemplates(Store store) {
        if (store == null || store.getId() == null) return 0;
        List<ShiftTemplate> templates = shiftTemplateRepository.findByStoreId(store.getId());
        int count = 0;
        for (ShiftTemplate t : templates) {
            boolean outOfBounds = (store.getOpenTime() != null && t.getStartTime().isBefore(store.getOpenTime()))
                    || (store.getCloseTime() != null && t.getEndTime().isAfter(store.getCloseTime()));
            if (outOfBounds && t.isActive()) {
                t.setActive(false);
                shiftTemplateRepository.save(t);
                count++;
            }
        }
        return count;
    }

    private void validateTimeWithStore(Store store, java.time.LocalTime startTime, java.time.LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new BusinessException("Start time must be before end time", HttpStatus.BAD_REQUEST);
        }
        if (store != null) {
            if (store.getOpenTime() != null && startTime.isBefore(store.getOpenTime())) {
                throw new BusinessException("Giờ bắt đầu ca mẫu (" + startTime + ") không được trước giờ mở cửa chi nhánh (" + store.getOpenTime() + ")", HttpStatus.BAD_REQUEST);
            }
            if (store.getCloseTime() != null && endTime.isAfter(store.getCloseTime())) {
                throw new BusinessException("Giờ kết thúc ca mẫu (" + endTime + ") không được sau giờ đóng cửa chi nhánh (" + store.getCloseTime() + ")", HttpStatus.BAD_REQUEST);
            }
        }
    }

    private void verifyStoreExists(UUID storeId) {
        if (!storeRepository.existsById(storeId)) {
            throw new BusinessException("Store not found with id: " + storeId, HttpStatus.NOT_FOUND);
        }
    }

    private ShiftTemplateDTO mapToDTO(ShiftTemplate entity) {
        Store s = entity.getStore();
        boolean withinHours = true;
        if (s != null) {
            if (s.getOpenTime() != null && entity.getStartTime().isBefore(s.getOpenTime())) {
                withinHours = false;
            }
            if (s.getCloseTime() != null && entity.getEndTime().isAfter(s.getCloseTime())) {
                withinHours = false;
            }
        }
        return ShiftTemplateDTO.builder()
                .id(entity.getId())
                .storeId(s != null ? s.getId() : null)
                .name(entity.getName())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .isActive(entity.isActive())
                .isWithinOperatingHours(withinHours)
                .build();
    }
}
