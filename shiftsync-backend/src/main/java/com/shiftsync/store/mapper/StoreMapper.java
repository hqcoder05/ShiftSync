package com.shiftsync.store.mapper;

import com.shiftsync.store.dto.StoreDTO;
import com.shiftsync.store.entity.Store;

public class StoreMapper {

    public static StoreDTO toDTO(Store store) {
        if (store == null) {
            return null;
        }
        return StoreDTO.builder()
                .id(store.getId())
                .name(store.getName())
                .address(store.getAddress())
                .latitude(store.getLatitude())
                .longitude(store.getLongitude())
                .openTime(store.getOpenTime())
                .closeTime(store.getCloseTime())
                .createdAt(store.getCreatedAt())
                .build();
    }
}
