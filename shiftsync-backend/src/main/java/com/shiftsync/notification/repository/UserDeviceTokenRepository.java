package com.shiftsync.notification.repository;

import com.shiftsync.notification.entity.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, UUID> {
    List<UserDeviceToken> findByUserId(UUID userId);
    Optional<UserDeviceToken> findByUserIdAndFcmToken(UUID userId, String fcmToken);
    @org.springframework.transaction.annotation.Transactional
    void deleteByFcmToken(String fcmToken);
}

