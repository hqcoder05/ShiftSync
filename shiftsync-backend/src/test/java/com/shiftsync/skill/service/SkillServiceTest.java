package com.shiftsync.skill.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.skill.dto.SkillDTO;
import com.shiftsync.skill.dto.SkillRequest;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkillServiceTest {

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private StaffSkillRepository staffSkillRepository;

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private SkillService skillService;

    private UUID storeId;
    private UUID skillId;
    private Store store;
    private Skill skill;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        skillId = UUID.randomUUID();
        store = Store.builder().id(storeId).name("Test Store").build();
        skill = Skill.builder()
                .id(skillId)
                .store(store)
                .name("Cashier")
                .description("#8DD9CC")
                .hourlyRate(BigDecimal.valueOf(26000))
                .build();
    }

    @Test
    @DisplayName("Create skill with configured pay rate successfully")
    void testCreateSkillWithPayRate() {
        SkillRequest request = new SkillRequest();
        request.setName("Cashier");
        request.setDescription("#8DD9CC");
        request.setHourlyRate(BigDecimal.valueOf(26000));

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(skillRepository.existsByStoreIdAndName(storeId, "Cashier")).thenReturn(false);
        when(skillRepository.save(any(Skill.class))).thenAnswer(invocation -> {
            Skill s = invocation.getArgument(0);
            s.setId(skillId);
            return s;
        });

        SkillDTO result = skillService.createSkill(storeId, request);

        assertNotNull(result);
        assertEquals("Cashier", result.getName());
        assertEquals(BigDecimal.valueOf(26000), result.getHourlyRate());
        verify(skillRepository).save(any(Skill.class));
    }

    @Test
    @DisplayName("Update skill pay rate successfully")
    void testUpdateSkillPayRate() {
        SkillRequest request = new SkillRequest();
        request.setName("Cashier Lead");
        request.setDescription("#8DD9CC");
        request.setHourlyRate(BigDecimal.valueOf(29000));

        when(skillRepository.findByIdAndStoreId(skillId, storeId)).thenReturn(Optional.of(skill));
        when(skillRepository.existsByStoreIdAndNameAndIdNot(storeId, "Cashier Lead", skillId)).thenReturn(false);
        when(skillRepository.save(any(Skill.class))).thenReturn(skill);

        SkillDTO result = skillService.updateSkill(storeId, skillId, request);

        assertNotNull(result);
        assertEquals(BigDecimal.valueOf(29000), skill.getHourlyRate());
        assertEquals("Cashier Lead", skill.getName());
        verify(skillRepository).save(skill);
    }
}
