package com.shiftsync.store.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.dto.StoreSupportDTO;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class StoreSupportService {
    private final StoreConfigurationRepository configurations;
    private final StoreRepository stores;

    @Transactional(readOnly = true)
    public StoreSupportDTO get(UUID storeId) {
        requireStore(storeId);
        return configurations.findByStoreId(storeId)
                .map(config -> new StoreSupportDTO(storeId, config.getSupportPhone(), config.getSupportLabel()))
                .orElseGet(() -> new StoreSupportDTO(storeId, null, null));
    }

    @Transactional
    public StoreSupportDTO save(UUID storeId, StoreSupportDTO request) {
        requireStore(storeId);
        if (request.storeId() != null && !storeId.equals(request.storeId()))
            throw new BusinessException("Liên hệ không thuộc chi nhánh đang chọn.", HttpStatus.BAD_REQUEST);
        StoreConfiguration config = configurations.findByStoreId(storeId).orElseGet(StoreConfiguration::new);
        config.setStoreId(storeId);
        String phone = clean(request.supportPhone()), label = clean(request.supportLabel());
        if (phone != null && !phone.matches("\\+?[0-9]{3,15}"))
            throw new BusinessException("Số hotline chưa đúng định dạng.", HttpStatus.BAD_REQUEST);
        if (label != null && label.length() > 80)
            throw new BusinessException("Tên liên hệ tối đa 80 ký tự.", HttpStatus.BAD_REQUEST);
        config.setSupportPhone(phone);
        config.setSupportLabel(phone == null ? null : label);
        configurations.save(config);
        return new StoreSupportDTO(storeId, config.getSupportPhone(), config.getSupportLabel());
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private void requireStore(UUID storeId) {
        if (!stores.existsById(storeId)) throw new BusinessException("Không tìm thấy chi nhánh.", HttpStatus.NOT_FOUND);
    }
}
