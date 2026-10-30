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
        @Bean AttendanceAdjustmentService service(AttendanceAdjustmentRequestRepository repository) {
            // Only the list branch is exercised; it uses this repository and DTO mapping.
            return new AttendanceAdjustmentService(null,repository,null,null,null,null,null,null,null,null);
        }
    }
    @MockitoBean AttendanceAdjustmentRequestRepository repository;
    @Autowired AttendanceAdjustmentController controller;
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    @Test void managerWithoutStoreAccessCanReadForeignAdjustmentReasons() {
        var foreign=Store.builder().id(UUID.randomUUID()).build();
        var actor=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build();
        var principal=new CustomUserDetails(actor);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        assertThrows(AccessDeniedException.class,()->controller.getRequests(foreign.getId(),null));
        actor.setSystemRole(SystemRole.MANAGER);
        var auth=new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        assertFalse(new StoreAccessService(mock(EmploymentRepository.class)).canAccessStore(auth,foreign.getId()));
        var employee=User.builder().id(UUID.randomUUID()).fullName("Foreign employee").build();
        var shift=Shift.builder().id(UUID.randomUUID()).store(foreign).build();
        var request=AttendanceAdjustmentRequest.builder().id(UUID.randomUUID()).shift(shift).staff(employee)
                .status(AdjustmentStatus.PENDING).reason("Private correction reason").build();
        when(repository.findByShiftStoreId(foreign.getId())).thenReturn(List.of(request));
        var result=controller.getRequests(foreign.getId(),null);
        assertEquals(200,result.getStatusCode().value());
        assertEquals(employee.getId(),result.getBody().get(0).getStaffId());
        assertEquals("Private correction reason",result.getBody().get(0).getReason());
    }
}
