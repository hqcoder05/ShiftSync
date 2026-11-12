package com.shiftsync.attendance.controller;

import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/users/me/activity")
public class StaffActivityController {
    private final EntityManager db;
    private final UserRepository users;
    private final EmploymentRepository employments;
    public StaffActivityController(EntityManager db, UserRepository users, EmploymentRepository employments) {
        this.db = db; this.users = users; this.employments = employments;
    }
    record Event(String id, String type, String title, String description, OffsetDateTime occurredAt, String targetScreen, UUID entityId, UUID storeId) {}
    record Page(List<Event> items, String nextCursor) {}

    @GetMapping
    @Transactional(readOnly = true)
    public Page list(@RequestParam UUID storeId, @RequestParam(defaultValue = "30") int limit,
                     @RequestParam(required = false) String before, Authentication auth) {
        UUID userId = users.findByEmail(auth.getName()).orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản.", HttpStatus.NOT_FOUND)).getId();
        if (!employments.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE))
            throw new BusinessException("Bạn không thuộc chi nhánh này.", HttpStatus.FORBIDDEN);
        limit = Math.max(1, Math.min(limit, 50));
        OffsetDateTime cursorTime = OffsetDateTime.parse("9999-01-01T00:00:00Z");
        String cursorId = "~";
        if (before != null && !before.isBlank()) {
            try {
                String[] parts = new String(Base64.getUrlDecoder().decode(before), StandardCharsets.UTF_8).split("\\|", 2);
                cursorTime = OffsetDateTime.parse(parts[0]); cursorId = parts[1];
            } catch (RuntimeException ex) { throw new BusinessException("Mốc phân trang không hợp lệ."); }
        }
        String sql = """
            SELECT event_id, kind, happened, entity_id FROM (
              SELECT 'in:' || a.id AS event_id, 'ATTENDANCE_IN' AS kind, a.check_in_time AS happened, a.id AS entity_id
                FROM attendance a JOIN shift_assignment sa ON sa.id=a.shift_assignment_id JOIN shift s ON s.id=sa.shift_id
                WHERE sa.staff_id=:staff AND s.store_id=:store AND NOT a.deleted AND NOT sa.deleted AND a.check_in_time IS NOT NULL
              UNION ALL
              SELECT 'out:' || a.id, 'ATTENDANCE_OUT', a.check_out_time, a.id
                FROM attendance a JOIN shift_assignment sa ON sa.id=a.shift_assignment_id JOIN shift s ON s.id=sa.shift_id
                WHERE sa.staff_id=:staff AND s.store_id=:store AND NOT a.deleted AND NOT sa.deleted AND a.check_out_time IS NOT NULL
              UNION ALL
              SELECT 'leave:' || l.id, 'LEAVE_CREATED', l.created_at, l.id FROM leave_request l WHERE l.staff_id=:staff AND l.store_id=:store
              UNION ALL
              SELECT 'adjustment:' || ar.id, 'ADJUSTMENT_CREATED', ar.created_at, ar.id FROM attendance_adjustment_request ar JOIN shift s ON s.id=ar.shift_id
                WHERE ar.staff_id=:staff AND s.store_id=:store AND ar.created_at IS NOT NULL
              UNION ALL
              SELECT 'request:' || r.id, 'REQUEST_CREATED', r.created_at, r.id FROM staff_requests r
                WHERE r.requester_id=:staff AND r.store_id=:store AND r.created_at IS NOT NULL
              UNION ALL
              SELECT 'swap:' || sw.id, 'SWAP_CREATED', sw.created_at, sw.id FROM shift_swap_request sw JOIN shift s ON s.id=sw.from_shift_id
                WHERE sw.from_staff_id=:staff AND s.store_id=:store AND sw.created_at IS NOT NULL
              UNION ALL
              SELECT 'incident:' || i.id, 'INCIDENT_CREATED', i.created_at, i.id FROM incident_report i
                WHERE i.reporter_id=:staff AND i.store_id=:store AND i.created_at IS NOT NULL
              UNION ALL
              SELECT 'shift:' || sa.id, CASE WHEN sa.source='OPEN_SHIFT' THEN 'SHIFT_CLAIM' ELSE 'SHIFT_ASSIGNED' END, sa.assigned_at, sa.shift_id FROM shift_assignment sa JOIN shift s ON s.id=sa.shift_id
                WHERE sa.staff_id=:staff AND s.store_id=:store AND NOT sa.deleted AND s.status IN ('PUBLISHED','COMPLETED')
            ) events WHERE (happened < :at OR (happened = :at AND event_id < :id)) ORDER BY happened DESC, event_id DESC
            """;
        @SuppressWarnings("unchecked") List<Object[]> rows = db.createNativeQuery(sql).setParameter("staff", userId).setParameter("store", storeId)
                .setParameter("at", cursorTime).setParameter("id", cursorId).setMaxResults(limit + 1).getResultList();
        List<Event> events = new ArrayList<>();
        for (Object[] row : rows.subList(0, Math.min(limit, rows.size()))) {
            String type = (String) row[1];
            Object raw = row[2];
            OffsetDateTime at = raw instanceof OffsetDateTime o ? o
                    : raw instanceof java.time.Instant instant ? instant.atOffset(java.time.ZoneOffset.UTC)
                    : ((java.sql.Timestamp) raw).toInstant().atOffset(java.time.ZoneOffset.UTC);
            String title = switch (type) { case "ATTENDANCE_IN" -> "Đã chấm công vào"; case "ATTENDANCE_OUT" -> "Đã chấm công ra"; case "LEAVE_CREATED" -> "Đã gửi đơn nghỉ"; case "ADJUSTMENT_CREATED" -> "Đã gửi yêu cầu điều chỉnh chấm công"; case "REQUEST_CREATED" -> "Đã gửi yêu cầu"; case "SWAP_CREATED" -> "Đã gửi yêu cầu đổi ca"; case "INCIDENT_CREATED" -> "Đã báo cáo sự cố"; case "SHIFT_CLAIM" -> "Đã nhận ca mở"; default -> "Đã được phân ca"; };
            boolean requestEvent = type.startsWith("LEAVE") || type.startsWith("ADJUSTMENT") || type.startsWith("REQUEST") || type.startsWith("SWAP");
            events.add(new Event((String) row[0], type, title, null, at, type.startsWith("ATTENDANCE") ? "Attendance" : type.equals("INCIDENT_CREATED") ? "IncidentReport" : requestEvent ? "Request" : "Schedule", (UUID) row[3], storeId));
        }
        String next = null;
        if (rows.size() > limit && !events.isEmpty()) {
            Event last = events.getLast();
            next = Base64.getUrlEncoder().withoutPadding().encodeToString((last.occurredAt() + "|" + last.id()).getBytes(StandardCharsets.UTF_8));
        }
        return new Page(events, next);
    }
}
