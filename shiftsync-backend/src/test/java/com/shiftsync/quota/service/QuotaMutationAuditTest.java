package com.shiftsync.quota.service;

import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.quota.controller.HeadcountQuotaController;
import com.shiftsync.quota.dto.*;
import com.shiftsync.quota.repository.PositionNormOverrideRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.shift.service.ShiftService;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Service mutation-path comparisons; persistence and payroll lock state are mocked. */
class QuotaMutationAuditTest {
    final StoreRepository stores=mock(StoreRepository.class);
    final SkillRepository skills=mock(SkillRepository.class);
    final ShiftRepository shifts=mock(ShiftRepository.class);
    final StoreZoneRepository zones=mock(StoreZoneRepository.class);
    final ShiftAssignmentRepository assignments=mock(ShiftAssignmentRepository.class);
    final PayrollPeriodRepository payroll=mock(PayrollPeriodRepository.class);
    final Store store=Store.builder().id(UUID.randomUUID()).name("Audit store")
            .openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).build();
    final LocalDate date=LocalDate.of(2026,10,1);
    HeadcountQuotaService quota() {
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        return new HeadcountQuotaService(stores,skills,shifts,zones,assignments,mock(PositionNormOverrideRepository.class));
    }
    ShiftService standard() {
        return new ShiftService(null,shifts,stores,null,null,skills,assignments,null,payroll,null,zones,null);
    }
    Shift existing(ShiftStatus status) {
        var skill=Skill.builder().id(UUID.randomUUID()).store(store).name("Barista").build();
        var shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(date)
                .startTime(LocalTime.of(8,0)).endTime(LocalTime.of(15,0)).status(status).build();
        shift.getRequirements().add(ShiftSkillRequirement.builder().id(UUID.randomUUID()).shift(shift).skill(skill).requiredCount(1).build());
        when(shifts.findByIdAndStoreId(shift.getId(),store.getId())).thenReturn(Optional.of(shift));
        when(shifts.findByStoreIdAndShiftDateAndStartTimeAndEndTime(store.getId(),date,shift.getStartTime(),shift.getEndTime())).thenReturn(Optional.of(shift));
        when(skills.findByIdAndStoreId(skill.getId(),store.getId())).thenReturn(Optional.of(skill));
        return shift;
    }
    void quotaChange(HeadcountQuotaService service,Shift shift) {
        service.updateQuota("quota",UpdateQuotaRequest.builder().branchId(store.getId()).date(date).shiftType("morning")
                .positionId(shift.getRequirements().get(0).getSkill().getId()).count(3).build());
        assertEquals(3,shift.getRequirements().get(0).getRequiredCount());
        verify(shifts).save(shift);
    }
    @ParameterizedTest @EnumSource(value=ShiftStatus.class,names={"PUBLISHED","COMPLETED","CANCELLED"})
    void quotaUpdatesRequirementsThatOrdinaryEndpointRefuses(ShiftStatus status) {
        var service=quota();var shift=existing(status);
        assertThrows(BusinessException.class,()->standard().setShiftRequirements(store.getId(),shift.getId(),List.of()));
        quotaChange(service,shift);
        assertEquals(status,shift.getStatus());
    }
    @Test void quotaStillMutatesDraftOnLockedPayrollDate() {
        var service=quota();var shift=existing(ShiftStatus.DRAFT);
        when(payroll.existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(any(),any(),any(),any())).thenReturn(true);
        var update=new ShiftCreateRequest();update.setShiftDate(date);update.setStartTime(shift.getStartTime());update.setEndTime(shift.getEndTime());
        var blocked=assertThrows(BusinessException.class,()->standard().updateShift(store.getId(),shift.getId(),update));
        assertTrue(blocked.getMessage().contains("LOCKED/PAID"));
        quotaChange(service,shift);
    }
    @ParameterizedTest @EnumSource(value=ShiftStatus.class,names={"PUBLISHED","CANCELLED"})
    void bulkDemandAlsoBypassesTheRequirementsEndpointStateGuard(ShiftStatus status) {
        quota();var shift=existing(status);var skill=shift.getRequirements().get(0).getSkill();
        when(skills.findByStoreId(store.getId())).thenReturn(List.of(skill));
        assertThrows(BusinessException.class,()->standard().setShiftRequirements(store.getId(),shift.getId(),List.of()));
        var requirement=new ShiftRequirementRequest();requirement.setSkillId(skill.getId());requirement.setRequiredCount(4);
        var config=new BulkDemandPlanningRequest.ShiftDemandConfig();config.setStartTime(shift.getStartTime());
        config.setEndTime(shift.getEndTime());config.setRequirements(List.of(requirement));
        var request=new BulkDemandPlanningRequest();request.setScope("DAY");request.setTargetDate(date);request.setShifts(List.of(config));
        standard().saveBulkDemandPlanning(store.getId(),request);
        assertEquals(4,shift.getRequirements().get(0).getRequiredCount());assertEquals(status,shift.getStatus());
        verify(shifts).save(shift);
    }
    @Test void defaultPositionsCannotBeEditedAndAutoFillSucceedsWithoutAnyRoleDemand() {
        var service=quota();var defaults=service.getPositions(store.getId());
        assertEquals(3,defaults.size());
        var saved=new HashMap<UUID,Shift>();
        when(shifts.save(any())).thenAnswer(call->{Shift row=call.getArgument(0);
            if(row.getId()==null)row.setId(UUID.randomUUID());saved.put(row.getId(),row);return row;});
        var request=AutoFillQuotaRequest.builder().branchId(store.getId()).scope("DAY").date(date).build();
        var response=new HeadcountQuotaController(service).autoFillQuotas(request);
        assertEquals(true,response.getBody().get("success"));
        assertEquals(2,saved.size());
        assertTrue(saved.values().stream().allMatch(s->s.getRequirements().isEmpty()));
        var rejected=assertThrows(BusinessException.class,()->service.updateQuota("default",UpdateQuotaRequest.builder()
                .branchId(store.getId()).date(date).shiftType("morning").positionId(defaults.get(0).getId()).count(2).build()));
        assertTrue(rejected.getMessage().contains("Position/Skill not found"));
        verify(skills,never()).save(any());
    }
}
