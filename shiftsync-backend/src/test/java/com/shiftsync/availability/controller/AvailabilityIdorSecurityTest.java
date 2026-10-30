package com.shiftsync.availability.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.service.AvailabilityService;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real method-security proxy, no application/database/Redis startup. */
@SpringJUnitConfig(AvailabilityIdorSecurityTest.SecurityConfiguration.class)
class AvailabilityIdorSecurityTest {
    @Configuration(proxyBeanMethods=false)
    @EnableMethodSecurity
    @Import(AvailabilityController.class)
    static class SecurityConfiguration {
        @Bean StoreAccessService storeAccessService(EmploymentRepository employments) {
            return new StoreAccessService(employments);
        }
    }

    @Autowired AvailabilityController controller;
    @MockitoBean AvailabilityService availability;
    @MockitoBean EmploymentRepository employments;

    private final UUID actor=UUID.randomUUID(),target=UUID.randomUUID();
    @AfterEach void clearAuthentication(){SecurityContextHolder.clearContext();}
    private void authenticate(SystemRole role) {
        var details=new CustomUserDetails(User.builder().id(actor).systemRole(role).email("security@test.invalid").fullName("Security test").passwordHash("unused").build());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(details,null,details.getAuthorities()));
    }
    @Test void managerCannotViewStaffAvailabilityOutsideManagedStores() {
        authenticate(SystemRole.MANAGER);
        assertThrows(org.springframework.security.authorization.AuthorizationDeniedException.class,()->controller.getStaffAvailability(target));
        verify(employments).countSharedStores(actor,target,EmploymentStatus.ACTIVE);
        verifyNoInteractions(availability);
    }
    @Test void managerWithSharedStoreCanViewStaffAvailability() {
        authenticate(SystemRole.MANAGER);
        when(employments.countSharedStores(actor,target,EmploymentStatus.ACTIVE)).thenReturn(1L);
        when(availability.getStaffAvailability(target)).thenReturn(List.of());
        assertEquals(200,controller.getStaffAvailability(target).getStatusCode().value());
        verify(availability).getStaffAvailability(target);
    }
    @Test void staffCanViewOwnAvailability() {
        authenticate(SystemRole.STAFF);when(availability.getStaffAvailability(actor)).thenReturn(List.of());
        assertEquals(200,controller.getStaffAvailability(actor).getStatusCode().value());
    }
    @Test void staffCannotViewOtherStaffAvailability() {
        authenticate(SystemRole.STAFF);
        assertThrows(org.springframework.security.authorization.AuthorizationDeniedException.class,()->controller.getStaffAvailability(target));
        verifyNoInteractions(availability);
    }
}
