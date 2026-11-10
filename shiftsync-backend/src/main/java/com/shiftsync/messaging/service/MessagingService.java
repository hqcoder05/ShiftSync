package com.shiftsync.messaging.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.messaging.dto.MessagingDTOs.*;
import com.shiftsync.messaging.entity.*;
import com.shiftsync.messaging.repository.*;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MessagingService {
    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final MessagingThreadRepository threadRepository;
    private final ChatMessageRepository messageRepository;
    private final StoreAnnouncementRepository announcementRepository;

    public ReadReceipt unreadCount(UUID userId) {
        requireUser(userId);
        return new ReadReceipt(threadRepository.countAllUnreadForParticipant(userId));
    }

    public List<ContactDTO> contacts(UUID storeId, UUID userId) {
        requireMember(storeId, userId);
        Map<UUID, User> contacts = activeUsers(storeId);
        contacts.remove(userId);
        return contacts.values().stream()
                .sorted(Comparator.comparing(u -> Objects.toString(u.getFullName(), ""), String.CASE_INSENSITIVE_ORDER))
                .map(this::contactDTO).toList();
    }

    public List<ThreadDTO> threads(UUID storeId, UUID userId) {
        requireMember(storeId, userId);
        Map<UUID, User> active = activeUsers(storeId);
        return threadRepository.findForParticipant(storeId, userId).stream()
                .filter(t -> active.containsKey(otherParticipant(t, userId)))
                .map(t -> threadDTO(t, userId, active.get(otherParticipant(t, userId))))
                .toList();
    }

    @Transactional
    public ThreadDTO startThread(UUID storeId, UUID userId, UUID recipientId) {
        requireMember(storeId, userId);
        if (recipientId == null || userId.equals(recipientId)) {
            throw error(HttpStatus.BAD_REQUEST, "Choose another active employee in this store");
        }
        User recipient = requireActiveUser(storeId, recipientId);
        // UUID's Java signed comparison differs from PostgreSQL UUID ordering. Its
        // canonical hexadecimal string has the same ordering as PostgreSQL.
        boolean userFirst = userId.toString().compareTo(recipientId.toString()) < 0;
        UUID a = userFirst ? userId : recipientId;
        UUID b = userFirst ? recipientId : userId;
        // Database conflict handling keeps simultaneous opens from creating two
        // conversations or aborting either transaction.
        threadRepository.insertIfAbsent(UUID.randomUUID(), storeId, a, b);
        MessagingThread thread = threadRepository.findByStoreIdAndParticipantAAndParticipantB(storeId, a, b)
                .orElseThrow(() -> error(HttpStatus.CONFLICT, "Conversation could not be opened; please retry"));
        return threadDTO(thread, userId, recipient);
    }

    public MessagePage messages(UUID storeId, UUID userId, UUID threadId, UUID before, int requestedLimit) {
        requireMember(storeId, userId);
        MessagingThread thread = requireThread(storeId, userId, threadId, false);
        int limit = Math.max(1, Math.min(requestedLimit, 100));
        long beforeSequence = before == null ? Long.MAX_VALUE : requireMessage(threadId, before).getSequence();
        List<ChatMessage> descending = messageRepository.findByThreadIdAndSequenceLessThanOrderBySequenceDesc(
                thread.getId(), beforeSequence, PageRequest.of(0, limit + 1));
        boolean hasMore = descending.size() > limit;
        List<ChatMessage> page = new ArrayList<>(descending.subList(0, Math.min(limit, descending.size())));
        Collections.reverse(page);
        Map<UUID, User> senders = loadUsers(page.stream().map(ChatMessage::getSenderId).toList());
        UUID nextBefore = hasMore && !page.isEmpty() ? page.getFirst().getId() : null;
        return new MessagePage(page.stream().map(m -> messageDTO(m, senders.get(m.getSenderId()))).toList(), nextBefore, hasMore);
    }

    @Transactional
    public MessageDTO send(UUID storeId, UUID userId, UUID threadId, SendMessageRequest request) {
        User sender = requireMember(storeId, userId);
        MessagingThread thread = requireThread(storeId, userId, threadId, true);
        String content = cleanText(request == null ? null : request.content(), 4000, "Message");
        if (request.clientMessageId() == null) throw error(HttpStatus.BAD_REQUEST, "clientMessageId is required");
        Optional<ChatMessage> duplicate = messageRepository.findByThreadIdAndSenderIdAndClientMessageId(
                threadId, userId, request.clientMessageId());
        if (duplicate.isPresent()) {
            if (!duplicate.get().getContent().equals(content)) {
                throw error(HttpStatus.CONFLICT, "clientMessageId was already used for another message");
            }
            return messageDTO(duplicate.get(), sender);
        }
        long sequence = thread.getLatestSequence() + 1;
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        ChatMessage message = ChatMessage.builder().id(UUID.randomUUID()).threadId(threadId).senderId(userId)
                .clientMessageId(request.clientMessageId()).sequence(sequence).content(content).createdAt(now).build();
        messageRepository.save(message);
        thread.setLatestSequence(sequence);
        thread.setLastMessage(content);
        thread.setLastMessageAt(now);
        threadRepository.save(thread);
        return messageDTO(message, sender);
    }

    @Transactional
    public ReadReceipt markRead(UUID storeId, UUID userId, UUID threadId, UUID lastReadMessageId) {
        requireMember(storeId, userId);
        MessagingThread thread = requireThread(storeId, userId, threadId, true);
        long acknowledged = lastReadMessageId == null ? thread.getLatestSequence()
                : requireMessage(threadId, lastReadMessageId).getSequence();
        long next = Math.max(readSequence(thread, userId), Math.min(acknowledged, thread.getLatestSequence()));
        if (thread.getParticipantA().equals(userId)) thread.setAReadSequence(next);
        else thread.setBReadSequence(next);
        threadRepository.save(thread);
        return new ReadReceipt(unread(thread, userId));
    }

    public List<AnnouncementDTO> announcements(UUID storeId, UUID userId) {
        requireAnnouncementAccess(storeId, userId);
        List<StoreAnnouncement> announcements = announcementRepository.findByStoreIdOrderByCreatedAtDescIdDesc(storeId, PageRequest.of(0, 100));
        Map<UUID, User> authors = loadUsers(announcements.stream().map(StoreAnnouncement::getAuthorId).toList());
        return announcements.stream().map(a -> announcementDTO(a, authors.get(a.getAuthorId()))).toList();
    }

    @Transactional
    public AnnouncementDTO publish(UUID storeId, UUID userId, CreateAnnouncementRequest request) {
        User author = requireAnnouncementAccess(storeId, userId);
        if (author.getSystemRole() != SystemRole.MANAGER && author.getSystemRole() != SystemRole.ADMIN) {
            throw error(HttpStatus.FORBIDDEN, "Only a store manager or administrator may publish announcements");
        }
        String title = cleanText(request == null ? null : request.title(), 160, "Title");
        String content = cleanText(request.content(), 10000, "Announcement");
        StoreAnnouncement announcement = StoreAnnouncement.builder().id(UUID.randomUUID()).storeId(storeId)
                .authorId(userId).title(title).content(content).createdAt(OffsetDateTime.now(ZoneOffset.UTC)).build();
        announcementRepository.save(announcement);
        return announcementDTO(announcement, author);
    }

    private User requireMember(UUID storeId, UUID userId) {
        requireStore(storeId);
        return requireActiveUser(storeId, userId);
    }

    private User requireAnnouncementAccess(UUID storeId, UUID userId) {
        requireStore(storeId);
        User user = requireUser(userId);
        if (user.getSystemRole() != SystemRole.ADMIN) requireActiveEmployment(storeId, userId);
        return user;
    }

    private void requireStore(UUID storeId) {
        if (storeId == null || storeRepository.findById(storeId).filter(s -> !s.isDeleted()).isEmpty()) {
            throw error(HttpStatus.NOT_FOUND, "Store not found");
        }
    }

    private User requireActiveUser(UUID storeId, UUID userId) {
        User user = requireUser(userId);
        requireActiveEmployment(storeId, userId);
        return user;
    }

    private User requireUser(UUID userId) {
        if (userId == null) throw error(HttpStatus.UNAUTHORIZED, "Authentication required");
        return userRepository.findById(userId).filter(u -> !u.isDeleted())
                .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "User account is not available"));
    }

    private void requireActiveEmployment(UUID storeId, UUID userId) {
        if (!employmentRepository.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE)) {
            throw error(HttpStatus.FORBIDDEN, "Active employment at this store is required");
        }
    }

    private MessagingThread requireThread(UUID storeId, UUID userId, UUID threadId, boolean lock) {
        MessagingThread thread = (lock ? threadRepository.findByIdForUpdate(threadId) : threadRepository.findById(threadId))
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Conversation not found"));
        if (!thread.getStoreId().equals(storeId)) throw error(HttpStatus.NOT_FOUND, "Conversation not found");
        if (!thread.getParticipantA().equals(userId) && !thread.getParticipantB().equals(userId)) {
            throw error(HttpStatus.FORBIDDEN, "Only conversation participants may access messages");
        }
        requireActiveUser(storeId, otherParticipant(thread, userId));
        return thread;
    }

    private ChatMessage requireMessage(UUID threadId, UUID messageId) {
        return messageRepository.findByIdAndThreadId(messageId, threadId)
                .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Message cursor does not belong to this conversation"));
    }

    private Map<UUID, User> activeUsers(UUID storeId) {
        Map<UUID, User> users = new LinkedHashMap<>();
        for (Employment employment : employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE)) {
            User user = employment.getUser();
            if (user != null && !user.isDeleted()) users.put(user.getId(), user);
        }
        return users;
    }

    private Map<UUID, User> loadUsers(Collection<UUID> ids) {
        Map<UUID, User> users = new HashMap<>();
        if (!ids.isEmpty()) userRepository.findAllById(new HashSet<>(ids)).forEach(u -> users.put(u.getId(), u));
        return users;
    }

    private UUID otherParticipant(MessagingThread thread, UUID userId) {
        return thread.getParticipantA().equals(userId) ? thread.getParticipantB() : thread.getParticipantA();
    }

    private long readSequence(MessagingThread thread, UUID userId) {
        return thread.getParticipantA().equals(userId) ? thread.getAReadSequence() : thread.getBReadSequence();
    }

    private long unread(MessagingThread thread, UUID userId) {
        return messageRepository.countByThreadIdAndSequenceGreaterThanAndSenderIdNot(thread.getId(), readSequence(thread, userId), userId);
    }

    private ContactDTO contactDTO(User user) {
        return new ContactDTO(user.getId(), user.getFullName(), user.getAvatarId(), user.getSystemRole().name());
    }

    private ThreadDTO threadDTO(MessagingThread thread, UUID userId, User other) {
        return new ThreadDTO(thread.getId(), thread.getStoreId(), contactDTO(other), thread.getLastMessage(), thread.getLastMessageAt(), unread(thread, userId));
    }

    private MessageDTO messageDTO(ChatMessage message, User sender) {
        return new MessageDTO(message.getId(), message.getThreadId(), message.getSenderId(),
                sender == null ? "Unavailable account" : sender.getFullName(), sender == null ? null : sender.getAvatarId(),
                message.getContent(), message.getCreatedAt(), message.getClientMessageId(), message.getSequence());
    }

    private AnnouncementDTO announcementDTO(StoreAnnouncement announcement, User author) {
        return new AnnouncementDTO(announcement.getId(), announcement.getStoreId(), announcement.getTitle(), announcement.getContent(),
                announcement.getAuthorId(), author == null ? "Unavailable account" : author.getFullName(),
                author == null ? null : author.getAvatarId(), announcement.getCreatedAt());
    }

    private String cleanText(String value, int max, String field) {
        if (value == null || value.isBlank() || value.length() > max || value.indexOf('\0') >= 0) {
            throw error(HttpStatus.BAD_REQUEST, field + " must contain 1 to " + max + " characters");
        }
        return value.strip();
    }

    private BusinessException error(HttpStatus status, String message) {
        return new BusinessException(message, status);
    }
}
