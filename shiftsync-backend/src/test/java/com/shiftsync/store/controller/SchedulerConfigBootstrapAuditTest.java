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
    @Test void missingRowReturnsDefaultsButCannotSaveEvenThoseValidDefaults() {
        var repository=mock(SchedulerConfigurationRepository.class);
        var controller=new SchedulerConfigurationController(mock(AuditLogService.class),repository);
        var store=UUID.randomUUID();var read=controller.getConfig(store);
        assertEquals(200,read.getStatusCode().value());assertNull(read.getBody().getId());
        var body=read.getBody();var update=new SchedulerConfigUpdateDTO();
        update.setFairnessWeight(body.getFairnessWeight());update.setSkillWeight(body.getSkillWeight());
        update.setHourWeight(body.getHourWeight());update.setRestTimeWeight(body.getRestTimeWeight());
        update.setAvailabilityWeight(body.getAvailabilityWeight());
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(update).isEmpty());
        }
        var rejected=assertThrows(BusinessException.class,()->controller.updateConfig(store,update,null));
        assertEquals("Config not found",rejected.getMessage());
        assertEquals(404,rejected.getStatus().value());
        verify(repository,never()).save(any());
    }
}
