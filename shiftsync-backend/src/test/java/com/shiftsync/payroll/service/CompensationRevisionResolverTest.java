package com.shiftsync.payroll.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.payroll.repository.CompensationRevisionRepository;
import com.shiftsync.shared.exception.BusinessException;
import java.time.LocalDate;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompensationRevisionResolverTest {
    private final CompensationRevisionRepository repository = mock(CompensationRevisionRepository.class);
    private final com.shiftsync.employment.repository.ContractTypeRepository contracts = mock(com.shiftsync.employment.repository.ContractTypeRepository.class);
    private final com.shiftsync.skill.repository.SkillRepository skills = mock(com.shiftsync.skill.repository.SkillRepository.class);
    private final CompensationRevisionResolver resolver = new CompensationRevisionResolver(repository, new ObjectMapper(), contracts, skills);
    private final UUID id = UUID.randomUUID();
    private final LocalDate date = LocalDate.of(2030, 1, 1);

    @Test void resolvesCompleteContractTerms() {
        when(repository.findEffectiveValues("contract_type", id, date)).thenReturn(Optional.of(
                "{\"defaultHourlyRate\":30000,\"maxWeeklyHours\":40,\"otMultiplier\":1.5}"));
        var result = resolver.requireAt("contract_type", id, date, CompensationRevisionResolver.ContractTerms.class);
        assertEquals(40, result.maxWeeklyHours());
        assertEquals("1.5", result.otMultiplier().toPlainString());
    }

    @Test void missingOrIncompleteRevisionRequiresReconciliation() {
        when(repository.findEffectiveValues("skill", id, date)).thenReturn(Optional.empty(), Optional.of("{}"));
        assertThrows(BusinessException.class, () -> resolver.requireAt("skill", id, date, CompensationRevisionResolver.SkillTerms.class));
        assertThrows(BusinessException.class, () -> resolver.requireAt("skill", id, date, CompensationRevisionResolver.SkillTerms.class));
    }

    @Test void mismatchedTypeIsRejectedBeforeQuery() {
        assertThrows(IllegalArgumentException.class, () -> resolver.requireAt(
                "employment", id, date, CompensationRevisionResolver.SkillTerms.class));
        verifyNoInteractions(repository);
    }

    @Test void untrackedChangeCannotSilentlyUseEarlierRevision() {
        when(repository.hasUntrackedCompensationChange("skill", id)).thenReturn(true);
        assertThrows(BusinessException.class, () -> resolver.requireAt(
                "skill", id, date, CompensationRevisionResolver.SkillTerms.class));
        verify(repository, never()).findEffectiveValues(anyString(), any(), any());
    }

    @Test void rejectsIncompleteOrInvalidRevisionBeforeWriting() {
        for (String invalid : List.of("{}", "{\"hourlyRate\":-1}", "null", "không phải JSON")) {
            var error=assertThrows(BusinessException.class,()->resolver.validateNewRevision("skill",invalid));
            assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST,error.getStatus());
        }
        assertThrows(BusinessException.class,()->resolver.validateNewRevision("contract_type",
                "{\"defaultHourlyRate\":30000,\"maxWeeklyHours\":40,\"otMultiplier\":0.5}"));
        resolver.validateNewRevision("skill","{\"hourlyRate\":0}");
    }

    @Test void resolvesEmploymentContractAndPositionAtSameDate() {
        UUID contract=UUID.randomUUID(), skill=UUID.randomUUID(), store=UUID.randomUUID(), shiftStore=UUID.randomUUID();
        when(contracts.findByIdAndStoreId(contract,store)).thenReturn(Optional.of(new com.shiftsync.employment.entity.ContractType()));
        when(skills.findByIdAndStoreId(skill,shiftStore)).thenReturn(Optional.of(new com.shiftsync.skill.entity.Skill()));
        when(repository.findEffectiveValues("employment", id, date)).thenReturn(Optional.of(
                "{\"contractTypeId\":\""+contract+"\",\"hourlyRate\":30000}"));
        when(repository.findEffectiveValues("contract_type", contract, date)).thenReturn(Optional.of(
                "{\"defaultHourlyRate\":25000,\"maxWeeklyHours\":40,\"otMultiplier\":1.5}"));
        when(repository.findEffectiveValues("skill", skill, date)).thenReturn(Optional.of("{\"hourlyRate\":40000}"));
        var terms=resolver.resolvePayTerms(id,store,shiftStore,skill,date);
        assertEquals("40000",terms.hourlyRate().toPlainString());
        assertEquals(40,terms.maxWeeklyHours());
        assertEquals("1.5",terms.otMultiplier().toPlainString());
        assertEquals("30000",resolver.resolvePayTerms(id,store,shiftStore,null,date).hourlyRate().toPlainString());
        assertThrows(BusinessException.class, () -> resolver.resolvePayTerms(id,UUID.randomUUID(),shiftStore,skill,date));
        assertThrows(BusinessException.class, () -> resolver.resolvePayTerms(id,store,UUID.randomUUID(),skill,date));
    }
}
