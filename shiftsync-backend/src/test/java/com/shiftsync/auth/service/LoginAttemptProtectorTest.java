package com.shiftsync.auth.service;

import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoginAttemptProtectorTest {
    @Mock private RedisTemplate<String, Object> redis;
    @Mock private ValueOperations<String, Object> values;
    private LoginAttemptProtector protector;

    @BeforeEach
    void setUp() {
        protector = new LoginAttemptProtector(redis, 5, Duration.ofMinutes(15), Duration.ofMinutes(15));
    }

    @Test
    void rejectsAnAlreadyLockedIdentityWith429() {
        when(redis.hasKey(anyString())).thenReturn(true);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> protector.ensureAllowed("staff@example.invalid"));

        assertEquals(429, exception.getStatus().value());
    }

    @Test
    void fifthFailureCreatesLockAndDeletesCounter() {
        when(values.increment(anyString())).thenReturn(5L);
        when(redis.opsForValue()).thenReturn(values);

        protector.recordFailure("staff@example.invalid");

        verify(values).set(anyString(), eq("locked"), eq(Duration.ofMinutes(15)));
        verify(redis).delete(anyString());
    }

    @Test
    void firstFailureGetsAFixedExpiry() {
        when(values.increment(anyString())).thenReturn(1L);
        when(redis.opsForValue()).thenReturn(values);

        protector.recordFailure("staff@example.invalid");

        verify(redis).expire(anyString(), eq(Duration.ofMinutes(15)));
    }
}
