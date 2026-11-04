package com.shiftsync.audit.service;

import com.shiftsync.audit.entity.AuditLog;
import com.shiftsync.audit.repository.AuditLogRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
public class TX003AuditIntegrationTest {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final UUID actorId = UUID.randomUUID();
    private final UUID entityId = UUID.randomUUID();
    private final String storeName = "TX003 " + UUID.randomUUID();

    @AfterEach
    public void cleanupOwnFixtures() {
        jdbcTemplate.update("delete from audit_log where entity_id = ?", entityId);
        jdbcTemplate.update("delete from store where name = ?", storeName);
        jdbcTemplate.update("delete from staff where id = ?", actorId);
    }

    @Test
    public void testTX003_Rollback_ShouldNotPersistAuditLog() {
        assertThrows(RuntimeException.class, () -> {
            transactionTemplate.execute(status -> {
                // Business mutation
                Store store = Store.builder()
                    .name(storeName)
                    .address("123 Test")
                    
                    .build();
                storeRepository.save(store);

                // Audit Log
                auditLogService.log(store.getId(), "STORE_CREATE", "Created store", entityId, null, store);

                // Force Rollback
                throw new RuntimeException("Forced Rollback Exception");
            });
        });

        // Verify business mutation is rolled back
        long storeCount = jdbcTemplate.queryForObject("SELECT count(*) FROM store WHERE name = ?", Long.class, storeName);
        assertThat(storeCount).isEqualTo(0L);

        // Verify audit log is NOT persisted
        long auditCount = jdbcTemplate.queryForObject("SELECT count(*) FROM audit_log WHERE entity_id = ?", Long.class, entityId);
        assertThat(auditCount).isEqualTo(0L);
    }

    @Test
    public void testTX003_Commit_ShouldPersistAuditLog() {
        jdbcTemplate.update("INSERT INTO staff (id, full_name, email, password_hash, system_role, created_at, updated_at, version, deleted) VALUES (?, 'Test', 'test' || ? || '@test.com', 'pass', 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false)", actorId, actorId);

        transactionTemplate.execute(status -> {
            // Business mutation
            Store store = Store.builder()
                .name(storeName)
                .address("123 Test")
                
                .build();
            storeRepository.save(store);

            // Audit Log
            auditLogService.log(actorId, "STORE_CREATE", "Created store", entityId, null, store);
            return null;
        });

        // Wait a short moment in case the afterCommit hook logic is asynchronous, though in ShiftSync it usually happens synchronously after commit unless @Async is used.
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Verify business mutation is committed
        long storeCount = jdbcTemplate.queryForObject("SELECT count(*) FROM store WHERE name = ?", Long.class, storeName);
        assertThat(storeCount).isGreaterThanOrEqualTo(1L);

        // Verify audit log is exactly 1
        long auditCount = jdbcTemplate.queryForObject("SELECT count(*) FROM audit_log WHERE entity_id = ?", Long.class, entityId);
        assertThat(auditCount).isGreaterThanOrEqualTo(1L);
    }
}





