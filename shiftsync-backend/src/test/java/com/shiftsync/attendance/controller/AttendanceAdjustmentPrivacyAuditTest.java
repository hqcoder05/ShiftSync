package com.shiftsync.attendance.controller;

import com.shiftsync.attendance.entity.AttendanceAdjustmentRequest;
import com.shiftsync.attendance.enums.AdjustmentStatus;
import com.shiftsync.attendance.repository.AttendanceAdjustmentRequestRepository;
import com.shiftsync.attendance.service.AttendanceAdjustmentService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.*;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real controller security and list service; repositories mocked. */
@SpringJUnitConfig(AttendanceAdjustmentPrivacyAuditTest.Config.class)
class AttendanceAdjustmentPrivacyAuditTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity @Import(AttendanceAdjustmentController.class)
    static class Config {
        @Bean StoreAccessService storeAccessService(EmploymentRepository repository) { return new StoreAccessService(repository); }
        @Bean AttendanceAdjustmentService service(AttendanceAdjustmentRequestRepository repository) {
            // Only the list branch is exercised; it uses this repository and DTO mapping.
            return new AttendanceAdjustmentService(null,repository,null,null,null,null,null,null,null,null);
        }
    }
    @MockitoBean AttendanceAdjustmentRequestRepository repository;
    @MockitoBean EmploymentRepository employment;
    @MockitoBean com.shiftsync.store.repository.StoreRepository payrollStores;
    @Autowired AttendanceAdjustmentController controller;
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    @Test void managerWithoutStoreAccessCannotReadForeignAdjustmentReasons() {
        var foreign=Store.builder().id(UUID.randomUUID()).build();
        var actor=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        var principal=new CustomUserDetails(actor);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        assertThrows(AccessDeniedException.class,()->controller.getRequests(foreign.getId(),null));
        actor.setSystemRole(SystemRole.MANAGER);
        var auth=new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        assertThrows(AccessDeniedException.class,()->controller.getRequests(foreign.getId(),null));
        verifyNoInteractions(repository);
    }

    @Test void managerCanReadAdjustmentsAtManagedStore() {
        var storeId=UUID.randomUUID();
        var manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.MANAGER).build();
        var principal=new CustomUserDetails(manager);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        when(employment.isStaffInStore(manager.getId(),storeId,com.shiftsync.employment.enums.EmploymentStatus.ACTIVE)).thenReturn(true);
        assertEquals(200,controller.getRequests(storeId,null).getStatusCode().value());
        verify(repository).findByShiftStoreId(storeId);
    }
}
