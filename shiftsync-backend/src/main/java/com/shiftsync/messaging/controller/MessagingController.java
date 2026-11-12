package com.shiftsync.messaging.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/messaging")
public class MessagingController {
    private final UserRepository users;
    private final EmploymentRepository employments;
    private final EntityManager db;
    @org.springframework.beans.factory.annotation.Autowired
    private com.shiftsync.notification.service.SseEmitterService events;

    private void notifyThread(UUID threadId) {
        @SuppressWarnings("unchecked") List<Object[]> participants = db.createNativeQuery("SELECT participant_one,participant_two FROM messaging_thread WHERE id=:id").setParameter("id",threadId).getResultList();
        if (events == null || participants.isEmpty()) return;
        UUID first=(UUID)participants.getFirst()[0], second=(UUID)participants.getFirst()[1];
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
            @Override public void afterCommit() {
                events.pushEvent(first,"messaging",java.util.Map.of("threadId",threadId));
                events.pushEvent(second,"messaging",java.util.Map.of("threadId",threadId));
            }
        });
    }

    public MessagingController(UserRepository users, EmploymentRepository employments, EntityManager db) {
        this.users = users;
        this.employments = employments;
        this.db = db;
    }

    private User member(UUID storeId, Authentication authentication) {
        User user = users.findByEmail(authentication.getName())
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản.", HttpStatus.NOT_FOUND));
        if (!employments.existsByUserIdAndStoreIdAndStatus(user.getId(), storeId, EmploymentStatus.ACTIVE))
            throw new BusinessException("Bạn không thuộc chi nhánh này.", HttpStatus.FORBIDDEN);
        return user;
    }

    public record Contact(UUID id, String fullName, String avatarId, String systemRole) {}
    public record Announcement(UUID id, String title, String content, String authorName, String authorAvatarId, Object createdAt) {}
    public record AnnouncementInput(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 160) String title,
                                    @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 10000) String content) {}

    @GetMapping("/announcements")
    @Transactional(readOnly = true)
    public List<Announcement> announcements(@PathVariable UUID storeId, Authentication authentication) {
        member(storeId, authentication);
        @SuppressWarnings("unchecked") List<Object[]> rows = db.createNativeQuery("SELECT a.id,a.title,a.content,s.full_name,s.avatar_id,a.created_at FROM messaging_announcement a JOIN staff s ON s.id=a.author_id WHERE a.store_id=:store ORDER BY a.created_at DESC,a.id DESC")
                .setParameter("store", storeId).setMaxResults(200).getResultList();
        return rows.stream().map(r -> new Announcement((UUID) r[0], (String) r[1], (String) r[2], (String) r[3], (String) r[4], r[5])).toList();
    }

    @PostMapping("/announcements")
    @Transactional
    public Announcement publish(@PathVariable UUID storeId, @Valid @RequestBody AnnouncementInput input, Authentication authentication) {
        User user = member(storeId, authentication);
        if (user.getSystemRole() != com.shiftsync.shared.security.SystemRole.MANAGER && user.getSystemRole() != com.shiftsync.shared.security.SystemRole.ADMIN)
            throw new BusinessException("Chỉ quản lý được đăng thông báo chung.", HttpStatus.FORBIDDEN);
        UUID id = UUID.randomUUID();
        db.createNativeQuery("INSERT INTO messaging_announcement(id,store_id,author_id,title,content) VALUES (:id,:store,:author,:title,:content)")
                .setParameter("id", id).setParameter("store", storeId).setParameter("author", user.getId())
                .setParameter("title", input.title().trim()).setParameter("content", input.content().trim()).executeUpdate();
        if (events != null) {
            List<UUID> recipients = employments.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE).stream()
                    .map(e -> e.getUser().getId()).distinct().toList();
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
                @Override public void afterCommit() {
                    recipients.forEach(recipient -> events.pushEvent(recipient, "messaging", java.util.Map.of("storeId", storeId)));
                }
            });
        }
        Object createdAt = db.createNativeQuery("SELECT created_at FROM messaging_announcement WHERE id=:id").setParameter("id", id).getSingleResult();
        return new Announcement(id, input.title().trim(), input.content().trim(), user.getFullName(), user.getAvatarId(), createdAt);
    }
    public record CreateThread(@NotNull UUID recipientId) {}
    public record ThreadView(UUID id, Contact participant, String lastMessage, Object lastMessageAt, long unreadCount) {}
    public record SendMessage(@NotNull UUID clientMessageId, @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 4000) String content) {}
    public record MessageView(UUID id, long sequence, UUID senderId, String senderName, String senderAvatarId, String content, Object createdAt) {}

    private User threadMember(UUID storeId, UUID threadId, Authentication auth) {
        User user = member(storeId, auth);
        Number count = (Number) db.createNativeQuery("SELECT count(*) FROM messaging_thread WHERE id=:thread AND store_id=:store AND (participant_one=:user OR participant_two=:user)")
                .setParameter("thread", threadId).setParameter("store", storeId).setParameter("user", user.getId()).getSingleResult();
        if (count.longValue() == 0) throw new BusinessException("Không tìm thấy cuộc trò chuyện.", HttpStatus.NOT_FOUND);
        return user;
    }

    @PostMapping("/threads/{threadId}/messages")
    @Transactional
    public MessageView send(@PathVariable UUID storeId, @PathVariable UUID threadId, @Valid @RequestBody SendMessage input, Authentication auth) {
        User sender = threadMember(storeId, threadId, auth);
        String content = input.content().trim();
        db.createNativeQuery("INSERT INTO messaging_message (id, thread_id, sender_id, client_message_id, content) VALUES (:id,:thread,:sender,:client,:content) ON CONFLICT (thread_id,sender_id,client_message_id) DO NOTHING")
                .setParameter("id", UUID.randomUUID()).setParameter("thread", threadId).setParameter("sender", sender.getId()).setParameter("client", input.clientMessageId()).setParameter("content", content).executeUpdate();
        Object[] row = (Object[]) db.createNativeQuery("SELECT id, sequence, content, created_at FROM messaging_message WHERE thread_id=:thread AND sender_id=:sender AND client_message_id=:client")
                .setParameter("thread", threadId).setParameter("sender", sender.getId()).setParameter("client", input.clientMessageId()).getSingleResult();
        if (!content.equals(row[2])) throw new BusinessException("Mã tin nhắn đã được sử dụng cho nội dung khác.", HttpStatus.CONFLICT);
        notifyThread(threadId);
        return new MessageView((UUID) row[0], ((Number) row[1]).longValue(), sender.getId(), sender.getFullName(), sender.getAvatarId(), (String) row[2], row[3]);
    }

    public record MessagePage(List<MessageView> messages, String nextBefore, boolean hasMore) {}
    @GetMapping("/threads/{threadId}/messages")
    @Transactional(readOnly = true)
    public MessagePage messages(@PathVariable UUID storeId, @PathVariable UUID threadId, @RequestParam(required = false) Long before,
                                @RequestParam(defaultValue = "50") int limit, Authentication auth) {
        threadMember(storeId, threadId, auth);
        int size = Math.max(1, Math.min(limit, 100));
        @SuppressWarnings("unchecked") List<Object[]> rows = db.createNativeQuery("SELECT m.id,m.sequence,m.sender_id,s.full_name,s.avatar_id,m.content,m.created_at FROM messaging_message m JOIN staff s ON s.id=m.sender_id WHERE m.thread_id=:thread AND m.sequence < :before ORDER BY m.sequence DESC")
                .setParameter("thread", threadId).setParameter("before", before == null ? Long.MAX_VALUE : before).setMaxResults(size + 1).getResultList();
        boolean more = rows.size() > size;
        List<MessageView> page = new java.util.ArrayList<>(rows.subList(0, Math.min(size, rows.size())).stream().map(r -> new MessageView((UUID) r[0], ((Number) r[1]).longValue(), (UUID) r[2], (String) r[3], (String) r[4], (String) r[5], r[6])).toList());
        java.util.Collections.reverse(page);
        return new MessagePage(page, more ? Long.toString(page.getFirst().sequence()) : null, more);
    }

    public record ReadRequest(@NotNull UUID lastReadMessageId) {}
    @PostMapping("/threads/{threadId}/read")
    @Transactional
    public java.util.Map<String, Long> read(@PathVariable UUID storeId, @PathVariable UUID threadId, @Valid @RequestBody ReadRequest input, Authentication auth) {
        User user = threadMember(storeId, threadId, auth);
        var rows = db.createNativeQuery("SELECT sequence FROM messaging_message WHERE id=:id AND thread_id=:thread")
                .setParameter("id", input.lastReadMessageId()).setParameter("thread", threadId).getResultList();
        if (rows.isEmpty()) throw new BusinessException("Không tìm thấy tin nhắn.", HttpStatus.NOT_FOUND);
        long sequence = ((Number) rows.getFirst()).longValue();
        db.createNativeQuery("INSERT INTO messaging_read_cursor (thread_id,staff_id,last_sequence) VALUES (:thread,:user,:seq) ON CONFLICT (thread_id,staff_id) DO UPDATE SET last_sequence=GREATEST(messaging_read_cursor.last_sequence,EXCLUDED.last_sequence)")
                .setParameter("thread", threadId).setParameter("user", user.getId()).setParameter("seq", sequence).executeUpdate();
        Number unread = (Number) db.createNativeQuery("SELECT count(*) FROM messaging_message m JOIN messaging_read_cursor c ON c.thread_id=m.thread_id AND c.staff_id=:user WHERE m.thread_id=:thread AND m.sender_id<>:user AND m.sequence>c.last_sequence")
                .setParameter("thread", threadId).setParameter("user", user.getId()).getSingleResult();
        return java.util.Map.of("unreadCount", unread.longValue());
    }

    private Contact contact(User user) {
        return new Contact(user.getId(), user.getFullName(), user.getAvatarId(), user.getSystemRole().name());
    }

    @GetMapping("/threads")
    @Transactional(readOnly = true)
    public List<ThreadView> threads(@PathVariable UUID storeId, Authentication authentication) {
        User user = member(storeId, authentication);
        @SuppressWarnings("unchecked") List<Object[]> rows = db.createNativeQuery("""
            SELECT t.id, CASE WHEN t.participant_one=:user THEN t.participant_two ELSE t.participant_one END,
                   last.content, last.created_at,
                   (SELECT count(*) FROM messaging_message m WHERE m.thread_id=t.id AND m.sender_id<>:user
                     AND m.sequence > COALESCE((SELECT c.last_sequence FROM messaging_read_cursor c WHERE c.thread_id=t.id AND c.staff_id=:user),0))
            FROM messaging_thread t
            LEFT JOIN LATERAL (SELECT content, created_at FROM messaging_message WHERE thread_id=t.id ORDER BY sequence DESC LIMIT 1) last ON true
            WHERE t.store_id=:store AND (t.participant_one=:user OR t.participant_two=:user)
            ORDER BY COALESCE(last.created_at,t.created_at) DESC, t.id DESC
            """).setParameter("user", user.getId()).setParameter("store", storeId).getResultList();
        return rows.stream().map(row -> users.findById((UUID) row[1])
                .map(person -> new ThreadView((UUID) row[0], contact(person), (String) row[2], row[3], ((Number) row[4]).longValue()))
                .orElse(null)).filter(java.util.Objects::nonNull).toList();
    }

    @PostMapping("/threads")
    @Transactional
    public ThreadView createThread(@PathVariable UUID storeId, @Valid @RequestBody CreateThread request, Authentication authentication) {
        User user = member(storeId, authentication);
        if (user.getId().equals(request.recipientId())) throw new BusinessException("Không thể tạo cuộc trò chuyện với chính mình.");
        if (!employments.existsByUserIdAndStoreIdAndStatus(request.recipientId(), storeId, EmploymentStatus.ACTIVE))
            throw new BusinessException("Người nhận không thuộc chi nhánh này.", HttpStatus.FORBIDDEN);
        User recipient = users.findById(request.recipientId()).orElseThrow(() -> new BusinessException("Không tìm thấy người nhận.", HttpStatus.NOT_FOUND));
        // PostgreSQL UUID ordering follows unsigned bytes, represented by canonical UUID strings.
        UUID one = user.getId().toString().compareTo(recipient.getId().toString()) < 0 ? user.getId() : recipient.getId();
        UUID two = one.equals(user.getId()) ? recipient.getId() : user.getId();
        db.createNativeQuery("INSERT INTO messaging_thread (id, store_id, participant_one, participant_two) VALUES (:id, :store, :one, :two) ON CONFLICT (store_id, participant_one, participant_two) DO NOTHING")
                .setParameter("id", UUID.randomUUID()).setParameter("store", storeId).setParameter("one", one).setParameter("two", two).executeUpdate();
        UUID id = (UUID) db.createNativeQuery("SELECT id FROM messaging_thread WHERE store_id=:store AND participant_one=:one AND participant_two=:two")
                .setParameter("store", storeId).setParameter("one", one).setParameter("two", two).getSingleResult();
        return threads(storeId, authentication).stream().filter(thread -> thread.id().equals(id)).findFirst()
                .orElseThrow(() -> new BusinessException("Không thể tải cuộc trò chuyện.", HttpStatus.INTERNAL_SERVER_ERROR));
    }

    @GetMapping("/contacts")
    @Transactional(readOnly = true)
    public List<Contact> contacts(@PathVariable UUID storeId, Authentication authentication) {
        User user = member(storeId, authentication);
        return employments.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE).stream()
                .map(e -> e.getUser())
                .filter(person -> person != null && !person.getId().equals(user.getId()))
                .collect(java.util.stream.Collectors.toMap(User::getId,
                        person -> new Contact(person.getId(), person.getFullName(), person.getAvatarId(), person.getSystemRole().name()),
                        (first, ignored) -> first, java.util.LinkedHashMap::new))
                .values().stream().toList();
    }
}
