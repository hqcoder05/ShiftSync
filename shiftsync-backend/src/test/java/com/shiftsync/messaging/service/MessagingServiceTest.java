package com.shiftsync.messaging.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.messaging.dto.MessagingDTOs.*;
import com.shiftsync.messaging.entity.*;
import com.shiftsync.messaging.repository.*;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessagingServiceTest {
    @Mock EmploymentRepository employments;
    @Mock UserRepository users;
    @Mock StoreRepository stores;
    @Mock MessagingThreadRepository threads;
    @Mock ChatMessageRepository messages;
    @Mock StoreAnnouncementRepository announcements;
    MessagingService service;
    final UUID storeId = UUID.randomUUID(), otherStore = UUID.randomUUID();
    // PostgreSQL orders UUIDs unsigned, unlike Java's UUID.compareTo.
    final UUID staffId = UUID.fromString("10000000-0000-0000-0000-000000000001");
    final UUID managerId = UUID.fromString("f0000000-0000-0000-0000-000000000002");
    final UUID strangerId = UUID.randomUUID(), adminId = UUID.randomUUID();
    final Map<UUID, User> people = new HashMap<>();
    final Map<UUID, Set<UUID>> members = new HashMap<>();
    final Map<UUID, MessagingThread> threadRows = new LinkedHashMap<>();
    final List<ChatMessage> messageRows = new ArrayList<>();
    final List<StoreAnnouncement> announcementRows = new ArrayList<>();
    final Map<UUID, Store> storeRows = new HashMap<>();

    @BeforeEach
    void setup() {
        service = new MessagingService(employments, users, stores, threads, messages, announcements);
        people.put(staffId, user(staffId, "Staff", SystemRole.STAFF));
        people.put(managerId, user(managerId, "Manager", SystemRole.MANAGER));
        people.put(strangerId, user(strangerId, "Other store", SystemRole.STAFF));
        people.put(adminId, user(adminId, "Administrator", SystemRole.ADMIN));
        members.put(storeId, new HashSet<>(Set.of(staffId, managerId)));
        members.put(otherStore, new HashSet<>(Set.of(strangerId)));
        storeRows.put(storeId, Store.builder().id(storeId).name("Store").build());
        storeRows.put(otherStore, Store.builder().id(otherStore).name("Other").build());
        lenient().when(users.findById(any())).thenAnswer(i -> Optional.ofNullable(people.get(i.getArgument(0))));
        lenient().when(users.findAllById(any())).thenAnswer(i -> {
            List<User> found = new ArrayList<>();
            ((Iterable<UUID>) i.getArgument(0)).forEach(id -> { if (people.containsKey(id) && !people.get(id).isDeleted()) found.add(people.get(id)); });
            return found;
        });
        lenient().when(stores.findById(any())).thenAnswer(i -> Optional.ofNullable(storeRows.get(i.getArgument(0))));
        lenient().when(employments.existsByUserIdAndStoreIdAndStatus(any(), any(), eq(EmploymentStatus.ACTIVE)))
                .thenAnswer(i -> members.getOrDefault(i.getArgument(1), Set.of()).contains(i.getArgument(0)));
        lenient().when(employments.findByStoreIdAndStatus(any(), eq(EmploymentStatus.ACTIVE)))
                .thenAnswer(i -> members.getOrDefault(i.getArgument(0), Set.of()).stream()
                        .map(id -> Employment.builder().user(people.get(id)).status(EmploymentStatus.ACTIVE).build()).toList());
        lenient().doAnswer(i -> {
            UUID id = i.getArgument(0), store = i.getArgument(1), a = i.getArgument(2), b = i.getArgument(3);
            if (threadRows.values().stream().noneMatch(t -> t.getStoreId().equals(store) && t.getParticipantA().equals(a) && t.getParticipantB().equals(b)))
                threadRows.put(id, MessagingThread.builder().id(id).storeId(store).participantA(a).participantB(b).createdAt(OffsetDateTime.now()).build());
            return null;
        }).when(threads).insertIfAbsent(any(), any(), any(), any());
        lenient().when(threads.findByStoreIdAndParticipantAAndParticipantB(any(), any(), any())).thenAnswer(i -> threadRows.values().stream()
                .filter(t -> t.getStoreId().equals(i.getArgument(0)) && t.getParticipantA().equals(i.getArgument(1)) && t.getParticipantB().equals(i.getArgument(2))).findFirst());
        lenient().when(threads.findById(any())).thenAnswer(i -> Optional.ofNullable(threadRows.get(i.getArgument(0))));
        lenient().when(threads.findByIdForUpdate(any())).thenAnswer(i -> Optional.ofNullable(threadRows.get(i.getArgument(0))));
        lenient().when(threads.findForParticipant(any(), any())).thenAnswer(i -> threadRows.values().stream()
                .filter(t -> t.getStoreId().equals(i.getArgument(0)) && (t.getParticipantA().equals(i.getArgument(1)) || t.getParticipantB().equals(i.getArgument(1))))
                .sorted(Comparator.comparing((MessagingThread t) -> t.getLastMessageAt() == null ? t.getCreatedAt() : t.getLastMessageAt()).reversed()).toList());
        lenient().when(threads.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(messages.save(any())).thenAnswer(i -> { ChatMessage m = i.getArgument(0); messageRows.add(m); return m; });
        lenient().when(messages.findByThreadIdAndSenderIdAndClientMessageId(any(), any(), any())).thenAnswer(i -> messageRows.stream()
                .filter(m -> m.getThreadId().equals(i.getArgument(0)) && m.getSenderId().equals(i.getArgument(1)) && m.getClientMessageId().equals(i.getArgument(2))).findFirst());
        lenient().when(messages.findByIdAndThreadId(any(), any())).thenAnswer(i -> messageRows.stream()
                .filter(m -> m.getId().equals(i.getArgument(0)) && m.getThreadId().equals(i.getArgument(1))).findFirst());
        lenient().when(messages.findByThreadIdAndSequenceLessThanOrderBySequenceDesc(any(), anyLong(), any())).thenAnswer(i -> messageRows.stream()
                .filter(m -> m.getThreadId().equals(i.getArgument(0)) && m.getSequence() < (long) i.getArgument(1))
                .sorted(Comparator.comparingLong(ChatMessage::getSequence).reversed()).limit(((Pageable) i.getArgument(2)).getPageSize()).toList());
        lenient().when(messages.countByThreadIdAndSequenceGreaterThanAndSenderIdNot(any(), anyLong(), any())).thenAnswer(i -> messageRows.stream()
                .filter(m -> m.getThreadId().equals(i.getArgument(0)) && m.getSequence() > (long) i.getArgument(1) && !m.getSenderId().equals(i.getArgument(2))).count());
        lenient().when(announcements.save(any())).thenAnswer(i -> { StoreAnnouncement a = i.getArgument(0); announcementRows.add(a); return a; });
        lenient().when(announcements.findByStoreIdOrderByCreatedAtDescIdDesc(any(), any())).thenAnswer(i -> announcementRows.stream()
                .filter(a -> a.getStoreId().equals(i.getArgument(0))).sorted(Comparator.comparing(StoreAnnouncement::getCreatedAt).reversed())
                .limit(((Pageable) i.getArgument(1)).getPageSize()).toList());
    }

    @Test void contactsExcludeSelfOtherStoresAndDeletedAccounts() {
        UUID deletedId = UUID.randomUUID();
        User deleted = user(deletedId, "Deleted", SystemRole.STAFF); deleted.setDeleted(true);
        people.put(deletedId, deleted); members.get(storeId).add(deletedId);
        List<ContactDTO> contacts = service.contacts(storeId, staffId);
        assertEquals(List.of(managerId), contacts.stream().map(ContactDTO::id).toList());
        assertEquals("MANAGER", contacts.getFirst().role());
        assertEquals("avatar-Manager", contacts.getFirst().avatarId());
    }

    @Test void outsideStoreCannotReadOrWriteAnyScopedEndpoint() {
        UUID id = createThread();
        assertStatus(HttpStatus.FORBIDDEN, () -> service.contacts(storeId, strangerId));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.threads(storeId, strangerId));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.startThread(storeId, strangerId, staffId));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.messages(storeId, strangerId, id, null, 50));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.send(storeId, strangerId, id, message("Private")));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.markRead(storeId, strangerId, id, null));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.announcements(storeId, strangerId));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.publish(storeId, strangerId, announcement("Title", "Content")));
    }

    @Test void activeNonparticipantCannotReadWriteOrMarkAnotherThread() {
        UUID id = createThread(); members.get(storeId).add(strangerId);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.messages(storeId, strangerId, id, null, 50));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.send(storeId, strangerId, id, message("Private")));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.markRead(storeId, strangerId, id, null));
        verify(messages, never()).save(any());
    }

    @Test void threadCannotBeReusedUnderAnotherStoreEvenWithMembershipInBoth() {
        UUID id = createThread(); members.get(otherStore).addAll(Set.of(staffId, managerId));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.messages(otherStore, staffId, id, null, 50));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.send(otherStore, staffId, id, message("Wrong store")));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.markRead(otherStore, staffId, id, null));
    }

    @Test void inactiveRecipientImmediatelyDisappearsAndBlocksHistoryAndWrites() {
        UUID id = createThread(); members.get(storeId).remove(managerId);
        assertTrue(service.threads(storeId, staffId).isEmpty());
        assertStatus(HttpStatus.FORBIDDEN, () -> service.messages(storeId, staffId, id, null, 50));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.send(storeId, staffId, id, message("Blocked")));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.markRead(storeId, staffId, id, null));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.contacts(storeId, managerId));
    }

    @Test void canonicalPairIsIdempotentFromBothSidesAcrossSignedUuidBoundary() {
        ThreadDTO a = service.startThread(storeId, staffId, managerId), b = service.startThread(storeId, managerId, staffId);
        assertEquals(a.id(), b.id()); assertEquals(1, threadRows.size());
        assertEquals(staffId, threadRows.get(a.id()).getParticipantA());
        assertEquals(managerId, a.participant().id()); assertEquals(staffId, b.participant().id());
    }

    @Test void samePairInAnotherStoreHasIndependentConversation() {
        UUID first = createThread(); members.get(otherStore).addAll(Set.of(staffId, managerId));
        assertNotEquals(first, service.startThread(otherStore, staffId, managerId).id());
        assertEquals(2, threadRows.size());
    }

    @Test void cannotStartSelfChatOrChatWithInactiveOrOtherStoreEmployee() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.startThread(storeId, staffId, staffId));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.startThread(storeId, staffId, null));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.startThread(storeId, staffId, strangerId));
        members.get(storeId).remove(managerId);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.startThread(storeId, staffId, managerId));
        assertTrue(threadRows.isEmpty());
    }

    @Test void sendUsesAuthenticatedSenderAndUpdatesThreadSequenceUnderLock() {
        UUID id = createThread();
        MessageDTO first = service.send(storeId, staffId, id, message("  Hello  "));
        MessageDTO second = service.send(storeId, managerId, id, message("Reply"));
        assertEquals(staffId, first.senderId()); assertEquals("Staff", first.senderName());
        assertEquals("avatar-Staff", first.senderAvatarId()); assertEquals("Hello", first.content());
        assertEquals(2, threadRows.get(id).getLatestSequence()); assertEquals("Reply", threadRows.get(id).getLastMessage());
        assertEquals(second.createdAt(), threadRows.get(id).getLastMessageAt());
        assertEquals(List.of(1L, 2L), messageRows.stream().map(ChatMessage::getSequence).toList());
        var order = inOrder(threads, messages);
        order.verify(threads).findByIdForUpdate(id);
        order.verify(messages).findByThreadIdAndSenderIdAndClientMessageId(eq(id), eq(staffId), any());
        order.verify(messages).save(any());
    }

    @Test void retryReturnsOriginalWithoutDuplicateOrSequenceIncrement() {
        UUID id = createThread(); SendMessageRequest request = message("Retry safely");
        MessageDTO original = service.send(storeId, staffId, id, request);
        assertEquals(original, service.send(storeId, staffId, id, request));
        assertEquals(1, messageRows.size()); assertEquals(1, threadRows.get(id).getLatestSequence());
        verify(messages, times(1)).save(any());
    }

    @Test void idempotencyKeyCannotChangeContentButIsScopedToSender() {
        UUID id = createThread(), clientId = UUID.randomUUID();
        service.send(storeId, staffId, id, new SendMessageRequest("First", clientId));
        assertStatus(HttpStatus.CONFLICT, () -> service.send(storeId, staffId, id, new SendMessageRequest("Changed", clientId)));
        service.send(storeId, managerId, id, new SendMessageRequest("Other sender", clientId));
        assertEquals(2, messageRows.size());
    }

    @Test void rejectBlankOversizedNullAndInvalidTextBeforePersistence() {
        UUID id = createThread();
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.send(storeId, staffId, id, message(" \n\t ")));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.send(storeId, staffId, id, message("x".repeat(4001))));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.send(storeId, staffId, id, message("bad\0text")));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.send(storeId, staffId, id, new SendMessageRequest("Text", null)));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.send(storeId, staffId, id, null));
        assertTrue(messageRows.isEmpty());
    }

    @Test void latestAndOlderCursorPagesAreAscendingWithoutGapsOrDuplicates() {
        UUID id = createThread();
        for (int i = 1; i <= 7; i++) service.send(storeId, staffId, id, message("Message " + i));
        MessagePage latest = service.messages(storeId, managerId, id, null, 3);
        assertEquals(List.of("Message 5", "Message 6", "Message 7"), latest.messages().stream().map(MessageDTO::content).toList());
        assertTrue(latest.hasMore()); assertEquals(latest.messages().getFirst().id(), latest.nextBefore());
        MessagePage older = service.messages(storeId, managerId, id, latest.nextBefore(), 3);
        assertEquals(List.of("Message 2", "Message 3", "Message 4"), older.messages().stream().map(MessageDTO::content).toList());
        MessagePage oldest = service.messages(storeId, managerId, id, older.nextBefore(), 3);
        assertEquals(List.of("Message 1"), oldest.messages().stream().map(MessageDTO::content).toList());
        assertFalse(oldest.hasMore()); assertNull(oldest.nextBefore());
    }

    @Test void historyPageSizeIsBounded() {
        UUID id = createThread();
        service.messages(storeId, staffId, id, null, Integer.MAX_VALUE);
        verify(messages).findByThreadIdAndSequenceLessThanOrderBySequenceDesc(eq(id), eq(Long.MAX_VALUE), argThat(p -> p.getPageSize() == 101));
        service.messages(storeId, staffId, id, null, -5);
        verify(messages).findByThreadIdAndSequenceLessThanOrderBySequenceDesc(eq(id), eq(Long.MAX_VALUE), argThat(p -> p.getPageSize() == 2));
    }

    @Test void cursorFromAnotherThreadCannotPageOrAcknowledgeThisThread() {
        UUID id = createThread(), alien = UUID.randomUUID();
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.messages(storeId, staffId, id, alien, 50));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.markRead(storeId, staffId, id, alien));
        assertEquals(0, threadRows.get(id).getAReadSequence());
    }

    @Test void receiptOnlyAcknowledgesFetchedMessagesAndNeverMovesBackwards() {
        UUID id = createThread();
        MessageDTO first = service.send(storeId, managerId, id, message("One"));
        MessageDTO fetched = service.send(storeId, managerId, id, message("Two"));
        assertEquals(2, service.messages(storeId, staffId, id, null, 50).messages().size());
        service.send(storeId, managerId, id, message("Arrived after fetch"));
        assertEquals(3, service.threads(storeId, staffId).getFirst().unreadCount());
        assertEquals(1, service.markRead(storeId, staffId, id, fetched.id()).unreadCount());
        assertEquals(1, service.markRead(storeId, staffId, id, first.id()).unreadCount());
        assertEquals(2, threadRows.get(id).getAReadSequence());
    }

    @Test void unreadExcludesOwnMessagesAndNullReceiptAcknowledgesCurrentLatest() {
        UUID id = createThread();
        service.send(storeId, staffId, id, message("Own")); service.send(storeId, managerId, id, message("Reply"));
        service.send(storeId, staffId, id, message("Own reply does not auto-read"));
        assertEquals(1, service.threads(storeId, staffId).getFirst().unreadCount());
        assertEquals(2, service.threads(storeId, managerId).getFirst().unreadCount());
        assertEquals(0, service.markRead(storeId, staffId, id, null).unreadCount());
        assertEquals(3, threadRows.get(id).getAReadSequence()); assertEquals(0, threadRows.get(id).getBReadSequence());
    }

    @Test void managerPublishesAndStaffReadsWithinSameStoreOnly() {
        AnnouncementDTO published = service.publish(storeId, managerId, announcement("  Team update  ", "  Schedule ready  "));
        assertEquals("Team update", published.title()); assertEquals("Schedule ready", published.content());
        assertEquals(managerId, published.authorId()); assertEquals("Manager", published.authorName());
        assertEquals(List.of(published), service.announcements(storeId, staffId));
        assertTrue(service.announcements(otherStore, strangerId).isEmpty());
        assertStatus(HttpStatus.FORBIDDEN, () -> service.publish(storeId, staffId, announcement("Not manager", "Content")));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.publish(otherStore, managerId, announcement("Other store", "Content")));
        members.get(storeId).remove(managerId);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.publish(storeId, managerId, announcement("Inactive", "Content")));
    }

    @Test void adminMayPublishScopedAnnouncementsButNeedsEmploymentForDirectChat() {
        AnnouncementDTO published = service.publish(storeId, adminId, announcement("Admin", "Content"));
        assertEquals(adminId, published.authorId()); assertEquals(1, service.announcements(storeId, adminId).size());
        assertStatus(HttpStatus.FORBIDDEN, () -> service.contacts(storeId, adminId));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.startThread(storeId, adminId, staffId));
        members.get(storeId).add(adminId); assertNotNull(service.startThread(storeId, adminId, staffId));
    }

    @Test void announcementValidationMatchesMobileLimits() {
        AnnouncementDTO maximum = service.publish(storeId, managerId, announcement("x".repeat(160), "y".repeat(10000)));
        assertEquals(10000, maximum.content().length()); assertNotNull(maximum.createdAt());
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(storeId, managerId, announcement("x".repeat(161), "Content")));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(storeId, managerId, announcement("Title", "y".repeat(10001))));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(storeId, managerId, announcement(" ", "Content")));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(storeId, managerId, announcement("Title", "\n ")));
        assertEquals(1, announcementRows.size());
    }

    @Test void announcementsAreNewestFirstAndBounded() {
        for (int i = 0; i < 103; i++) announcementRows.add(StoreAnnouncement.builder().id(UUID.randomUUID()).storeId(storeId).authorId(managerId)
                .title("Title " + i).content("Content").createdAt(OffsetDateTime.parse("2026-10-22T00:00:00Z").plusSeconds(i)).build());
        List<AnnouncementDTO> page = service.announcements(storeId, staffId);
        assertEquals(100, page.size()); assertEquals("Title 102", page.getFirst().title()); assertEquals("Title 3", page.getLast().title());
    }

    @Test void deletedStoreOrAccountCannotAccessContent() {
        storeRows.get(storeId).setDeleted(true);
        assertStatus(HttpStatus.NOT_FOUND, () -> service.contacts(storeId, staffId));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.publish(storeId, adminId, announcement("Admin", "Content")));
        storeRows.get(storeId).setDeleted(false); people.get(staffId).setDeleted(true);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.contacts(storeId, staffId));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.unreadCount(staffId));
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.unreadCount(null));
    }

    @Test void aggregateUnreadUsesOnlyAuthenticatedAccount() {
        when(threads.countAllUnreadForParticipant(staffId)).thenReturn(7L);
        assertEquals(7, service.unreadCount(staffId).unreadCount());
        verify(threads).countAllUnreadForParticipant(staffId); verify(threads, never()).countAllUnreadForParticipant(managerId);
    }

    private UUID createThread() { return service.startThread(storeId, staffId, managerId).id(); }
    private User user(UUID id, String name, SystemRole role) {
        return User.builder().id(id).fullName(name).email(name + "@example.com").avatarId("avatar-" + name).systemRole(role).build();
    }
    private SendMessageRequest message(String content) { return new SendMessageRequest(content, UUID.randomUUID()); }
    private CreateAnnouncementRequest announcement(String title, String content) { return new CreateAnnouncementRequest(title, content); }
    private void assertStatus(HttpStatus expected, org.junit.jupiter.api.function.Executable operation) {
        assertEquals(expected, assertThrows(BusinessException.class, operation).getStatus());
    }
}
