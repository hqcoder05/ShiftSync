package com.shiftsync.store.controller;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.store.dto.SchedulerConfigurationDTO;
import com.shiftsync.store.entity.SchedulerConfiguration;
import com.shiftsync.store.repository.SchedulerConfigurationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SchedulerConfigurationControllerTest {

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private SchedulerConfigurationRepository repository;

    @InjectMocks
    private SchedulerConfigurationController controller;

    @Test
    public void testGetConfig_WhenExists_ReturnsExistingConfig() {
        UUID storeId = UUID.randomUUID();
        SchedulerConfiguration config = SchedulerConfiguration.builder()
                .id(UUID.randomUUID())
                .storeId(storeId)
                .fairnessWeight(new BigDecimal("0.200"))
                .skillWeight(new BigDecimal("0.250"))
                .hourWeight(new BigDecimal("0.200"))
                .restTimeWeight(new BigDecimal("0.150"))
                .availabilityWeight(new BigDecimal("0.200"))
                .build();

        when(repository.findByStoreId(storeId)).thenReturn(Optional.of(config));

        ResponseEntity<SchedulerConfigurationDTO> response = controller.getConfig(storeId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(storeId, response.getBody().getStoreId());
        assertEquals(new BigDecimal("0.200"), response.getBody().getFairnessWeight());
    }

    @Test
    public void testGetConfig_WhenNotExists_ReturnsDefaultConfig() {
        UUID storeId = UUID.randomUUID();
        when(repository.findByStoreId(storeId)).thenReturn(Optional.empty());

        ResponseEntity<SchedulerConfigurationDTO> response = controller.getConfig(storeId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(storeId, response.getBody().getStoreId());
        assertEquals(new BigDecimal("0.200"), response.getBody().getFairnessWeight());
        assertEquals(new BigDecimal("0.250"), response.getBody().getSkillWeight());
        assertEquals(new BigDecimal("0.200"), response.getBody().getHourWeight());
        assertEquals(new BigDecimal("0.150"), response.getBody().getRestTimeWeight());
        assertEquals(new BigDecimal("0.200"), response.getBody().getAvailabilityWeight());
    }
}