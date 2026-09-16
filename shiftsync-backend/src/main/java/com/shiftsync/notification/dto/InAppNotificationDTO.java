package com.shiftsync.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InAppNotificationDTO {
    private UUID id;
    private String type;
    private String title;
    private String message;
    private boolean isRead;
    private OffsetDateTime createdAt;
}