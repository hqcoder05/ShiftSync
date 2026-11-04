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
    @Test void applyingSameTemplateTwiceReusesZonesAndWorkstations() {
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
        when(stores.findByIdForUpdate(storeId)).thenReturn(Optional.of(store));
        when(templates.findById(templateId)).thenReturn(Optional.of(template));
        List<StoreZone> savedZones=new ArrayList<>();
        List<Workstation> savedStations=new ArrayList<>();
        when(zones.findByStoreId(storeId)).thenAnswer(call -> new ArrayList<>(savedZones));
        when(workstations.findByStoreId(storeId)).thenAnswer(call -> new ArrayList<>(savedStations));
        when(zones.save(any())).thenAnswer(call->{StoreZone zone=call.getArgument(0);
            zone.setId(UUID.randomUUID());savedZones.add(zone);return zone;});
        when(workstations.save(any())).thenAnswer(call->{Workstation station=call.getArgument(0);
            station.setId(UUID.randomUUID());savedStations.add(station);return station;});
        var service=new StoreTemplateService(templates,stores,layouts,zones,workstations,new ObjectMapper());
        service.applyTemplateToStore(storeId,templateId);
        service.applyTemplateToStore(storeId,templateId);
        assertEquals(1,savedZones.size());assertEquals(1,savedStations.size());
        assertEquals(savedZones.get(0).getId(),savedStations.get(0).getZone().getId());
        verify(zones,times(2)).findByStoreId(storeId);
    }

    @Test void duplicateExistingResourceKeysRequireReconciliation() {
        var stores=mock(StoreRepository.class); var templates=mock(StoreTemplateRepository.class);
        var zones=mock(StoreZoneRepository.class); var stations=mock(WorkstationRepository.class);
        UUID storeId=UUID.randomUUID(), templateId=UUID.randomUUID();
        when(stores.findByIdForUpdate(storeId)).thenReturn(Optional.of(Store.builder().id(storeId).build()));
        when(templates.findById(templateId)).thenReturn(Optional.of(StoreTemplate.builder().id(templateId)
                .name("Template").category(StoreCategory.FOOD_BEVERAGE).format("Cafe").templateData("{}").build()));
        when(zones.findByStoreId(storeId)).thenReturn(List.of(StoreZone.builder().name("First").code(" POS ").build(),
                StoreZone.builder().name("Second").code("pos").build()));
        var service=new StoreTemplateService(templates,stores,mock(StoreLayoutRepository.class),zones,stations,new ObjectMapper());
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->service.applyTemplateToStore(storeId,templateId));
        assertEquals(409,error.getStatus().value());
        verify(zones,never()).save(any());
    }
}
