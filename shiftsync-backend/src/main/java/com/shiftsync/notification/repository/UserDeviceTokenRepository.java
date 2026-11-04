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

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query(value = "INSERT INTO user_device_tokens(id,user_id,fcm_token,device_type,created_at,updated_at) " +
            "VALUES (:id,:userId,:token,:deviceType,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) " +
            "ON CONFLICT (fcm_token) DO UPDATE SET user_id=EXCLUDED.user_id, device_type=EXCLUDED.device_type, updated_at=CURRENT_TIMESTAMP", nativeQuery = true)
    int registerOwner(@org.springframework.data.repository.query.Param("id") UUID id,
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("token") String token,
            @org.springframework.data.repository.query.Param("deviceType") String deviceType);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM user_device_tokens WHERE user_id=:userId AND fcm_token=:token", nativeQuery = true)
    void deleteByUserIdAndFcmToken(@org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("token") String fcmToken);
}

