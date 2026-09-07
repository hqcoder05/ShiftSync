package com.shiftsync.layout.service;

import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SpatialAllocationServiceTest {

    @Mock
    private StoreZoneRepository storeZoneRepository;

    @Mock
    private StoreLayoutRepository storeLayoutRepository;

    @Mock
    private ShiftRepository shiftRepository;

    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @InjectMocks
    private SpatialAllocationService spatialAllocationService;

    private Store store;
    private Shift shift;
    private UUID shiftId;
    private StoreLayout layout;
    
    @BeforeEach
    void setUp() {
        store = new Store();
        store.setId(UUID.randomUUID());

        shiftId = UUID.randomUUID();
        shift = new Shift();
        shift.setId(shiftId);
        shift.setStore(store);

        layout = new StoreLayout();
        layout.setStore(store);
        layout.setLength(10.0);
        layout.setWidth(10.0);
        layout.setHeight(1.0);
    }

    @Test
    void testAllocateZonesForShift_GreedyMaxMinDispersion() {
        // Arrange
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));
        
        ShiftAssignment a1 = new ShiftAssignment(); a1.setId(UUID.randomUUID());
        ShiftAssignment a2 = new ShiftAssignment(); a2.setId(UUID.randomUUID());
        ShiftAssignment a3 = new ShiftAssignment(); a3.setId(UUID.randomUUID());
        List<ShiftAssignment> assignments = Arrays.asList(a1, a2, a3);
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(assignments);

        StoreZone zCenter = StoreZone.builder().id(UUID.randomUUID()).x(5.0).y(5.0).z(0.0).capacity(1).build(); // closest to center (5,5,0.5)
        StoreZone zTopLeft = StoreZone.builder().id(UUID.randomUUID()).x(0.0).y(0.0).z(0.0).capacity(1).build();
        StoreZone zBottomRight = StoreZone.builder().id(UUID.randomUUID()).x(10.0).y(10.0).z(0.0).capacity(1).build();
        StoreZone zCloseToCenter = StoreZone.builder().id(UUID.randomUUID()).x(4.0).y(4.0).z(0.0).capacity(1).build();

        List<StoreZone> zones = Arrays.asList(zCenter, zTopLeft, zBottomRight, zCloseToCenter);
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(zones);
        when(storeLayoutRepository.findByStoreId(store.getId())).thenReturn(Optional.of(layout));

        // Act
        spatialAllocationService.allocateZonesForShift(shiftId);

        // Assert
        verify(shiftAssignmentRepository).saveAll(assignments);
        
        // 1st staff should get zCenter (closest to 5,5,0.5)
        assertEquals(zCenter.getId(), a1.getZone().getId());
        
        // 2nd staff should get either zTopLeft or zBottomRight (furthest from center)
        assertTrue(a2.getZone().getId().equals(zTopLeft.getId()) || a2.getZone().getId().equals(zBottomRight.getId()));
        
        // 3rd staff should get the other one of (zTopLeft or zBottomRight) because that maximizes minimum distance
        assertTrue(a3.getZone().getId().equals(zTopLeft.getId()) || a3.getZone().getId().equals(zBottomRight.getId()));
        assertNotEquals(a2.getZone().getId(), a3.getZone().getId());
    }
}
