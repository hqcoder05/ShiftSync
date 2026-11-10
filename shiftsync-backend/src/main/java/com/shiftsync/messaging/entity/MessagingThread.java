package com.shiftsync.messaging.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "messaging_thread")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessagingThread {
    @Id private UUID id;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "participant_a", nullable = false) private UUID participantA;
    @Column(name = "participant_b", nullable = false) private UUID participantB;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Column(name = "latest_sequence", nullable = false) private long latestSequence;
    @Column(name = "a_read_sequence", nullable = false) private long aReadSequence;
    @Column(name = "b_read_sequence", nullable = false) private long bReadSequence;
    @Column(name = "last_message", length = 4000) private String lastMessage;
    @Column(name = "last_message_at") private OffsetDateTime lastMessageAt;
}
