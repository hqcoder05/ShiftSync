package com.shiftsync.messaging.controller;

import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me/messaging")
public class MessagingUnreadController {
    private final UserRepository users;
    private final EntityManager db;
    public MessagingUnreadController(UserRepository users, EntityManager db) { this.users = users; this.db = db; }

    @GetMapping("/unread-count")
    @Transactional(readOnly = true)
    public Map<String, Long> unread(Authentication auth) {
        UUID user = users.findByEmail(auth.getName()).orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản.", HttpStatus.NOT_FOUND)).getId();
        Number count = (Number) db.createNativeQuery("""
            SELECT count(*) FROM messaging_message m JOIN messaging_thread t ON t.id=m.thread_id
            WHERE (t.participant_one=:user OR t.participant_two=:user) AND m.sender_id<>:user
              AND EXISTS (SELECT 1 FROM employment e WHERE e.staff_id=:user AND e.store_id=t.store_id AND e.status='ACTIVE')
              AND m.sequence > COALESCE((SELECT c.last_sequence FROM messaging_read_cursor c WHERE c.thread_id=t.id AND c.staff_id=:user),0)
            """).setParameter("user", user).getSingleResult();
        return Map.of("unreadCount", count.longValue());
    }
}
