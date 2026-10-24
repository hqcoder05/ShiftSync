package com.shiftsync.layout;
import com.shiftsync.layout.controller.EquipmentController;
import com.shiftsync.layout.dto.EquipmentRequest;
import com.shiftsync.layout.entity.Equipment;
import com.shiftsync.layout.service.EquipmentService;
import com.shiftsync.shared.security.StoreAccessService;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class EquipmentAuthorizationTest {
 @Configuration @EnableMethodSecurity(proxyTargetClass=true)
 static class Config {
  @Bean EquipmentService equipmentService() { return mock(EquipmentService.class); }
  @Bean StoreAccessService storeAccessService() { return mock(StoreAccessService.class); }
  @Bean EquipmentController controller(EquipmentService service) { return new EquipmentController(service); }
 }
 AnnotationConfigApplicationContext context;
 EquipmentController controller;
 UUID store = UUID.randomUUID(), ws = UUID.randomUUID();
 @BeforeEach void setup() {
  context = new AnnotationConfigApplicationContext(Config.class);
  controller = context.getBean(EquipmentController.class);
 }
 @AfterEach void close() { SecurityContextHolder.clearContext(); context.close(); }
 void login(String role, boolean allowed) {
  var auth = new UsernamePasswordAuthenticationToken("test", "unused", List.of(new SimpleGrantedAuthority("ROLE_" + role)));
  SecurityContextHolder.getContext().setAuthentication(auth);
  when(context.getBean(StoreAccessService.class).canAccessStore(auth, store)).thenReturn(allowed);
 }
 EquipmentRequest request() { return new EquipmentRequest("POS", "P1", "POS", Equipment.Status.OPERATIONAL, null); }
 @Test void staffCanReadOwnStoreButCannotWrite() {
  login("STAFF", true); assertDoesNotThrow(() -> controller.list(store, ws));
  assertThrows(AccessDeniedException.class, () -> controller.create(store, ws, request()));
  assertThrows(AccessDeniedException.class, () -> controller.update(store, ws, UUID.randomUUID(), request()));
 }
 @Test void managerCannotReadOrWriteForeignStore() {
  login("MANAGER", false);
  assertThrows(AccessDeniedException.class, () -> controller.list(store, ws));
  assertThrows(AccessDeniedException.class, () -> controller.create(store, ws, request()));
 }
 @Test void managerCanWriteOwnStore() {
  login("MANAGER", true); assertDoesNotThrow(() -> controller.create(store, ws, request()));
 }
 @Test void adminCanAccessStore() {
  login("ADMIN", false); assertDoesNotThrow(() -> controller.list(store, ws));
  assertDoesNotThrow(() -> controller.create(store, ws, request()));
 }
}
