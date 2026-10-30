package com.shiftsync.shift.service;

import com.shiftsync.quota.service.HeadcountQuotaService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.ShiftTemplateCreateRequest;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Characterizes inconsistent overnight support across templates and quotas. */
class OvernightOperatingHoursAuditTest {
    @Test void validOvernightTemplateIsRejectedDespiteEightHourIntervalSupport() {
        var store=Store.builder().id(UUID.randomUUID()).openTime(LocalTime.of(22,0)).closeTime(LocalTime.of(6,0)).build();
        var stores=mock(StoreRepository.class);var templates=mock(ShiftTemplateRepository.class);
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        var request=new ShiftTemplateCreateRequest();request.setName("Night");
        request.setStartTime(LocalTime.of(22,0));request.setEndTime(LocalTime.of(6,0));
        assertEquals(8,ShiftTimeRange.hours(com.shiftsync.shift.entity.Shift.builder()
                .shiftDate(LocalDate.of(2030,11,3)).startTime(request.getStartTime()).endTime(request.getEndTime()).build()));
        assertThrows(BusinessException.class,()->new ShiftTemplateService(templates,stores).createTemplate(store.getId(),request));
        verify(templates,never()).save(any());
    }

    @Test void quotaUsesFourteenHourFallbackAndNegativeDurationForNightStore() {
        var service=mock(HeadcountQuotaService.class,CALLS_REAL_METHODS);
        var store=Store.builder().openTime(LocalTime.of(22,0)).closeTime(LocalTime.of(6,0)).build();
        assertEquals(LocalTime.of(5,0),service.getStoreMidTime(store)); // correct halfway point is 02:00
        Double hours=ReflectionTestUtils.invokeMethod(service,"durationHours",LocalTime.of(22,0),LocalTime.of(6,0));
        assertEquals(-16.0,hours);
    }
}
