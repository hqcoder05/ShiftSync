package com.shiftsync.auth;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.controller.UserController;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.auth.service.UserService;
import com.shiftsync.shared.security.*;
import com.shiftsync.shift.service.ShiftService;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real method-security proxy + MVC binding + real service/BCrypt; mocked database. */
@SpringJUnitConfig(UserPrivilegeAuditTest.Config.class)
class UserPrivilegeAuditTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity @Import(UserController.class)
    static class Config {
        @Bean UserService users(UserRepository repository,AuditLogService audit) {
            return new UserService(repository,new BCryptPasswordEncoder(),audit);
        }
    }
    @Autowired UserController controller;
    @MockitoBean UserRepository repository;
    @MockitoBean AuditLogService audit;
    @MockitoBean ShiftService shifts;
    MockMvc mvc;
    User admin;

    @BeforeEach void setup() {
        var manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.MANAGER).fullName("Manager A").build();
        var details=new CustomUserDetails(manager);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(details,null,details.getAuthorities()));
        admin=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.ADMIN).email("admin@audit.invalid")
                .fullName("Administrator").passwordHash("original-hash").build();
        when(repository.findById(admin.getId())).thenReturn(Optional.of(admin));
        mvc=MockMvcBuilders.standaloneSetup(controller).setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
    }
    @AfterEach void clear(){SecurityContextHolder.clearContext();}

    @Test void managerHttpRequestCanResetAdministratorPassword() throws Exception {
        when(repository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(repository.save(admin)).thenReturn(admin);
        mvc.perform(put("/api/users/"+admin.getId()).contentType("application/json")
                .content("{\"fullName\":\"Administrator\",\"email\":\"admin@audit.invalid\",\"password\":\"AuditPassword123\"}"))
                .andExpect(status().isOk());
        assertTrue(new BCryptPasswordEncoder().matches("AuditPassword123",admin.getPasswordHash()));
        assertEquals(SystemRole.ADMIN,admin.getSystemRole());
        verify(repository).save(admin);
    }

    @Test void managerHttpRequestCanReadAdministratorProfile() throws Exception {
        var result=mvc.perform(get("/api/users/"+admin.getId())).andExpect(status().isOk()).andReturn();
        assertTrue(result.getResponse().getContentAsString().contains("admin@audit.invalid"));
    }
}
