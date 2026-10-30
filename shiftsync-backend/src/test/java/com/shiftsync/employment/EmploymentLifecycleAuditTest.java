package com.shiftsync.employment;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.auth.service.UserService;
import com.shiftsync.employment.controller.EmploymentController;
import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.*;
import com.shiftsync.employment.service.EmploymentService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.*;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real method-security, employment service, access checks and DTO mapping; repositories mocked. */
@SpringJUnitConfig(EmploymentLifecycleAuditTest.Config.class)
class EmploymentLifecycleAuditTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity
    @Import({EmploymentController.class,EmploymentService.class})
    static class Config {
        @Bean StoreAccessService storeAccessService(EmploymentRepository repository){return new StoreAccessService(repository);}
    }
    @MockitoBean EmploymentRepository employment;
    @MockitoBean UserRepository users;
    @MockitoBean StoreRepository stores;
    @MockitoBean ContractTypeRepository contracts;
    @Autowired EmploymentController controller;
    @Autowired StoreAccessService access;
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    UsernamePasswordAuthenticationToken authenticate(User user) {
        var principal=new CustomUserDetails(user);
        var auth=new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);return auth;
    }

    @Test void soleManagerCanRemoveOwnEmploymentAndLoseStoreAccess() {
        var store=Store.builder().id(UUID.randomUUID()).build();
        var manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.MANAGER).build();
        var row=Employment.builder().id(UUID.randomUUID()).store(store).user(manager).status(EmploymentStatus.ACTIVE).build();
        var auth=authenticate(manager);
        when(users.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(users.isSoleManagerOfAnyStore(manager.getId())).thenReturn(true);
        var rejected=assertThrows(BusinessException.class,()->new UserService(users,null,null).deleteUser(manager.getId(),manager.getId()));
        assertTrue(rejected.getMessage().contains("sole Manager"));
        when(employment.findByUserIdAndStatus(manager.getId(),EmploymentStatus.ACTIVE)).thenReturn(List.of(row));
        when(employment.isStaffInStore(manager.getId(),store.getId(),EmploymentStatus.ACTIVE))
                .thenAnswer(call->row.getStatus()==EmploymentStatus.ACTIVE);
        assertTrue(access.canAccessStore(auth,store.getId()));
        var result=controller.removeStaff(store.getId(),manager.getId());
        assertEquals(204,result.getStatusCode().value());
        assertEquals(EmploymentStatus.INACTIVE,row.getStatus());assertNotNull(row.getLeftDate());
        verify(employment).save(row);
        assertFalse(access.canAccessStore(auth,store.getId()));
        assertThrows(AccessDeniedException.class,()->controller.getStaffByStore(store.getId(),PageRequest.of(0,20)));
    }

    @Test void managerCanReadForeignEmploymentPayThroughStaffStoreLookup() {
        var actor=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        var subject=User.builder().id(UUID.randomUUID()).fullName("Foreign employee").systemRole(SystemRole.STAFF).build();
        var foreign=Store.builder().id(UUID.randomUUID()).name("Foreign store").build();
        var row=Employment.builder().id(UUID.randomUUID()).store(foreign).user(subject).status(EmploymentStatus.ACTIVE)
                .hourlyRate(new BigDecimal("98765")).contractType(ContractType.builder().id(UUID.randomUUID())
                        .name("Foreign contract").defaultHourlyRate(new BigDecimal("54321")).build()).build();
        var staffAuth=authenticate(actor);
        assertThrows(AccessDeniedException.class,()->controller.getStoresByStaff(subject.getId(),staffAuth));
        actor.setSystemRole(SystemRole.MANAGER);var managerAuth=authenticate(actor);
        assertFalse(access.canAccessStore(managerAuth,foreign.getId()));
        when(employment.findByUserIdAndStatus(subject.getId(),EmploymentStatus.ACTIVE)).thenReturn(List.of(row));
        var result=controller.getStoresByStaff(subject.getId(),managerAuth);
        assertEquals(200,result.getStatusCode().value());
        assertEquals(foreign.getId(),result.getBody().get(0).getStoreId());
        assertEquals(new BigDecimal("98765"),result.getBody().get(0).getHourlyRate());
        assertEquals(new BigDecimal("54321"),result.getBody().get(0).getContractType().getDefaultHourlyRate());
    }
}
