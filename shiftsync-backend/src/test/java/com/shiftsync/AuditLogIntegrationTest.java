package com.shiftsync;

import com.shiftsync.audit.service.AuditLogService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.UUID;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AuditLogIntegrationTest {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private JdbcTemplate jdbcTemplate;


    @Autowired
    private com.shiftsync.auth.repository.UserRepository userRepository;

    @Test
    public void testAuditLog() throws Exception {
        com.shiftsync.auth.entity.User user = new com.shiftsync.auth.entity.User();
        user.setEmail("test_audit_" + UUID.randomUUID() + "@test.com");
        user.setPasswordHash("hash");
        user.setFullName("Test User");
        user.setSystemRole(com.shiftsync.shared.security.SystemRole.STAFF);
        user = userRepository.save(user);
        
        UUID actorId = user.getId();

        UUID entityId = UUID.randomUUID();
        
        try {
            auditLogService.log(actorId, "TEST_AUDIT_LOG_ACTION", "TestEntity", entityId,
                    Map.of("name", "before_val"), Map.of("name", "after_val"));
            long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(10);
            int count;
            do {
                count = jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM audit_log WHERE entity_id=? AND actor_staff_id=? AND action='TEST_AUDIT_LOG_ACTION'",
                        Integer.class, entityId, actorId);
                if (count > 0) break;
                Thread.sleep(50);
            } while (System.nanoTime() < deadline);
            assertEquals(1, count, "This invocation must persist exactly its own audit event");
            assertEquals("before_val", jdbcTemplate.queryForObject(
                    "SELECT before_data->>'name' FROM audit_log WHERE entity_id=?", String.class, entityId));
            assertEquals("after_val", jdbcTemplate.queryForObject(
                    "SELECT after_data->>'name' FROM audit_log WHERE entity_id=?", String.class, entityId));
        } finally {
            jdbcTemplate.update("DELETE FROM audit_log WHERE entity_id=? AND actor_staff_id=?", entityId, actorId);
            jdbcTemplate.update("DELETE FROM staff WHERE id=?", actorId);
        }
    }
}
