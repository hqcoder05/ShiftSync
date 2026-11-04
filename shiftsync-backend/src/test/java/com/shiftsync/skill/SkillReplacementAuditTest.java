package com.shiftsync.skill;

import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.skill.entity.*;
import com.shiftsync.skill.repository.*;
import com.shiftsync.skill.service.SkillService;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SkillReplacementAuditTest {
    final StaffSkillRepository profiles=mock(StaffSkillRepository.class);
    final SkillRepository skills=mock(SkillRepository.class);
    final EmploymentRepository employments=mock(EmploymentRepository.class);
    final SkillService service=new SkillService(skills,mock(StoreRepository.class),profiles,mock(EntityManager.class),employments,mock(com.shiftsync.payroll.service.SkillCompensationScheduler.class),mock(com.shiftsync.payroll.service.CompensationRevisionResolver.class));

    @Test void unchangedSkillRetainsExpiryAndLevel() {
        var staff=UUID.randomUUID(); var id=UUID.randomUUID();
        var old=StaffSkill.builder().id(UUID.randomUUID()).staffId(staff).skillId(id)
                .level(SkillLevel.EXPERT).expirationDate(LocalDate.of(2020,1,1)).build();
        when(profiles.findByStaffId(staff)).thenReturn(List.of(old));
        when(skills.findAllById(anyIterable())).thenReturn(List.of(Skill.builder().id(id).build()));
        var admin=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.ADMIN).build();
        service.replaceStaffSkills(staff,List.of(id),admin);
        verify(profiles,never()).deleteAll(anyIterable());
        verify(profiles,never()).saveAll(anyIterable());
        assertEquals(SkillLevel.EXPERT,old.getLevel());
        assertEquals(LocalDate.of(2020,1,1),old.getExpirationDate());
    }

    @Test void managerCannotRemoveOrAssignAnotherStoresSkills() {
        var staff=UUID.randomUUID(); var manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.MANAGER).build();
        var shared=Store.builder().id(UUID.randomUUID()).build(); var foreign=Store.builder().id(UUID.randomUUID()).build();
        var local=Skill.builder().id(UUID.randomUUID()).store(shared).build();
        var other=Skill.builder().id(UUID.randomUUID()).store(foreign).build();
        var localProfile=StaffSkill.builder().staffId(staff).skillId(local.getId()).build();
        var foreignProfile=StaffSkill.builder().staffId(staff).skillId(other.getId()).build();
        when(employments.findByUserIdAndStatus(staff,EmploymentStatus.ACTIVE)).thenReturn(List.of(Employment.builder().store(shared).build()));
        when(employments.findByUserIdAndStatus(manager.getId(),EmploymentStatus.ACTIVE)).thenReturn(List.of(Employment.builder().store(shared).build()));
        when(profiles.findByStaffId(staff)).thenReturn(List.of(localProfile,foreignProfile));
        when(skills.findAllById(anyIterable())).thenAnswer(call -> {
            var result=new ArrayList<Skill>();
            for (UUID id : (Iterable<UUID>)call.getArgument(0)) {
                if (id.equals(local.getId())) result.add(local);
                if (id.equals(other.getId())) result.add(other);
            }
            return result;
        });
        assertEquals(List.of(local.getId()),service.getSkillIdsByStaffId(staff,manager));
        assertThrows(BusinessException.class,()->service.replaceStaffSkills(staff,List.of(other.getId()),manager));
        service.replaceStaffSkills(staff,List.of(),manager);
        verify(profiles).deleteAll(List.of(localProfile));
        verify(profiles,never()).saveAll(anyIterable());
    }

    @Test void unrelatedManagerCannotEditProfile() {
        var manager=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.MANAGER).build();
        assertEquals(403,assertThrows(BusinessException.class,()->service.replaceStaffSkills(UUID.randomUUID(),List.of(),manager)).getStatus().value());
        verifyNoInteractions(profiles);
    }
}
