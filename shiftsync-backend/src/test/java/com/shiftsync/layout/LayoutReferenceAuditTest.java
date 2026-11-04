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

/** Regression tests for zone reference integrity. */
class LayoutReferenceAuditTest {
    final StoreZoneRepository zones=mock(StoreZoneRepository.class);
    final WorkstationRepository stations=mock(WorkstationRepository.class);
    final StoreRepository stores=mock(StoreRepository.class);
    final LayoutController controller=new LayoutController(mock(StoreLayoutRepository.class),zones,stations,
            stores,mock(SpatialAllocationService.class));

    @Test void newWorkstationCannotReferenceZoneFromAnotherStore() {
        var a=Store.builder().id(UUID.randomUUID()).build();
        var b=Store.builder().id(UUID.randomUUID()).build();
        var foreign=StoreZone.builder().id(UUID.randomUUID()).store(b).build();
        when(stores.findById(a.getId())).thenReturn(Optional.of(a));
        when(zones.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                () -> controller.addWorkstation(a.getId(), CreateWorkstationRequest.builder()
                        .name("Counter").zoneId(foreign.getId()).x(0.0).y(0.0).z(0.0).build()));
        verify(stations,never()).save(any());
    }

    @Test void newZoneCannotReferenceParentFromAnotherStore() {
        var a=Store.builder().id(UUID.randomUUID()).build();
        var b=Store.builder().id(UUID.randomUUID()).build();
        var foreign=StoreZone.builder().id(UUID.randomUUID()).store(b).build();
        when(stores.findById(a.getId())).thenReturn(Optional.of(a));
        when(zones.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                () -> controller.addZone(a.getId(), CreateZoneRequest.builder()
                        .name("Kitchen").parentZoneId(foreign.getId()).x(0.0).y(0.0).z(0.0).capacity(1).build()));
        verify(zones,never()).save(any());
    }

    @Test void workstationCannotReferenceZoneFromAnotherStore() {
        var a=Store.builder().id(UUID.randomUUID()).build();
        var b=Store.builder().id(UUID.randomUUID()).build();
        var station=Workstation.builder().id(UUID.randomUUID()).store(a).build();
        var foreign=StoreZone.builder().id(UUID.randomUUID()).store(b).name("Private zone B").build();
        when(stations.findById(station.getId())).thenReturn(Optional.of(station));
        when(zones.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->controller.updateWorkstation(a.getId(),station.getId(),UpdateWorkstationRequest.builder().zoneId(foreign.getId()).build()));
        assertNull(station.getZone());
        verify(stations,never()).save(any());
    }

    @Test void zoneCannotBecomeItsOwnParent() {
        var store=Store.builder().id(UUID.randomUUID()).build();
        var zone=StoreZone.builder().id(UUID.randomUUID()).store(store).build();
        when(zones.findById(zone.getId())).thenReturn(Optional.of(zone));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->controller.updateZone(store.getId(),zone.getId(),UpdateZoneRequest.builder().parentZoneId(zone.getId()).build()));
        assertNull(zone.getParentZone());
        verify(zones,never()).save(any());
    }

    @Test void zoneCannotBecomeChildOfItsDescendant() {
        var store=Store.builder().id(UUID.randomUUID()).build();
        var root=StoreZone.builder().id(UUID.randomUUID()).store(store).build();
        var child=StoreZone.builder().id(UUID.randomUUID()).store(store).parentZone(root).build();
        when(zones.findById(root.getId())).thenReturn(Optional.of(root));
        when(zones.findById(child.getId())).thenReturn(Optional.of(child));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->controller.updateZone(store.getId(),root.getId(),UpdateZoneRequest.builder().parentZoneId(child.getId()).build()));
        verify(zones,never()).save(any());
    }
}
