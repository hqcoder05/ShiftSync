package com.shiftsync.store.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.layout.entity.*;
import com.shiftsync.layout.repository.*;
import com.shiftsync.store.entity.*;
import com.shiftsync.store.enums.StoreCategory;
import com.shiftsync.store.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

/** Passing characterizations document defects, not desired acceptance behavior. */
class StoreTemplateAuditTest {
    @Test void applyingSameTemplateTwiceCreatesDuplicateZonesAndWorkstations() {
        var stores=mock(StoreRepository.class);
        var templates=mock(StoreTemplateRepository.class);
        var layouts=mock(StoreLayoutRepository.class);
        var zones=mock(StoreZoneRepository.class);
        var workstations=mock(WorkstationRepository.class);
        UUID storeId=UUID.randomUUID(),templateId=UUID.randomUUID();
        var store=Store.builder().id(storeId).build();
        var template=StoreTemplate.builder().id(templateId).name("Cafe")
                .category(StoreCategory.FOOD_BEVERAGE).format("Cafe").templateData("""
                {"zones":[{"name":"Counter","code":"COUNTER","capacity":2}],
                 "workstations":[{"name":"Till","code":"TILL","zoneName":"Counter","capacity":1}]}
                """).build();
        when(stores.findById(storeId)).thenReturn(Optional.of(store));
        when(templates.findById(templateId)).thenReturn(Optional.of(template));
        List<StoreZone> savedZones=new ArrayList<>();
        List<Workstation> savedStations=new ArrayList<>();
        when(zones.save(any())).thenAnswer(call->{StoreZone zone=call.getArgument(0);
            zone.setId(UUID.randomUUID());savedZones.add(zone);return zone;});
        when(workstations.save(any())).thenAnswer(call->{Workstation station=call.getArgument(0);
            station.setId(UUID.randomUUID());savedStations.add(station);return station;});
        var service=new StoreTemplateService(templates,stores,layouts,zones,workstations,new ObjectMapper());
        service.applyTemplateToStore(storeId,templateId);
        service.applyTemplateToStore(storeId,templateId);
        assertEquals(2,savedZones.size());assertEquals(2,savedStations.size());
        assertEquals(savedZones.get(0).getCode(),savedZones.get(1).getCode());
        assertNotEquals(savedZones.get(0).getId(),savedZones.get(1).getId());
        assertEquals(savedStations.get(0).getCode(),savedStations.get(1).getCode());
        assertNotEquals(savedStations.get(0).getZone().getId(),savedStations.get(1).getZone().getId());
        verify(zones,never()).findByStoreId(storeId);
    }
}
