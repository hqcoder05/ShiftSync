package com.shiftsync.messaging.repository;

import com.shiftsync.messaging.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    Optional<ChatMessage> findByThreadIdAndSenderIdAndClientMessageId(UUID threadId, UUID senderId, UUID clientMessageId);
    Optional<ChatMessage> findByIdAndThreadId(UUID id, UUID threadId);
    List<ChatMessage> findByThreadIdAndSequenceLessThanOrderBySequenceDesc(UUID threadId, long sequence, Pageable pageable);
    long countByThreadIdAndSequenceGreaterThanAndSenderIdNot(UUID threadId, long sequence, UUID userId);
}
