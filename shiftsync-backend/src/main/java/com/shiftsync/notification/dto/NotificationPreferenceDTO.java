package com.shiftsync.notification.dto;

import com.shiftsync.notification.entity.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreferenceDTO {
    private UUID id;
    private NotificationType notificationType;
    private boolean enabled;
}
