package com.shiftsync.messaging.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class MessagingDTOs {
    private MessagingDTOs() {}

    public record ContactDTO(UUID id, String fullName, String avatarId, String role) {}
    public record ThreadDTO(UUID id, UUID storeId, ContactDTO participant, String lastMessage,
                            OffsetDateTime lastMessageAt, long unreadCount) {}
    public record MessageDTO(UUID id, UUID threadId, UUID senderId, String senderName,
                             String senderAvatarId, String content, OffsetDateTime createdAt,
                             UUID clientMessageId, long sequence) {}
    public record MessagePage(List<MessageDTO> messages, UUID nextBefore, boolean hasMore) {}
    public record AnnouncementDTO(UUID id, UUID storeId, String title, String content,
                                  UUID authorId, String authorName, String authorAvatarId,
                                  OffsetDateTime createdAt) {}
    public record StartThreadRequest(@NotNull UUID recipientId) {}
    public record SendMessageRequest(@NotBlank @Size(max = 4000) String content,
                                     @NotNull UUID clientMessageId) {}
    public record CreateAnnouncementRequest(@NotBlank @Size(max = 160) String title,
                                            @NotBlank @Size(max = 10000) String content) {}
    public record MarkReadRequest(UUID lastReadMessageId) {}
    public record ReadReceipt(long unreadCount) {}
}
