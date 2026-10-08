package com.shiftsync.payroll.service;

import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.store.entity.Store;
import com.shiftsync.auth.entity.User;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.employment.enums.EmploymentStatus;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class PerformancePayrollTest {

    @Autowired
    private PayrollCalculationService payrollCalculationService;
    
    @Autowired
    private StoreRepository storeRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmploymentRepository employmentRepository;
    
    @Autowired
    private EntityManager entityManager;

    private UUID testStoreId;

    @BeforeEach
    @Transactional
    public void setup() {
        Store store = Store.builder().name("Perf Store").address("Perf Addr").build();
        store = storeRepository.save(store);
        testStoreId = store.getId();

                com.shiftsync.employment.entity.ContractType ct = null;
        try {
            ct = entityManager.createQuery("FROM ContractType", com.shiftsync.employment.entity.ContractType.class).getResultList().get(0);
        } catch (Exception e) {}

        for (int i = 0; i < 5; i++) {
            User staff = new User();
            staff.setEmail("staff" + i + UUID.randomUUID() + "@perf.com");
            staff.setPasswordHash("pass");
            staff.setFullName("F L");
            
            staff.setSystemRole(SystemRole.STAFF);
            userRepository.save(staff);

            Employment emp = new Employment();
            emp.setStore(store);
            emp.setUser(staff);
            emp.setStatus(EmploymentStatus.ACTIVE);
            emp.setHourlyRate(new java.math.BigDecimal("25000"));
            emp.setJoinedDate(LocalDate.now().minusYears(1)); emp.setContractType(ct);
            employmentRepository.save(emp);
        }
        
        
        
    }

    @Test
    public void testPayrollPerformanceNPlusOne() {
        SessionFactory sessionFactory = entityManager.getEntityManagerFactory().unwrap(SessionFactory.class);
        Statistics stats = sessionFactory.getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        payrollCalculationService.generatePayroll(testStoreId, LocalDate.now().minusDays(14), LocalDate.now());

        long queryCount = stats.getPrepareStatementCount();
        System.out.println("TOTAL QUERIES FOR GENERATE PAYROLL: " + queryCount);
        
        // At 5 employees, N+1 means we will have quite a few queries.
        // Let's assert something so we can see the output in maven output.
    }
}








