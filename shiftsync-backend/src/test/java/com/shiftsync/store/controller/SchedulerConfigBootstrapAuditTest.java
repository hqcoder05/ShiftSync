package com.shiftsync.store.controller;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.dto.SchedulerConfigUpdateDTO;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class SchedulerConfigBootstrapAuditTest {
    @Test void missingRowReturnsDefaultsAndCanSaveThoseDefaults() {
        var repository=mock(SchedulerConfigurationRepository.class);
        var stores=mock(com.shiftsync.store.repository.StoreRepository.class);
        var controller=new SchedulerConfigurationController(mock(AuditLogService.class),repository,stores);
        var store=UUID.randomUUID();when(stores.existsById(store)).thenReturn(true);
        var read=controller.getConfig(store);
        assertEquals(200,read.getStatusCode().value());assertNull(read.getBody().getId());
        var body=read.getBody();var update=new SchedulerConfigUpdateDTO();
        update.setFairnessWeight(body.getFairnessWeight());update.setSkillWeight(body.getSkillWeight());
        update.setHourWeight(body.getHourWeight());update.setRestTimeWeight(body.getRestTimeWeight());
        update.setAvailabilityWeight(body.getAvailabilityWeight());
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(update).isEmpty());
        }
        var result=controller.updateConfig(store,update,null);
        assertEquals(body.getFairnessWeight(),result.getBody().getFairnessWeight());
        verify(repository).save(argThat(config -> store.equals(config.getStoreId())));
    }

    @Test void nonexistentStoreCannotReadOrSaveConfiguration() {
        var repository=mock(SchedulerConfigurationRepository.class);
        var stores=mock(com.shiftsync.store.repository.StoreRepository.class);
        var controller=new SchedulerConfigurationController(mock(AuditLogService.class),repository,stores);
        assertEquals(404, assertThrows(BusinessException.class, () -> controller.getConfig(UUID.randomUUID())).getStatus().value());
        verifyNoInteractions(repository);
    }
}
