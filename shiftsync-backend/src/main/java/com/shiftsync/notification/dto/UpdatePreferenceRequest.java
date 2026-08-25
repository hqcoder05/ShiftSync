package com.shiftsync.notification.dto;

import com.shiftsync.notification.entity.NotificationType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdatePreferenceRequest {
    @NotNull(message = "Notification type is required")
    private NotificationType notificationType;

    @NotNull(message = "Enabled status is required")
    private Boolean enabled;
}
