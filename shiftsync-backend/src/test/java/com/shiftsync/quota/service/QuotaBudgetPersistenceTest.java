package com.shiftsync.quota.service;

import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class QuotaBudgetPersistenceTest {
    @Autowired StoreRepository stores;
    @Autowired HeadcountQuotaService quotas;
    @Autowired EntityManager entityManager;

    @Test
    void budgetSurvivesPersistenceContextReloadAndIsStoreScoped() {
        Store first = stores.save(Store.builder().name("Quota persistence A").build());
        Store second = stores.save(Store.builder().name("Quota persistence B").build());
        var firstId = first.getId();
        var secondId = second.getId();
        quotas.updateMonthlyBudget(firstId, 92000000L);
        entityManager.flush();
        entityManager.clear();
        assertEquals(92000000L, stores.findById(firstId).orElseThrow().getMonthlyQuotaBudget());
        assertNull(stores.findById(secondId).orElseThrow().getMonthlyQuotaBudget());
        assertEquals(92000000L, quotas.getWeeklyQuotas(firstId, LocalDate.of(2026, 10, 19))
                .getBudget().getMonthlyQuotaBudget());
    }

    @Test
    void invalidBudgetDoesNotOverwritePersistedValue() {
        Store store = stores.save(Store.builder().name("Quota invalid budget").monthlyQuotaBudget(12000000L).build());
        assertThrows(BusinessException.class, () -> quotas.updateMonthlyBudget(store.getId(), -1));
        assertEquals(12000000L, store.getMonthlyQuotaBudget());
    }
}
