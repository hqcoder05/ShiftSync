package com.shiftsync.payroll.service;

import com.shiftsync.employment.dto.ContractTypeCreateRequest;
import com.shiftsync.employment.dto.EmploymentUpdateRequest;
import com.shiftsync.employment.service.ContractTypeService;
import com.shiftsync.employment.service.EmploymentService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.skill.dto.SkillRequest;
import com.shiftsync.skill.service.SkillService;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EffectiveDateNotYetSupportedTest {
    @Test void rejectsDateInsteadOfSilentlyUpdatingImmediately() {
        var employments=mock(com.shiftsync.employment.repository.EmploymentRepository.class);
        var contracts=mock(com.shiftsync.employment.repository.ContractTypeRepository.class);
        var users=mock(com.shiftsync.auth.repository.UserRepository.class);
        var stores=mock(com.shiftsync.store.repository.StoreRepository.class);
        var skills=mock(com.shiftsync.skill.repository.SkillRepository.class);
        var staffSkills=mock(com.shiftsync.skill.repository.StaffSkillRepository.class);
        var entityManager=mock(jakarta.persistence.EntityManager.class);
        var employmentService=new EmploymentService(employments,users,stores,contracts,mock(EmploymentCompensationScheduler.class),mock(CompensationRevisionResolver.class));
        var contractService=new ContractTypeService(contracts,stores,employments,mock(ContractCompensationScheduler.class),mock(CompensationRevisionResolver.class));
        var skillService=new SkillService(skills,stores,staffSkills,entityManager,employments,mock(SkillCompensationScheduler.class),mock(CompensationRevisionResolver.class));
        var employment=new EmploymentUpdateRequest(); employment.setEffectiveDate(LocalDate.of(2030,1,1));
        var contract=new ContractTypeCreateRequest(); contract.setEffectiveDate(LocalDate.of(2030,1,1));
        var skill=new SkillRequest(); skill.setEffectiveDate(LocalDate.of(2030,1,1));
        UUID id=UUID.randomUUID();
        assertEquals(HttpStatus.CONFLICT,assertThrows(BusinessException.class,()->contractService.createContractType(id,contract)).getStatus());
        assertEquals(HttpStatus.CONFLICT,assertThrows(BusinessException.class,()->skillService.createSkill(id,skill)).getStatus());
        verifyNoInteractions(employments,contracts,users,stores,skills,staffSkills,entityManager);
    }
}
