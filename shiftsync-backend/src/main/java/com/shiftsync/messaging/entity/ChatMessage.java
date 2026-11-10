package com.shiftsync.messaging.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_message")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {
    @Id private UUID id;
    @Column(name = "thread_id", nullable = false) private UUID threadId;
    @Column(name = "sender_id", nullable = false) private UUID senderId;
    @Column(name = "client_message_id", nullable = false) private UUID clientMessageId;
    @Column(name = "message_sequence", nullable = false) private long sequence;
    @Column(nullable = false, length = 4000) private String content;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
}
