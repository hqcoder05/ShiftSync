package com.shiftsync.messaging.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "store_announcement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StoreAnnouncement {
    @Id private UUID id;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "author_id", nullable = false) private UUID authorId;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 10000) private String content;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
}
