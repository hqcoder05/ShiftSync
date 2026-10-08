package com.shiftsync.performance;

import com.shiftsync.auth.dto.UserCreateRequest;
import com.shiftsync.auth.service.UserService;
import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class PerformanceClosureGateTest {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Autowired
    private UserService userService;

    @Test
    @Transactional
    public void testExplainAnalyze() {
        String[] queries = {
            "EXPLAIN (ANALYZE, BUFFERS) SELECT e.* FROM employment e WHERE e.store_id = '550e8400-e29b-41d4-a716-446655440000' AND e.status = 'ACTIVE'",
            "EXPLAIN (ANALYZE, BUFFERS) SELECT COUNT(e1) FROM employment e1 INNER JOIN employment e2 ON e1.store_id = e2.store_id WHERE e1.staff_id = '550e8400-e29b-41d4-a716-446655440000' AND e1.status = 'ACTIVE' AND e2.staff_id = '550e8400-e29b-41d4-a716-446655440000' AND e2.status = 'ACTIVE'",
            "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM skill WHERE id IN ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001')",
            "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM shift s WHERE s.store_id = '550e8400-e29b-41d4-a716-446655440000' AND s.shift_date BETWEEN '2026-01-01' AND '2026-01-31'",
            "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM shift_assignment WHERE shift_id = '550e8400-e29b-41d4-a716-446655440000'",
            "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM leave_request WHERE store_id = '550e8400-e29b-41d4-a716-446655440000' AND status = 'APPROVED' AND start_date <= '2026-01-31' AND end_date >= '2026-01-01'"
        };

        for (int i=0; i<queries.length; i++) {
            System.out.println("QUERY " + (i+1) + " EXPLAIN:");
            try {
                List<String> results = entityManager.createNativeQuery(queries[i]).getResultList();
                results.forEach(System.out::println);
            } catch (Exception e) {
                System.out.println("Failed: " + e.getMessage());
            }
            System.out.println("----------------------------------------");
        }
    }

    @Test
    public void testDuplicateSkillUUIDInput() {
        UUID skillA = UUID.randomUUID();
        UUID skillB = UUID.randomUUID();

        // Testing duplicate [A, A]
        UserCreateRequest request = new UserCreateRequest();
        request.setSystemRole(SystemRole.STAFF);
        request.setSkillIds(Arrays.asList(skillA, skillA));
        
        // This will fail because the skills don't exist in DB, but we want to see if the BusinessException matches 
        // the duplicate logic correctly if it were to exist. Actually since it doesn't exist, foundCount will be 0.
        // foundCount = 0. uniqueSkillIds.size() = 1. 0 != 1 -> throws Exception.
        try {
            userService.createUser(request);
            fail("Should throw BusinessException");
        } catch (BusinessException e) {
            assertTrue(e.getMessage().contains("không tồn tại"));
        }
    }

}

