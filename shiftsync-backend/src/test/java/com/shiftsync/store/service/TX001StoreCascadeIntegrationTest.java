package com.shiftsync.store.service;

import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.UUID;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class TX001StoreCascadeIntegrationTest {

    @Autowired
    private StoreService storeService;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;
    
    @PersistenceContext
    private EntityManager entityManager;

    @Test
    public void testTX001_DeleteStore_CascadesToChildren() {
        UUID storeId = transactionTemplate.execute(status -> {
            Store store = Store.builder()
                .name("TX001 Store")
                .address("123 Test")
                
                .build();
            store = storeRepository.save(store);
            
                        java.util.UUID staffId = java.util.UUID.randomUUID();
            entityManager.createNativeQuery("INSERT INTO staff (id, full_name, email, password_hash, system_role, created_at, updated_at, version, deleted) VALUES (:staffId, 'Test', :email, 'pass', 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false)")
                .setParameter("staffId", staffId)
                .setParameter("email", "test" + staffId + "@test.com")
                .executeUpdate();

            // Insert Employment (status = SUSPENDED so it doesn't block deletion, but should be updated to INACTIVE)
            entityManager.createNativeQuery("INSERT INTO employment (id, store_id, staff_id, contract_type_id, hourly_rate, joined_date, status) VALUES (gen_random_uuid(), :storeId, :staffId, (SELECT id FROM contract_type LIMIT 1), 25000, CURRENT_DATE, 'SUSPENDED')")
                .setParameter("storeId", store.getId())
                .setParameter("staffId", staffId)
                .executeUpdate();
                
            // Insert Shift (status = DRAFT, future, so it doesn't block, but should be CANCELLED)
            UUID shiftId = UUID.randomUUID();
            entityManager.createNativeQuery("INSERT INTO shift (id, store_id, shift_date, start_time, end_time, availability_deadline, status) VALUES (:shiftId, :storeId, '2030-01-01', '08:00:00', '16:00:00', '2029-12-31 08:00:00', 'DRAFT')")
                  .setParameter("shiftId", shiftId).setParameter("storeId", store.getId()).executeUpdate();
                
            // Insert ShiftAssignment
            UUID saId = UUID.randomUUID();
            entityManager.createNativeQuery("INSERT INTO shift_assignment (id, shift_id, staff_id, deleted) VALUES (:saId, :shiftId, :staffId, false)")
                .setParameter("saId", saId).setParameter("shiftId", shiftId).setParameter("staffId", staffId).executeUpdate();
                
            // Insert Attendance
            entityManager.createNativeQuery("INSERT INTO attendance (id, shift_assignment_id, check_in_time, status, deleted) VALUES (gen_random_uuid(), :saId, '2030-01-01 08:00:00', 'PRESENT', false)")
                .setParameter("saId", saId).executeUpdate();
                
            // Insert LeaveRequest (status = PENDING)
            entityManager.createNativeQuery("INSERT INTO leave_request (id, store_id, staff_id, start_date, end_date, reason, status, leave_type) VALUES (gen_random_uuid(), :storeId, :staffId, '2030-01-01', '2030-01-02', 'Sick', 'PENDING', 'SICK')")
                .setParameter("storeId", store.getId()).setParameter("staffId", staffId).executeUpdate();

            return store.getId();
        });

        // ACT
        UUID actorId = UUID.randomUUID();
        storeService.deleteStore(storeId, actorId);
        
        // ASSERT
        transactionTemplate.execute(status -> {
            // Verify Store is soft deleted
            long storeCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM store WHERE id = :storeId AND deleted = true")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(storeCount).isEqualTo(1L);

            // Verify Employment INACTIVE
            long empCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM employment WHERE store_id = :storeId AND status = 'INACTIVE'")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(empCount).isEqualTo(1L);
            
            // Verify Shift CANCELLED
            long shiftCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM shift WHERE store_id = :storeId AND status = 'CANCELLED'")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(shiftCount).isEqualTo(1L);

            // Verify ShiftAssignment soft deleted
            long saCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM shift_assignment WHERE shift_id IN (SELECT id FROM shift WHERE store_id = :storeId) AND deleted = true")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(saCount).isEqualTo(1L);
            
            // Verify Attendance soft deleted
            long attCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM attendance a JOIN shift_assignment sa ON a.shift_assignment_id = sa.id JOIN shift s ON sa.shift_id = s.id WHERE s.store_id = :storeId AND a.deleted = true")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(attCount).isEqualTo(1L);

            // Verify LeaveRequest cancelled
            long leaveCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM leave_request WHERE store_id = :storeId AND status = 'REJECTED'")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(leaveCount).isEqualTo(1L);

            return null;
        });
    }
    
    @Test
    public void testTX001_DeleteStore_Rollback_RestoresChildren() {
        UUID storeId = transactionTemplate.execute(status -> {
            Store store = Store.builder()
                .name("TX001 Rollback Store")
                .address("123 Test")
                
                .build();
            store = storeRepository.save(store);
            
                        java.util.UUID staffId = java.util.UUID.randomUUID();
            entityManager.createNativeQuery("INSERT INTO staff (id, full_name, email, password_hash, system_role, created_at, updated_at, version, deleted) VALUES (:staffId, 'Test', :email, 'pass', 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false)")
                .setParameter("staffId", staffId)
                .setParameter("email", "test" + staffId + "@test.com")
                .executeUpdate();

            // Insert Employment (status = SUSPENDED)
            entityManager.createNativeQuery("INSERT INTO employment (id, store_id, staff_id, contract_type_id, hourly_rate, joined_date, status) VALUES (gen_random_uuid(), :storeId, :staffId, (SELECT id FROM contract_type LIMIT 1), 25000, CURRENT_DATE, 'SUSPENDED')")
                .setParameter("storeId", store.getId())
                .setParameter("staffId", staffId)
                .executeUpdate();
                
            return store.getId();
        });

        // ACT
        UUID actorId = UUID.randomUUID();
        try {
            transactionTemplate.execute(status -> {
                storeService.deleteStore(storeId, actorId);
                // force rollback
                throw new RuntimeException("Forced Failure");
            });
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).isEqualTo("Forced Failure");
        }
        
        // ASSERT
        transactionTemplate.execute(status -> {
            // Verify Store is NOT soft deleted
            long storeCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM store WHERE id = :storeId AND deleted = false")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(storeCount).isEqualTo(1L);

            // Verify Employment remains SUSPENDED, not INACTIVE
            long empCount = (long) entityManager.createNativeQuery("SELECT count(*) FROM employment WHERE store_id = :storeId AND status = 'SUSPENDED'")
                .setParameter("storeId", storeId).getSingleResult();
            assertThat(empCount).isEqualTo(1L);
            return null;
        });
    }
}










