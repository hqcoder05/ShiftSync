package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.*;
import com.shiftsync.shift.repository.*;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.*;
import com.shiftsync.store.service.DashboardService;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Cross-service characterizations; aggregate repository values follow current query semantics.
 * Actual JPQL/PostgreSQL execution is deliberately not claimed.
 */
class DashboardCoverageAuditTest {
    record Comparison(AutoScheduleResult schedule,double dashboardCoverage) {}
    Comparison compare(boolean includeUnfilledRole) {
        var shifts=mock(ShiftRepository.class);var assignments=mock(ShiftAssignmentRepository.class);
        var employment=mock(EmploymentRepository.class);var skills=mock(StaffSkillRepository.class);
        var availability=mock(AvailabilityRepository.class);var blackouts=mock(BlackoutDateRepository.class);
        var configs=mock(StoreConfigurationRepository.class);var scoring=mock(SchedulerConfigurationRepository.class);
        var store=UUID.randomUUID();var date=LocalDate.of(2030,11,4);
        var person=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).fullName("Audit worker").build();
        var contract=Employment.builder().user(person).contractType(ContractType.builder().maxWeeklyHours(48).build()).build();
        var generic=Shift.builder().id(UUID.randomUUID()).shiftDate(date).startTime(LocalTime.of(9,0))
                .endTime(LocalTime.of(17,0)).status(ShiftStatus.DRAFT).build();
        var assigned=ShiftAssignment.builder().id(UUID.randomUUID()).shift(generic).staff(person).source(AssignmentSource.MANUAL).build();
        var targetShifts=new ArrayList<Shift>();targetShifts.add(generic);
        if(includeUnfilledRole) {
            var required=Shift.builder().id(UUID.randomUUID()).shiftDate(date).startTime(LocalTime.of(9,0))
                    .endTime(LocalTime.of(17,0)).status(ShiftStatus.DRAFT).build();
            required.getRequirements().add(ShiftSkillRequirement.builder().id(UUID.randomUUID())
                    .skill(Skill.builder().id(UUID.randomUUID()).name("Unavailable skill").build()).requiredCount(1).build());
            targetShifts.add(required);
        }
        when(shifts.findByStoreIdAndShiftDateBetween(store,date,date)).thenReturn(targetShifts);
        when(assignments.findByShiftId(generic.getId())).thenReturn(List.of(assigned));
        when(assignments.findByStaffIdInAndShift_ShiftDateBetween(anyList(),any(),any())).thenReturn(List.of(assigned));
        when(employment.findByStoreIdAndStatus(any(),any())).thenReturn(List.of(contract));
        when(employment.findByUserIdInAndStatus(any(),any())).thenReturn(List.of(contract));
        when(availability.findByUser_IdIn(anyList())).thenReturn(List.of(Availability.builder().user(person)
                .dayOfWeek((short)1).startTime(LocalTime.of(6,0)).endTime(LocalTime.of(22,0)).build()));
        when(configs.findByStoreId(store)).thenReturn(Optional.of(StoreConfiguration.builder().storeId(store).minRestHours(11).build()));
        var request=new AutoScheduleRequest();request.setStartDate(date);request.setEndDate(date);request.setDryRun(true);
        AutoScheduleResult result;
        try(var transaction=mockStatic(org.springframework.transaction.interceptor.TransactionAspectSupport.class)) {
            transaction.when(org.springframework.transaction.interceptor.TransactionAspectSupport::currentTransactionStatus)
                    .thenReturn(mock(org.springframework.transaction.TransactionStatus.class));
            result=new AutoScheduleService(shifts,assignments,employment,skills,availability,blackouts,configs,scoring).autoSchedule(store,request);
        }
        when(assignments.countTotalAssignmentsByStoreAndDateRange(store,date,date)).thenReturn(1L);
        // SUM over inner-joined explicit requirements: generic has no joined row.
        when(shifts.sumRequiredStaffByStoreAndDateRange(store,date,date)).thenReturn(includeUnfilledRole?1L:null);
        var dashboard=new DashboardService(employment,mock(com.shiftsync.payroll.repository.PayrollRepository.class),
                mock(com.shiftsync.attendance.repository.AttendanceRepository.class),assignments,shifts,
                mock(ShiftSwapRequestRepository.class),configs);
        return new Comparison(result,dashboard.getDashboardMetrics(store,date,date).getScheduling().getCoverage());
    }
    @Test void fullyStaffedGenericShiftHasZeroDashboardCoverage() {
        var comparison=compare(false);
        assertEquals(1,comparison.schedule.getTotalDemandSlots());
        assertEquals(1,comparison.schedule.getQuality().getCoveredSlots());
        assertEquals(100.0,comparison.schedule.getCoverageRate());
        assertEquals(0.0,comparison.dashboardCoverage);
    }
    @Test void genericAssignmentMasksAnUnfilledExplicitRoleInDashboardCoverage() {
        var comparison=compare(true);
        assertEquals(2,comparison.schedule.getTotalDemandSlots());
        assertEquals(1,comparison.schedule.getQuality().getCoveredSlots());
        assertEquals(1,comparison.schedule.getQuality().getUnfilledSlots());
        assertEquals(50.0,comparison.schedule.getCoverageRate());
        assertEquals(100.0,comparison.dashboardCoverage);
    }
}
