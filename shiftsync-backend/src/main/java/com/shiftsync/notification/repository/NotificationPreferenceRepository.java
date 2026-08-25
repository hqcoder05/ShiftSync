package com.shiftsync.notification.repository;

import com.shiftsync.notification.entity.NotificationPreference;
import com.shiftsync.notification.entity.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {
    List<NotificationPreference> findByStaffId(UUID staffId);
    Optional<NotificationPreference> findByStaffIdAndNotificationType(UUID staffId, NotificationType type);
}
