package com.shiftsync.skill;

import com.shiftsync.skill.entity.*;
import com.shiftsync.skill.repository.*;
import com.shiftsync.skill.service.SkillService;
import com.shiftsync.store.repository.StoreRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

/** Characterizes metadata loss during replacement, even when the ID set is unchanged. */
class SkillReplacementAuditTest {
    @Test void savingSameSkillIdsErasesExpiryAndResetsLevel() {
        var repository=mock(StaffSkillRepository.class);
        var staff=UUID.randomUUID();
        var skill=UUID.randomUUID();
        var old=StaffSkill.builder().id(UUID.randomUUID()).staffId(staff).skillId(skill)
                .level(SkillLevel.EXPERT).expirationDate(LocalDate.of(2020,1,1)).build();
        when(repository.findByStaffId(staff)).thenReturn(List.of(old));
        var service=new SkillService(mock(SkillRepository.class),mock(StoreRepository.class),repository,mock(EntityManager.class));
        service.replaceStaffSkills(staff,List.of(skill));
        var captured=ArgumentCaptor.forClass(Iterable.class);
        verify(repository).saveAll(captured.capture());
        var replacement=(StaffSkill)captured.getValue().iterator().next();
        assertEquals(SkillLevel.BEGINNER,replacement.getLevel());
        assertNull(replacement.getExpirationDate());
        verify(repository).deleteAll(List.of(old));
    }
}
