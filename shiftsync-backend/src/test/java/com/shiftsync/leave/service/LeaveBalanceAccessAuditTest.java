package com.shiftsync.leave.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.controller.LeaveRequestController;
import com.shiftsync.leave.entity.LeaveBalance;
import com.shiftsync.leave.repository.LeaveBalanceRepository;
import com.shiftsync.shared.security.*;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
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
import static org.mockito.ArgumentMatchers.*;

/** Passing characterization: real controller authorization and balance service, mock storage. */
@SpringJUnitConfig(LeaveBalanceAccessAuditTest.Config.class)
class LeaveBalanceAccessAuditTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity
    @Import({LeaveRequestController.class,LeaveBalanceService.class})
    static class Config {}
    @MockitoBean LeaveRequestService requests;
    @MockitoBean LeaveBalanceRepository balances;
    @MockitoBean UserRepository users;
    @MockitoBean StoreRepository stores;
    @MockitoBean EmploymentRepository employment;
    @Autowired LeaveRequestController controller;
    @AfterEach void clear(){SecurityContextHolder.clearContext();}

    @Test void staffCanSeedFullTimeLeaveBalanceAtForeignStoreBeforeJoiningPartTime() {
        var user=User.builder().id(UUID.randomUUID()).fullName("Audit staff").systemRole(SystemRole.STAFF).build();
        var principal=new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        var foreign=Store.builder().id(UUID.randomUUID()).name("Foreign store").build();
        var control=Store.builder().id(UUID.randomUUID()).name("Unseeded store").build();
        Map<UUID,LeaveBalance> saved=new HashMap<>();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(stores.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        when(stores.findById(control.getId())).thenReturn(Optional.of(control));
        when(balances.findByStaffIdAndStoreIdAndYear(eq(user.getId()),any(),eq(2030)))
                .thenAnswer(call->Optional.ofNullable(saved.get(call.getArgument(1))));
        when(balances.save(any())).thenAnswer(call->{LeaveBalance row=call.getArgument(0);
            row.setId(UUID.randomUUID());saved.put(row.getStore().getId(),row);return row;});
        when(employment.findByUserIdAndStoreIdAndStatus(user.getId(),foreign.getId(),EmploymentStatus.ACTIVE)).thenReturn(List.of());
        // Actor has no employment in foreign: role-only controller guard still permits this GET.
        var seeded=controller.getMyLeaveBalance(foreign.getId(),2030,principal);
        assertEquals(200,seeded.getStatusCode().value());
        assertEquals("Foreign store",seeded.getBody().getStoreName());
        assertEquals(12,seeded.getBody().getAnnualEntitlement());
        assertTrue(saved.containsKey(foreign.getId()));

        var partTime=Employment.builder().user(user).contractType(ContractType.builder().name("PART_TIME").build()).build();
        when(employment.findByUserIdAndStoreIdAndStatus(user.getId(),foreign.getId(),EmploymentStatus.ACTIVE)).thenReturn(List.of(partTime));
        when(employment.findByUserIdAndStoreIdAndStatus(user.getId(),control.getId(),EmploymentStatus.ACTIVE)).thenReturn(List.of(partTime));
        var afterJoining=controller.getMyLeaveBalance(foreign.getId(),2030,principal).getBody();
        var fresh=controller.getMyLeaveBalance(control.getId(),2030,principal).getBody();
        assertEquals(12,afterJoining.getAnnualEntitlement());
        assertEquals(6,fresh.getAnnualEntitlement());
        assertEquals(seeded.getBody().getId(),afterJoining.getId());
    }
}
