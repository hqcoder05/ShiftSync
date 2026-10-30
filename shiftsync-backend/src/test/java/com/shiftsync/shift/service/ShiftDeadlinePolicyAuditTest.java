package com.shiftsync.shift.service;

import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.quota.dto.AutoFillQuotaRequest;
import com.shiftsync.quota.repository.PositionNormOverrideRepository;
import com.shiftsync.quota.service.HeadcountQuotaService;
import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.repository.*;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.store.entity.*;
import com.shiftsync.store.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Compare actual creation paths with one configured deadline; repositories mocked. */
class ShiftDeadlinePolicyAuditTest {
    final LocalDate date=LocalDate.of(2030,11,4);
    final Store store=Store.builder().id(UUID.randomUUID()).name("Audit store")
            .openTime(LocalTime.of(8,0)).closeTime(LocalTime.of(22,0)).build();
    final StoreRepository stores=mock(StoreRepository.class);
    final StoreConfigurationRepository configs=mock(StoreConfigurationRepository.class);
    final SkillRepository skills=mock(SkillRepository.class);
    final StoreZoneRepository zones=mock(StoreZoneRepository.class);
    final Skill role=Skill.builder().id(UUID.randomUUID()).store(store).name("Barista").build();
    record Creator(ShiftService service,ShiftRepository repository,List<Shift> saved) {}
    Creator creator() {
        var repository=mock(ShiftRepository.class);var saved=new ArrayList<Shift>();
        when(repository.save(any())).thenAnswer(call->{Shift shift=call.getArgument(0);
            if(shift.getId()==null)shift.setId(UUID.randomUUID());saved.add(shift);return shift;});
        var service=new ShiftService(null,repository,stores,configs,mock(ShiftTemplateRepository.class),skills,
                mock(ShiftAssignmentRepository.class),null,mock(com.shiftsync.payroll.repository.PayrollPeriodRepository.class),null,zones,null);
        return new Creator(service,repository,saved);
    }
    @Test void bulkAndQuotaCreationIgnoreConfiguredDeadlineAndQuotaAlsoUsesUtcWallTime() {
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        when(configs.findByStoreId(store.getId())).thenReturn(Optional.of(StoreConfiguration.builder()
                .storeId(store.getId()).availabilityDeadlineHours(6).build()));
        when(skills.findByStoreId(store.getId())).thenReturn(List.of(role));
        when(skills.findByIdAndStoreId(role.getId(),store.getId())).thenReturn(Optional.of(role));
        when(skills.findAllById(any())).thenReturn(List.of(role));
        var direct=creator();var input=new ShiftCreateRequest();input.setShiftDate(date);
        input.setStartTime(LocalTime.of(8,0));input.setEndTime(LocalTime.of(15,0));input.setSkillId(role.getId());
        var directDeadline=direct.service.createShift(store.getId(),input).getAvailabilityDeadline();
        var expected=date.atTime(8,0).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).minusHours(6);
        assertEquals(expected.toInstant(),directDeadline.toInstant());

        var bulk=creator();var required=new ShiftRequirementRequest();required.setSkillId(role.getId());required.setRequiredCount(1);
        var config=new BulkDemandPlanningRequest.ShiftDemandConfig();config.setStartTime(LocalTime.of(8,0));
        config.setEndTime(LocalTime.of(15,0));config.setRequirements(List.of(required));
        var demand=new BulkDemandPlanningRequest();demand.setScope("DAY");demand.setTargetDate(date);demand.setShifts(List.of(config));
        bulk.service.saveBulkDemandPlanning(store.getId(),demand);
        var bulkDeadline=bulk.saved.get(0).getAvailabilityDeadline();
        assertEquals(18,Duration.between(bulkDeadline.toInstant(),directDeadline.toInstant()).toHours());

        var quota=creator();
        new HeadcountQuotaService(stores,skills,quota.repository,zones,mock(ShiftAssignmentRepository.class),mock(PositionNormOverrideRepository.class))
                .autoFillQuotas(AutoFillQuotaRequest.builder().branchId(store.getId()).scope("DAY").date(date).build());
        var morning=quota.saved.stream().filter(s->s.getStartTime().equals(LocalTime.of(8,0))).findFirst().orElseThrow();
        var quotaDeadline=morning.getAvailabilityDeadline();
        assertEquals(ZoneOffset.UTC,quotaDeadline.getOffset());
        assertEquals(11,Duration.between(quotaDeadline.toInstant(),directDeadline.toInstant()).toHours());
        assertEquals(17,Duration.between(quotaDeadline.toInstant(),date.atTime(8,0).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant()).toHours());
    }
}
