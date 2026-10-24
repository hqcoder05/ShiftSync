package com.shiftsync.layout;
import com.shiftsync.layout.dto.*;
import com.shiftsync.layout.entity.*;
import com.shiftsync.layout.repository.*;
import com.shiftsync.layout.service.EquipmentService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class EquipmentServiceTest {
 WorkstationRepository workstations = mock(WorkstationRepository.class);
 EquipmentRepository equipment = mock(EquipmentRepository.class);
 EquipmentService service = new EquipmentService(workstations, equipment);
 UUID storeId = UUID.randomUUID(), wsId = UUID.randomUUID();
 Workstation ws;
 @BeforeEach void setup() {
  Store store = new Store(); store.setId(storeId);
  ws = new Workstation(); ws.setId(wsId); ws.setStore(store);
  when(workstations.findById(wsId)).thenReturn(Optional.of(ws));
 }
 @Test void emptyInventoryIsEmpty() {
  when(equipment.findByWorkstationIdOrderByCodeAsc(wsId)).thenReturn(List.of());
  assertTrue(service.list(storeId, wsId).isEmpty());
 }
 @Test void foreignStoreCannotReadOrWrite() {
  UUID foreign = UUID.randomUUID();
  assertThrows(BusinessException.class, () -> service.list(foreign, wsId));
  assertThrows(BusinessException.class, () -> service.save(foreign, wsId, null, null));
  verifyNoInteractions(equipment);
 }
 @Test void createsRealEquipmentWithStation() {
  when(equipment.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
  EquipmentDto result = service.save(storeId, wsId, null, new EquipmentRequest(" Espresso ", " E1 ", "COFFEE_MACHINE", Equipment.Status.MAINTENANCE, null));
  assertEquals(wsId, result.workstationId()); assertEquals("E1", result.code());
  assertEquals(Equipment.Status.MAINTENANCE, result.status());
 }
 @Test void cannotUpdateEquipmentFromAnotherStation() {
  UUID id = UUID.randomUUID(); Equipment e = new Equipment();
  Workstation other = new Workstation(); other.setId(UUID.randomUUID()); e.setWorkstation(other);
  when(equipment.findById(id)).thenReturn(Optional.of(e));
  assertThrows(BusinessException.class, () -> service.save(storeId, wsId, id, null));
  verify(equipment, never()).saveAndFlush(any());
 }
 @Test void duplicateCodeRejected() {
  when(equipment.existsByWorkstationIdAndCodeAndIdNot(eq(wsId), eq("E1"), any())).thenReturn(true);
  assertThrows(BusinessException.class, () -> service.save(storeId, wsId, null, new EquipmentRequest("Machine", "E1", "POS", Equipment.Status.OPERATIONAL, null)));
 }
}
