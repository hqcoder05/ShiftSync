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
        
        auditLogService.log(
            actorId, 
            "TEST_AUDIT_LOG_ACTION", 
            "TestEntity", 
            entityId, 
            Map.of("name", "before_val"), 
            Map.of("name", "after_val")
        );
        
        // Wait a bit for async execution
        Thread.sleep(2000);
        
        Integer count = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM audit_log WHERE action = 'TEST_AUDIT_LOG_ACTION'", 
            Integer.class
        );
        
        assertTrue(count > 0, "Audit log should be inserted");
    }
}
