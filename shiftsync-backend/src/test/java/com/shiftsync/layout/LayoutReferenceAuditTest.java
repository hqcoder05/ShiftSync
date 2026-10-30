package com.shiftsync.layout;

import com.shiftsync.layout.controller.LayoutController;
import com.shiftsync.layout.dto.*;
import com.shiftsync.layout.entity.*;
import com.shiftsync.layout.repository.*;
import com.shiftsync.layout.service.SpatialAllocationService;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Characterizes reference-integrity defects; not desired acceptance behavior. */
class LayoutReferenceAuditTest {
    final StoreZoneRepository zones=mock(StoreZoneRepository.class);
    final WorkstationRepository stations=mock(WorkstationRepository.class);
    final LayoutController controller=new LayoutController(mock(StoreLayoutRepository.class),zones,stations,
            mock(StoreRepository.class),mock(SpatialAllocationService.class));

    @Test void workstationCanReferenceZoneFromAnotherStore() {
        var a=Store.builder().id(UUID.randomUUID()).build();
        var b=Store.builder().id(UUID.randomUUID()).build();
        var station=Workstation.builder().id(UUID.randomUUID()).store(a).build();
        var foreign=StoreZone.builder().id(UUID.randomUUID()).store(b).name("Private zone B").build();
        when(stations.findById(station.getId())).thenReturn(Optional.of(station));
        when(zones.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        when(stations.save(station)).thenReturn(station);
        var result=controller.updateWorkstation(a.getId(),station.getId(),UpdateWorkstationRequest.builder().zoneId(foreign.getId()).build());
        assertSame(foreign,station.getZone());
        assertEquals("Private zone B",result.getBody().getZoneName());
    }

    @Test void zoneCanBecomeItsOwnParent() {
        var store=Store.builder().id(UUID.randomUUID()).build();
        var zone=StoreZone.builder().id(UUID.randomUUID()).store(store).build();
        when(zones.findById(zone.getId())).thenReturn(Optional.of(zone));
        when(zones.save(zone)).thenReturn(zone);
        controller.updateZone(store.getId(),zone.getId(),UpdateZoneRequest.builder().parentZoneId(zone.getId()).build());
        assertSame(zone,zone.getParentZone());
    }
}
