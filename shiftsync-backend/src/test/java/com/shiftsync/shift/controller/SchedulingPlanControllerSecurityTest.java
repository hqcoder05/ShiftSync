package com.shiftsync.shift.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.*;
import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringJUnitConfig(SchedulingPlanControllerSecurityTest.Security.class)
class SchedulingPlanControllerSecurityTest {
    @Configuration(proxyBeanMethods=false) @EnableMethodSecurity @Import(ShiftController.class)
    static class Security {
        @Bean StoreAccessService storeAccessService(EmploymentRepository repository){return new StoreAccessService(repository);}
    }
    @Autowired ShiftController controller;
    @MockitoBean ShiftService shifts;
    @MockitoBean AutoScheduleService solver;
    @MockitoBean SchedulingPlanService plans;
    @MockitoBean EmploymentRepository employments;
    private final UUID actor=UUID.randomUUID(),store=UUID.randomUUID(),plan=UUID.randomUUID();
    private CustomUserDetails authenticate(SystemRole role){
        var details=new CustomUserDetails(User.builder().id(actor).fullName("Plan actor").email("plan@test.invalid").passwordHash("unused").systemRole(role).build());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(details,null,details.getAuthorities()));return details;
    }
    @AfterEach void cleanup(){SecurityContextHolder.clearContext();}
    private void authorize(){when(employments.isStaffInStore(actor,store,EmploymentStatus.ACTIVE)).thenReturn(true);}
    @Test void staffCannotApplyAPlan(){
        var details=authenticate(SystemRole.STAFF);
        assertThrows(org.springframework.security.authorization.AuthorizationDeniedException.class,()->controller.applyAutoSchedulePlan(store,plan,details));verifyNoInteractions(plans);
    }
    @Test void managerCannotApplyAtAnUnmanagedStore(){
        var details=authenticate(SystemRole.MANAGER);
        assertThrows(org.springframework.security.authorization.AuthorizationDeniedException.class,()->controller.applyAutoSchedulePlan(store,plan,details));verifyNoInteractions(plans);
    }
    @Test void managerAppliesUsingTheAuthenticatedActor(){
        var details=authenticate(SystemRole.MANAGER);authorize();
        when(plans.apply(store,plan,actor)).thenReturn(AutoScheduleResult.builder().planApplied(true).build());
        assertTrue(controller.applyAutoSchedulePlan(store,plan,details).getBody().isPlanApplied());verify(plans).apply(store,plan,actor);verifyNoInteractions(solver);
    }
    @Test void adminStillPassesOwnIdentityToTheOwnerBoundService(){
        var details=authenticate(SystemRole.ADMIN);
        when(plans.apply(store,plan,actor)).thenReturn(AutoScheduleResult.builder().planApplied(true).build());
        assertTrue(controller.applyAutoSchedulePlan(store,plan,details).getBody().isPlanApplied());verifyNoInteractions(employments);
    }
    @Test void dryRunCreatesAStoredPreviewRatherThanCallingTheUnboundSolver(){
        var details=authenticate(SystemRole.MANAGER);authorize();var request=request(true);
        when(plans.preview(store,request,actor)).thenReturn(AutoScheduleResult.builder().dryRun(true).planId(plan).build());
        assertEquals(plan,controller.autoSchedule(store,request,details).getBody().getPlanId());verifyNoInteractions(solver);
    }
    @Test void explicitQuickScheduleRemainsAvailableAsASeparateAction(){
        var details=authenticate(SystemRole.MANAGER);authorize();var request=request(false);
        when(solver.autoSchedule(store,request)).thenReturn(AutoScheduleResult.builder().build());
        controller.autoSchedule(store,request,details);verify(solver).autoSchedule(store,request);verifyNoInteractions(plans);
    }
    private AutoScheduleRequest request(boolean dry){var request=new AutoScheduleRequest();request.setDryRun(dry);request.setStartDate(LocalDate.of(2030,11,3));request.setEndDate(request.getStartDate());return request;}
}
