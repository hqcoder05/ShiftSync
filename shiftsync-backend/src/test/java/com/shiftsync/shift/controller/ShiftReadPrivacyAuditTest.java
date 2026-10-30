package com.shiftsync.shift.controller;

import com.shiftsync.auth.controller.UserController;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.service.UserService;
import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.shift.service.*;
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
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Actual controller authorization, read services and mapping; repository/eligibility data mocked. */
@SpringJUnitConfig(ShiftReadPrivacyAuditTest.Config.class)
class ShiftReadPrivacyAuditTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity @Import({ShiftController.class,UserController.class})
    static class Config {
        @Bean StoreAccessService storeAccessService(EmploymentRepository repository){return new StoreAccessService(repository);}
        @Bean ShiftService shiftService(ShiftRepository shifts,StoreRepository stores,ShiftAssignmentRepository assignments,
                                       EmploymentRepository employment,ShiftAssignmentValidator validator) {
            return new ShiftService(null,shifts,stores,null,null,null,assignments,null,null,null,null,null,employment,validator,null);
        }
    }
    @MockitoBean ShiftRepository shifts;
    @MockitoBean StoreRepository stores;
    @MockitoBean ShiftAssignmentRepository assignments;
    @MockitoBean EmploymentRepository employment;
    @MockitoBean ShiftAssignmentValidator validator;
    @MockitoBean AutoScheduleService solver;
    @MockitoBean SchedulingPlanService plans;
    @MockitoBean UserService users;
    @Autowired ShiftController controller;
    @Autowired UserController userController;
    final Store store=Store.builder().id(UUID.randomUUID()).name("Audit store").build();
    final User actor=User.builder().id(UUID.randomUUID()).fullName("Audit staff").systemRole(SystemRole.STAFF).build();
    CustomUserDetails principal;
    @BeforeEach void authenticate() {
        principal=new CustomUserDetails(actor);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        when(stores.existsById(store.getId())).thenReturn(true);
        when(employment.isStaffInStore(actor.getId(),store.getId(),EmploymentStatus.ACTIVE)).thenReturn(true);
    }
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    Shift shift(ShiftStatus status) {
        return Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(LocalDate.of(2030,11,4))
                .startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).status(status).build();
    }
    @Test void personalScheduleRoutesExposeDraftHiddenByOrdinaryStaffScheduleList() {
        var draft=shift(ShiftStatus.DRAFT);draft.setNote("Unpublished staffing plan");
        var published=shift(ShiftStatus.PUBLISHED);
        var pendingAssignment=ShiftAssignment.builder().id(UUID.randomUUID()).staff(actor).shift(draft).build();
        var publishedAssignment=ShiftAssignment.builder().id(UUID.randomUUID()).staff(actor).shift(published).build();
        draft.getAssignments().add(pendingAssignment);published.getAssignments().add(publishedAssignment);
        when(shifts.findByStoreId(store.getId())).thenReturn(List.of(draft,published));
        when(assignments.findByStaffId(actor.getId())).thenReturn(List.of(pendingAssignment,publishedAssignment));
        var ordinary=controller.getShiftsByStoreId(store.getId(),null,null,principal).getBody();
        assertEquals(1,ordinary.size());assertEquals(published.getId(),ordinary.get(0).getId());
        var personal=controller.getMyShiftsInStore(store.getId(),principal).getBody();
        var globalPersonal=userController.getMyShifts(principal).getBody();
        assertEquals(2,personal.size());assertEquals(2,globalPersonal.size());
        for(var result:List.of(personal,globalPersonal)) {
            var exposed=result.stream().filter(s->s.getId().equals(draft.getId())).findFirst().orElseThrow();
            assertEquals(ShiftStatus.DRAFT,exposed.getStatus());assertEquals("Unpublished staffing plan",exposed.getNote());
        }
    }
    @Test void ordinaryStaffCanReadCoworkerPayFromEligibleCandidateEndpoint() {
        var shift=shift(ShiftStatus.PUBLISHED);
        var coworker=User.builder().id(UUID.randomUUID()).fullName("Coworker").systemRole(SystemRole.STAFF).build();
        var row=Employment.builder().id(UUID.randomUUID()).store(store).user(coworker).status(EmploymentStatus.ACTIVE)
                .hourlyRate(new BigDecimal("98765")).contractType(ContractType.builder().name("Contract")
                        .defaultHourlyRate(new BigDecimal("54321")).build()).build();
        when(shifts.findById(shift.getId())).thenReturn(Optional.of(shift));
        when(employment.findByStoreIdAndStatus(store.getId(),EmploymentStatus.ACTIVE)).thenReturn(List.of(row));
        when(validator.isEligible(shift,coworker.getId())).thenReturn(true);
        var result=controller.getEligibleStaff(store.getId(),shift.getId());
        assertEquals(200,result.getStatusCode().value());
        assertNotEquals(actor.getId(),result.getBody().get(0).getStaffId());
        assertEquals(new BigDecimal("98765"),result.getBody().get(0).getHourlyRate());
        assertEquals(new BigDecimal("54321"),result.getBody().get(0).getContractType().getDefaultHourlyRate());
    }
}
