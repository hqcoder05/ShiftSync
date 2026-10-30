package com.shiftsync.shift.service;

import com.shiftsync.employment.entity.Employment;
import com.shiftsync.store.entity.StoreConfiguration;
import java.util.*;

final class StaffRestPolicy {
    private StaffRestPolicy() {}
    static int hours(Collection<Employment> employments, UUID targetStoreId, Map<UUID,StoreConfiguration> configs) {
        Set<UUID> stores=new HashSet<>();
        if(targetStoreId!=null) stores.add(targetStoreId);
        for(var employment:employments) if(employment.getStore()!=null) stores.add(employment.getStore().getId());
        return stores.stream().mapToInt(store -> configs.containsKey(store) ? validatedHours(configs.get(store)) : 8).max().orElse(8);
    }
    static int validatedHours(StoreConfiguration config) {
        Integer hours=config.getMinRestHours();
        if(hours==null||hours<0||hours>168) throw new com.shiftsync.shared.exception.BusinessException(
                "Minimum rest hours must be between 0 and 168",org.springframework.http.HttpStatus.BAD_REQUEST);
        return hours;
    }
}
