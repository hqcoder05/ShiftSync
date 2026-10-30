package com.shiftsync.store.service;

import com.shiftsync.store.dto.StoreConfigurationUpdateRequest;
import com.shiftsync.store.entity.*;
import com.shiftsync.store.repository.*;
import com.shiftsync.shift.service.ShiftTemplateService;
import com.shiftsync.audit.service.AuditLogService;
import org.junit.jupiter.api.*;
import java.time.LocalTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AvailabilityPolicyConfigurationTest {
    private final UUID storeId=UUID.randomUUID();
    private final StoreConfigurationRepository configs=mock(StoreConfigurationRepository.class);
    private final StoreRepository stores=mock(StoreRepository.class);
    private final StoreConfigurationService service=new StoreConfigurationService(mock(AuditLogService.class),configs,stores,mock(ShiftTemplateService.class));
    @BeforeEach void setup() {
        when(stores.findById(storeId)).thenReturn(Optional.of(Store.builder().id(storeId).openTime(LocalTime.of(6,0)).closeTime(LocalTime.of(23,0)).build()));
        when(stores.save(any())).thenAnswer(call->call.getArgument(0));
        when(configs.save(any())).thenAnswer(call->call.getArgument(0));
    }
    private StoreConfigurationUpdateRequest request(Integer tolerance) {
        var request=new StoreConfigurationUpdateRequest();request.setOpenTime(LocalTime.of(6,0));request.setCloseTime(LocalTime.of(23,0));
        request.setMaxHourPerWeek(48);request.setMinRestHours(8);request.setGeofenceRadiusM(100);request.setAvailabilityDeadlineHours(24);
        request.setAllowedCheckInMinutes(30);request.setAllowedCheckOutMinutes(60);request.setLateGraceMinutes(5);request.setEarlyLeaveGraceMinutes(5);
        request.setAvailabilityToleranceMinutes(tolerance);return request;
    }
    @Test void missingConfigurationReportsExactCoverageByDefault() {
        assertEquals(0,service.getStoreConfiguration(storeId).getAvailabilityToleranceMinutes());
    }
    @Test void configuredToleranceIsSavedAndReturned() {
        var config=StoreConfiguration.builder().storeId(storeId).availabilityToleranceMinutes(30).build();
        when(configs.findByStoreId(storeId)).thenReturn(Optional.of(config));
        assertEquals(60,service.updateStoreConfiguration(storeId,request(60),null).getAvailabilityToleranceMinutes());
        assertEquals(60,service.getStoreConfiguration(storeId).getAvailabilityToleranceMinutes());
    }
    @Test void oldClientOmittingFieldDoesNotResetAnExplicitPolicy() {
        var config=StoreConfiguration.builder().storeId(storeId).availabilityToleranceMinutes(30).build();
        when(configs.findByStoreId(storeId)).thenReturn(Optional.of(config));
        assertEquals(30,service.updateStoreConfiguration(storeId,request(null),null).getAvailabilityToleranceMinutes());
    }
    @Test void exactCoverageCanBeRestoredExplicitly() {
        when(configs.findByStoreId(storeId)).thenReturn(Optional.of(StoreConfiguration.builder().availabilityToleranceMinutes(30).build()));
        assertEquals(0,service.updateStoreConfiguration(storeId,request(0),null).getAvailabilityToleranceMinutes());
    }
    @Test void apiValidationAcceptsOnlyZeroToSixtyOrOmission() {
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            for(Integer valid:Arrays.asList(null,0,1,30,60)) assertTrue(validator.validate(request(valid)).isEmpty());
            assertFalse(validator.validate(request(-1)).isEmpty());assertFalse(validator.validate(request(61)).isEmpty());
        }
    }
}
