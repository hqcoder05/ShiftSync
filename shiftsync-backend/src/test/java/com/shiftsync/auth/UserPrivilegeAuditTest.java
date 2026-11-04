package com.shiftsync.auth;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.controller.UserController;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.auth.service.UserService;
import com.shiftsync.shared.security.*;
import com.shiftsync.shared.exception.GlobalExceptionHandler;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
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
        @Bean UserService users(UserRepository repository,AuditLogService audit, EmploymentRepository employments) {
            return new UserService(repository,new BCryptPasswordEncoder(),audit,employments,null,null);
        }
    }
    @Autowired UserController controller;
    @MockitoBean UserRepository repository;
    @MockitoBean AuditLogService audit;
    @MockitoBean EmploymentRepository employments;
    @MockitoBean ShiftService shifts;
    MockMvc mvc;
    User admin;
    User manager;

    @BeforeEach void setup() {
        manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.MANAGER).fullName("Manager A").build();
        var details=new CustomUserDetails(manager);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(details,null,details.getAuthorities()));
        admin=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.ADMIN).email("admin@audit.invalid")
                .fullName("Administrator").passwordHash("original-hash").build();
        when(repository.findById(admin.getId())).thenReturn(Optional.of(admin));
        mvc=MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
    }
    @AfterEach void clear(){SecurityContextHolder.clearContext();}

    @Test void managerCannotResetAdministratorPassword() throws Exception {
        mvc.perform(put("/api/users/"+admin.getId()).contentType("application/json")
                .content("{\"fullName\":\"Administrator\",\"email\":\"admin@audit.invalid\",\"password\":\"AuditPassword123\"}"))
                .andExpect(status().isForbidden());
        assertEquals("original-hash",admin.getPasswordHash());
        assertEquals(SystemRole.ADMIN,admin.getSystemRole());
        verify(repository,never()).save(any());
    }

    @Test void managerCannotReadAdministratorOutsideTheirStores() throws Exception {
        mvc.perform(get("/api/users/"+admin.getId())).andExpect(status().isForbidden());
    }

    @Test void managerCanUpdateStaffInSharedStoreWithEmptyPassword() throws Exception {
        var staff=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).fullName("Staff")
                .email("staff@example.com").passwordHash("original").build();
        when(repository.findById(staff.getId())).thenReturn(Optional.of(staff));
        when(repository.findByEmail(staff.getEmail())).thenReturn(Optional.of(staff));
        when(repository.save(staff)).thenReturn(staff);
        when(employments.countSharedStores(manager.getId(),staff.getId(),EmploymentStatus.ACTIVE)).thenReturn(1L);
        mvc.perform(put("/api/users/"+staff.getId()).contentType("application/json")
                .content("{\"fullName\":\"Staff Updated\",\"email\":\"staff@example.com\",\"password\":\"\"}"))
                .andExpect(status().isOk());
        assertEquals("original",staff.getPasswordHash());
        assertEquals("Staff Updated",staff.getFullName());
    }
}
