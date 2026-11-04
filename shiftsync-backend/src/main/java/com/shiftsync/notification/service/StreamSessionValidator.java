package com.shiftsync.notification.service;

import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.security.JwtTokenProvider;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StreamSessionValidator {
    private final JwtTokenProvider tokens;
    private final UserRepository users;
    private final RedisTemplate<String, Object> redis;

    public boolean isActive(UUID userId, String token) {
        try {
            if (token == null || !tokens.validateToken(token) || tokens.isQrAttendanceToken(token)
                    || !userId.equals(tokens.getUserIdFromToken(token))
                    || Boolean.TRUE.equals(redis.hasKey("blacklist:" + token))) return false;
            return users.findById(userId)
                    .filter(user -> user.getCredentialVersion() == tokens.getCredentialVersion(token)).isPresent();
        } catch (RuntimeException unavailableOrInvalid) {
            return false;
        }
    }
}
