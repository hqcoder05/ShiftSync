package com.shiftsync.store.service;

import com.shiftsync.store.dto.StoreSupportDTO;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class StoreSupportServiceTest {
    StoreConfigurationRepository configs = mock(StoreConfigurationRepository.class);
    StoreRepository stores = mock(StoreRepository.class);
    StoreSupportService service = new StoreSupportService(configs, stores);
    UUID store = UUID.randomUUID();
    @Test void unconfiguredStoreNeverInventsAContact() {
        when(stores.existsById(store)).thenReturn(true); when(configs.findByStoreId(store)).thenReturn(Optional.empty());
        assertEquals(new StoreSupportDTO(store, null, null), service.get(store)); verify(configs, never()).save(any());
    }
    @Test void savingAndClearingContactPreservesAllOperationalSettings() {
        when(stores.existsById(store)).thenReturn(true);
        StoreConfiguration config = StoreConfiguration.builder().storeId(store).geofenceRadiusM(250).allowedCheckInMinutes(15).build();
        when(configs.findByStoreId(store)).thenReturn(Optional.of(config));
        assertEquals("+84901234567", service.save(store, new StoreSupportDTO(store, "+84901234567", " Quản lý trực ")).supportPhone());
        assertEquals("Quản lý trực", config.getSupportLabel()); assertEquals(250, config.getGeofenceRadiusM());
        service.save(store, new StoreSupportDTO(store, "", "Should also clear"));
        assertNull(config.getSupportPhone()); assertNull(config.getSupportLabel()); assertEquals(15, config.getAllowedCheckInMinutes());
    }
    @Test void foreignPayloadInvalidPhoneAndUnknownStoreFail() {
        when(stores.existsById(store)).thenReturn(true);
        assertThrows(BusinessException.class, () -> service.save(store, new StoreSupportDTO(UUID.randomUUID(), "0901234567", "")));
        assertThrows(BusinessException.class, () -> service.save(store, new StoreSupportDTO(store, "*#123#", "")));
        assertEquals(404, assertThrows(BusinessException.class, () -> service.get(UUID.randomUUID())).getStatus().value());
        verify(configs, never()).save(any());
    }
}
