package com.shiftsync.layout;
import com.shiftsync.layout.controller.StoreDesignController;
import com.shiftsync.layout.service.StoreDesignService;
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
class StoreDesignAuthorizationTest {
 @Configuration @EnableMethodSecurity(proxyTargetClass=true) static class Config {
  @Bean StoreDesignService service(){return mock(StoreDesignService.class);}
  @Bean StoreAccessService storeAccessService(){return mock(StoreAccessService.class);}
  @Bean StoreDesignController controller(StoreDesignService service){return new StoreDesignController(service);}
 }
 AnnotationConfigApplicationContext context;StoreDesignController controller;UUID storeId=UUID.randomUUID();
 @BeforeEach void setup(){context=new AnnotationConfigApplicationContext(Config.class);controller=context.getBean(StoreDesignController.class);}
 @AfterEach void close(){SecurityContextHolder.clearContext();context.close();}
 void login(String role,boolean allowed){var auth=new UsernamePasswordAuthenticationToken("test","unused",List.of(new SimpleGrantedAuthority("ROLE_"+role)));SecurityContextHolder.getContext().setAuthentication(auth);when(context.getBean(StoreAccessService.class).canAccessStore(auth,storeId)).thenReturn(allowed);}
 @Test void staffReadsOwnStoreButCannotSave(){login("STAFF",true);assertDoesNotThrow(()->controller.latest(storeId));assertDoesNotThrow(()->controller.versions(storeId));assertThrows(AccessDeniedException.class,()->controller.save(storeId,new StoreDesignController.Save(0,null)));}
 @Test void managerCannotReadOrSaveForeignStore(){login("MANAGER",false);assertThrows(AccessDeniedException.class,()->controller.latest(storeId));assertThrows(AccessDeniedException.class,()->controller.version(storeId,1));assertThrows(AccessDeniedException.class,()->controller.save(storeId,new StoreDesignController.Save(0,null)));}
 @Test void ownManagerAndAdminCanSave(){login("MANAGER",true);assertDoesNotThrow(()->controller.save(storeId,new StoreDesignController.Save(0,null)));login("ADMIN",false);assertDoesNotThrow(()->controller.save(storeId,new StoreDesignController.Save(0,null)));}
}
