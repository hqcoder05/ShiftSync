package com.shiftsync.auth.service;

import com.shiftsync.shared.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;

/**
 * Limits repeated password guesses without putting an email address in a Redis key.
 * The limiter is intentionally fail-open when Redis is unavailable: authentication
 * must remain available during a transient cache outage, and the incident is logged.
 */
@Service
public class LoginAttemptProtector {
    private static final Logger log = LoggerFactory.getLogger(LoginAttemptProtector.class);
    private static final String ATTEMPT_PREFIX = "login_attempts:";
    private static final String LOCK_PREFIX = "login_locked:";

    private final RedisTemplate<String, Object> redisTemplate;
    private final int maxFailures;
    private final Duration failureWindow;
    private final Duration lockDuration;
    private final boolean enabled;

    @org.springframework.beans.factory.annotation.Autowired
    public LoginAttemptProtector(
            RedisTemplate<String, Object> redisTemplate,
            @Value("${app.security.login-rate-limit.max-failures:5}") int maxFailures,
            @Value("${app.security.login-rate-limit.failure-window:PT15M}") Duration failureWindow,
            @Value("${app.security.login-rate-limit.lock-duration:PT15M}") Duration lockDuration) {
        this(redisTemplate, maxFailures, failureWindow, lockDuration, true);
    }

    private LoginAttemptProtector(RedisTemplate<String, Object> redisTemplate, int maxFailures,
                                  Duration failureWindow, Duration lockDuration, boolean enabled) {
        this.redisTemplate = redisTemplate;
        this.maxFailures = Math.max(1, maxFailures);
        this.failureWindow = failureWindow.isNegative() || failureWindow.isZero() ? Duration.ofMinutes(15) : failureWindow;
        this.lockDuration = lockDuration.isNegative() || lockDuration.isZero() ? Duration.ofMinutes(15) : lockDuration;
        this.enabled = enabled;
    }

    static LoginAttemptProtector disabled() {
        return new LoginAttemptProtector(null, 1, Duration.ofMinutes(1), Duration.ofMinutes(1), false);
    }

    public void ensureAllowed(String email) {
        if (!enabled) return;
        try {
            if (Boolean.TRUE.equals(redisTemplate.hasKey(lockKey(email)))) {
                throw new BusinessException("Qua nhieu lan dang nhap khong thanh cong. Vui long thu lai sau it phut.", HttpStatus.TOO_MANY_REQUESTS);
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Khong the kiem tra gioi han dang nhap: {}", exception.getClass().getSimpleName());
        }
    }

    public void recordFailure(String email) {
        if (!enabled) return;
        try {
            String attemptsKey = attemptsKey(email);
            Long attempts = redisTemplate.opsForValue().increment(attemptsKey);
            if (attempts != null && attempts == 1) redisTemplate.expire(attemptsKey, failureWindow);
            if (attempts != null && attempts >= maxFailures) {
                redisTemplate.opsForValue().set(lockKey(email), "locked", lockDuration);
                redisTemplate.delete(attemptsKey);
            }
        } catch (Exception exception) {
            log.warn("Khong the cap nhat gioi han dang nhap: {}", exception.getClass().getSimpleName());
        }
    }

    public void clearFailures(String email) {
        if (!enabled) return;
        try {
            redisTemplate.delete(attemptsKey(email));
        } catch (Exception exception) {
            log.warn("Khong the xoa dem dang nhap that bai: {}", exception.getClass().getSimpleName());
        }
    }

    private String attemptsKey(String email) {
        return ATTEMPT_PREFIX + fingerprint(email);
    }

    private String lockKey(String email) {
        return LOCK_PREFIX + fingerprint(email);
    }

    private String fingerprint(String email) {
        try {
            byte[] input = (email == null ? "" : email.trim().toLowerCase()).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 khong kha dung", exception);
        }
    }
}
