package com.shiftsync.employment;

import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.controller.EmploymentController;
import com.shiftsync.employment.dto.EmploymentDTO;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.service.EmploymentService;
import com.shiftsync.shared.security.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Verifies the current salary exposure through an actual method-security proxy. */
@SpringJUnitConfig(EmploymentPrivacyAuditTest.Config.class)
class EmploymentPrivacyAuditTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity @Import(EmploymentController.class)
    static class Config {
        @Bean StoreAccessService storeAccessService(EmploymentRepository repository){return new StoreAccessService(repository);}
    }
    @MockitoBean EmploymentRepository repository;
    @MockitoBean EmploymentService service;
    @Autowired EmploymentController controller;
    @AfterEach void clear(){SecurityContextHolder.clearContext();}

    @Test void staffCanReadCoworkerHourlyRateFromStoreRoster() {
        var store=UUID.randomUUID();var actor=UUID.randomUUID();var coworker=UUID.randomUUID();
        var principal=new CustomUserDetails(User.builder().id(actor).systemRole(SystemRole.STAFF).build());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        when(repository.isStaffInStore(actor,store,EmploymentStatus.ACTIVE)).thenReturn(true);
        var page=PageRequest.of(0,20);
        when(service.getStaffByStore(store,page)).thenReturn(new PageImpl<>(List.of(EmploymentDTO.builder()
                .staffId(coworker).hourlyRate(BigDecimal.valueOf(98765)).build())));
        var result=controller.getStaffByStore(store,page);
        assertEquals(200,result.getStatusCode().value());
        assertEquals(coworker,result.getBody().getContent().get(0).getStaffId());
        assertEquals(BigDecimal.valueOf(98765),result.getBody().getContent().get(0).getHourlyRate());
    }
}
