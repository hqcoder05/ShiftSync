package com.shiftsync.layout.service;

import com.shiftsync.layout.dto.SpatialAllocationResultDto;
import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.*;

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

    @Mock
    private SkillRepository skillRepository;

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
    void testAllocateZones_2Employees_5Zones_Leaves3Unoccupied() {
        // CASE A: 5 zones, 2 employees -> 2 occupied zones, 3 unoccupied zones. VALID RESULT.
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

        ShiftAssignment a1 = new ShiftAssignment(); a1.setId(UUID.randomUUID());
        ShiftAssignment a2 = new ShiftAssignment(); a2.setId(UUID.randomUUID());
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(new ArrayList<>(Arrays.asList(a1, a2)));

        StoreZone z1 = StoreZone.builder().id(UUID.randomUUID()).name("Zone 1 (Center)").x(5.0).y(5.0).z(0.0).capacity(2).build();
        StoreZone z2 = StoreZone.builder().id(UUID.randomUUID()).name("Zone 2 (Corner)").x(0.0).y(0.0).z(0.0).capacity(2).build();
        StoreZone z3 = StoreZone.builder().id(UUID.randomUUID()).name("Zone 3 (Corner)").x(10.0).y(10.0).z(0.0).capacity(2).build();
        StoreZone z4 = StoreZone.builder().id(UUID.randomUUID()).name("Zone 4").x(10.0).y(0.0).z(0.0).capacity(2).build();
        StoreZone z5 = StoreZone.builder().id(UUID.randomUUID()).name("Zone 5").x(0.0).y(10.0).z(0.0).capacity(2).build();

        List<StoreZone> zones = new ArrayList<>(Arrays.asList(z1, z2, z3, z4, z5));
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(zones);
        when(storeLayoutRepository.findByStoreId(store.getId())).thenReturn(Optional.of(layout));

        SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(2, result.getTotalAssignedStaff());
        assertEquals(2, result.getAllocatedStaffCount());
        assertEquals(0, result.getUnallocatedStaffCount());
        assertEquals(5, result.getTotalZonesCount());
        assertEquals(2, result.getOccupiedZonesCount());
        assertEquals(3, result.getUnoccupiedZonesCount());

        assertNotNull(a1.getZone());
        assertNotNull(a2.getZone());
        assertNotEquals(a1.getZone().getId(), a2.getZone().getId());
    }

    @Test
    void testAllocateZones_3Employees_5Zones() {
        // CASE B: 5 zones, 3 employees -> 3 occupied zones, 2 unoccupied zones.
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

        ShiftAssignment a1 = new ShiftAssignment(); a1.setId(UUID.randomUUID());
        ShiftAssignment a2 = new ShiftAssignment(); a2.setId(UUID.randomUUID());
        ShiftAssignment a3 = new ShiftAssignment(); a3.setId(UUID.randomUUID());
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(new ArrayList<>(Arrays.asList(a1, a2, a3)));

        StoreZone zCenter = StoreZone.builder().id(UUID.randomUUID()).name("Center").x(5.0).y(5.0).z(0.0).capacity(1).build();
        StoreZone zTopLeft = StoreZone.builder().id(UUID.randomUUID()).name("TopLeft").x(0.0).y(0.0).z(0.0).capacity(1).build();
        StoreZone zBottomRight = StoreZone.builder().id(UUID.randomUUID()).name("BottomRight").x(10.0).y(10.0).z(0.0).capacity(1).build();
        StoreZone zSide1 = StoreZone.builder().id(UUID.randomUUID()).name("Side 1").x(1.0).y(5.0).z(0.0).capacity(1).build();
        StoreZone zSide2 = StoreZone.builder().id(UUID.randomUUID()).name("Side 2").x(9.0).y(5.0).z(0.0).capacity(1).build();

        List<StoreZone> zones = new ArrayList<>(Arrays.asList(zCenter, zTopLeft, zBottomRight, zSide1, zSide2));
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(zones);
        when(storeLayoutRepository.findByStoreId(store.getId())).thenReturn(Optional.of(layout));

        SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);

        assertEquals("SUCCESS", result.getStatus());
        assertEquals(3, result.getAllocatedStaffCount());
        assertEquals(3, result.getOccupiedZonesCount());
        assertEquals(2, result.getUnoccupiedZonesCount());
    }

    @Test
    void testAllocateZones_CapacityConstraint_RespectedWithoutOverbooking() {
        // Capacity strictly respected: 2 zones each with capacity 1. Total capacity = 2.
        // 3 employees assigned to shift -> exactly 2 allocated, 1 unallocated. NOT silently overbooked!
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

        ShiftAssignment a1 = new ShiftAssignment(); a1.setId(UUID.randomUUID());
        ShiftAssignment a2 = new ShiftAssignment(); a2.setId(UUID.randomUUID());
        ShiftAssignment a3 = new ShiftAssignment(); a3.setId(UUID.randomUUID());
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(new ArrayList<>(Arrays.asList(a1, a2, a3)));

        StoreZone z1 = StoreZone.builder().id(UUID.randomUUID()).name("Z1").x(2.0).y(2.0).z(0.0).capacity(1).build();
        StoreZone z2 = StoreZone.builder().id(UUID.randomUUID()).name("Z2").x(8.0).y(8.0).z(0.0).capacity(1).build();

        List<StoreZone> zones = new ArrayList<>(Arrays.asList(z1, z2));
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(zones);
        when(storeLayoutRepository.findByStoreId(store.getId())).thenReturn(Optional.of(layout));

        SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);

        assertEquals("PARTIAL", result.getStatus());
        assertEquals(3, result.getTotalAssignedStaff());
        assertEquals(2, result.getAllocatedStaffCount());
        assertEquals(1, result.getUnallocatedStaffCount());
        assertEquals(2, result.getOccupiedZonesCount());
        assertEquals(0, result.getUnoccupiedZonesCount());

        // Exactly one of the assignments must remain unallocated (zone == null)
        long unallocatedAssignments = Arrays.asList(a1, a2, a3).stream().filter(a -> a.getZone() == null).count();
        assertEquals(1, unallocatedAssignments);
    }

    @Test
    void testAllocateZones_ElevatedZCoordinate_Influences3DDispersion() {
        // Center is at (0, 0, 0).
        StoreLayout centeredLayout = new StoreLayout();
        centeredLayout.setLength(0.0);
        centeredLayout.setWidth(0.0);
        centeredLayout.setHeight(0.0);

        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

        ShiftAssignment a1 = new ShiftAssignment(); a1.setId(UUID.randomUUID());
        ShiftAssignment a2 = new ShiftAssignment(); a2.setId(UUID.randomUUID());
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(new ArrayList<>(Arrays.asList(a1, a2)));

        // Zone 0: At Center (0, 0, 0)
        StoreZone zCenter = StoreZone.builder().id(UUID.randomUUID()).name("Center").x(0.0).y(0.0).z(0.0).capacity(1).build();
        // Zone A: At (3, 4, 0). 2D distance to center = sqrt(9 + 16) = 5.0. 3D distance = 5.0.
        StoreZone zGround = StoreZone.builder().id(UUID.randomUUID()).name("Ground").x(3.0).y(4.0).z(0.0).capacity(1).build();
        // Zone B: At (3, 4, 12). 2D distance to center = 5.0. 3D distance = sqrt(25 + 144) = 13.0!
        StoreZone zElevated = StoreZone.builder().id(UUID.randomUUID()).name("Elevated Mezzanine").x(3.0).y(4.0).z(12.0).capacity(1).build();

        List<StoreZone> zones = new ArrayList<>(Arrays.asList(zCenter, zGround, zElevated));
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(zones);
        when(storeLayoutRepository.findByStoreId(store.getId())).thenReturn(Optional.of(centeredLayout));

        SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);

        assertEquals("SUCCESS", result.getStatus());
        assertEquals(zCenter.getId(), a1.getZone().getId());
        // In 2D, zGround and zElevated are equidistant (5.0 == 5.0).
        // In genuine 3D, zElevated is at distance 13.0 > 5.0.
        // Therefore, Max-Min 3D dispersion MUST pick zElevated!
        assertEquals(zElevated.getId(), a2.getZone().getId());
    }

    @Test
    void testAllocateZones_Security_IdorPrevention_ThrowsForbidden() {
        // Shift belongs to Store A, but caller passes Store B
        UUID differentStoreId = UUID.randomUUID();
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                spatialAllocationService.allocateZonesForShift(differentStoreId, shiftId));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("Shift does not belong to the requested store", ex.getMessage());
    }

    @Test
    void testAllocateZones_Idempotency_ProducesIdenticalResult() {
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

        ShiftAssignment a1 = new ShiftAssignment(); a1.setId(UUID.randomUUID());
        ShiftAssignment a2 = new ShiftAssignment(); a2.setId(UUID.randomUUID());
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(new ArrayList<>(Arrays.asList(a1, a2)));

        StoreZone z1 = StoreZone.builder().id(UUID.fromString("11111111-0000-0000-0000-000000000001")).name("Z1").x(1.0).y(1.0).z(0.0).capacity(2).build();
        StoreZone z2 = StoreZone.builder().id(UUID.fromString("22222222-0000-0000-0000-000000000002")).name("Z2").x(9.0).y(9.0).z(0.0).capacity(2).build();

        List<StoreZone> zones = new ArrayList<>(Arrays.asList(z1, z2));
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(zones);
        when(storeLayoutRepository.findByStoreId(store.getId())).thenReturn(Optional.of(layout));

        SpatialAllocationResultDto res1 = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);
        UUID zoneIdStaff1 = a1.getZone().getId();
        UUID zoneIdStaff2 = a2.getZone().getId();

        // Run second time
        SpatialAllocationResultDto res2 = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);

        assertEquals(res1.getStatus(), res2.getStatus());
        assertEquals(res1.getAllocatedStaffCount(), res2.getAllocatedStaffCount());
        assertEquals(zoneIdStaff1, a1.getZone().getId());
        assertEquals(zoneIdStaff2, a2.getZone().getId());
    }

    @Test
    void testAllocateZones_EmptyAssignments_ReturnsNoStaffStatus() {
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(Collections.emptyList());

        StoreZone z1 = StoreZone.builder().id(UUID.randomUUID()).name("Z1").x(1.0).y(1.0).z(0.0).capacity(2).build();
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(Collections.singletonList(z1));

        SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);

        assertEquals("NO_STAFF", result.getStatus());
        assertEquals(0, result.getTotalAssignedStaff());
        assertEquals(0, result.getAllocatedStaffCount());
        assertEquals(0, result.getOccupiedZonesCount());
        assertEquals(1, result.getUnoccupiedZonesCount());
    }

    @Test
    void testAllocateZones_NoZonesConfigured_ThrowsBadRequest() {
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));
        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(Collections.emptyList());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                spatialAllocationService.allocateZonesForShift(store.getId(), shiftId));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("No 3D zones configured"));
    }

    @Test
    void testAllocateZones_MatchesSkillToCorrespondingZone() {
        // Skill-affinity test: Barista -> Barista Counter, Kitchen -> Kitchen & Bakery
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));

        UUID skillBaristaId = UUID.randomUUID();
        UUID skillKitchenId = UUID.randomUUID();

        com.shiftsync.skill.entity.Skill skillBarista = com.shiftsync.skill.entity.Skill.builder().id(skillBaristaId).name("Barista").build();
        com.shiftsync.skill.entity.Skill skillKitchen = com.shiftsync.skill.entity.Skill.builder().id(skillKitchenId).name("Kitchen").build();

        com.shiftsync.shift.entity.ShiftSkillRequirement req1 = com.shiftsync.shift.entity.ShiftSkillRequirement.builder()
                .id(UUID.randomUUID()).shift(shift).skill(skillBarista).requiredCount(1).build();
        com.shiftsync.shift.entity.ShiftSkillRequirement req2 = com.shiftsync.shift.entity.ShiftSkillRequirement.builder()
                .id(UUID.randomUUID()).shift(shift).skill(skillKitchen).requiredCount(1).build();
        shift.setRequirements(new ArrayList<>(Arrays.asList(req1, req2)));

        ShiftAssignment a1 = new ShiftAssignment(); a1.setId(UUID.randomUUID()); a1.setRequiredSkillId(skillBaristaId);
        ShiftAssignment a2 = new ShiftAssignment(); a2.setId(UUID.randomUUID()); a2.setRequiredSkillId(skillKitchenId);
        when(shiftAssignmentRepository.findByShiftId(shiftId)).thenReturn(new ArrayList<>(Arrays.asList(a1, a2)));

        StoreZone zoneBarista = StoreZone.builder().id(UUID.randomUUID()).name("Barista Counter").x(2.0).y(2.0).z(0.0).capacity(2).build();
        StoreZone zoneKitchen = StoreZone.builder().id(UUID.randomUUID()).name("Kitchen & Bakery").x(8.0).y(8.0).z(0.0).capacity(2).build();
        StoreZone zoneDining = StoreZone.builder().id(UUID.randomUUID()).name("Dining Hall Ground").x(5.0).y(5.0).z(0.0).capacity(5).build();

        when(storeZoneRepository.findByStoreId(store.getId())).thenReturn(new ArrayList<>(Arrays.asList(zoneBarista, zoneKitchen, zoneDining)));
        when(storeLayoutRepository.findByStoreId(store.getId())).thenReturn(Optional.of(layout));

        SpatialAllocationResultDto result = spatialAllocationService.allocateZonesForShift(store.getId(), shiftId);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(2, result.getAllocatedStaffCount());
        assertEquals(2, result.getOccupiedZonesCount());

        assertEquals(zoneBarista.getId(), a1.getZone().getId());
        assertEquals(zoneKitchen.getId(), a2.getZone().getId());
    }
}
