package com.shiftsync.auth.service;

import com.shiftsync.auth.dto.AuthResponse;
import com.shiftsync.auth.dto.LoginRequest;
import com.shiftsync.auth.dto.RefreshRequest;
import com.shiftsync.auth.dto.RegisterRequest;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.JwtTokenProvider;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTemplate<String, Object> redisTemplate;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            RedisTemplate<String, Object> redisTemplate,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.redisTemplate = redisTemplate;
        this.authenticationManager = authenticationManager;
    }

    public User register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Email already exists", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                .build();

        return userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            User user = userDetails.getUser();

            String accessToken = jwtTokenProvider.generateToken(user.getEmail(), user.getSystemRole().name());
            String refreshToken = UUID.randomUUID().toString();

            // Store refresh token in Redis with a TTL of 7 days
            redisTemplate.opsForValue().set("refresh_token:" + refreshToken, user.getEmail(), java.time.Duration.ofDays(7));

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .email(user.getEmail())
                    .role(user.getSystemRole().name())
                    .build();
        } catch (AuthenticationException e) {
            throw new BusinessException("Invalid email or password", HttpStatus.UNAUTHORIZED);
        }
    }

    public AuthResponse refresh(RefreshRequest request) {
        String refreshTokenKey = "refresh_token:" + request.getRefreshToken();
        Object emailObj = redisTemplate.opsForValue().get(refreshTokenKey);

        if (emailObj == null) {
            throw new BusinessException("Invalid or expired refresh token", HttpStatus.UNAUTHORIZED);
        }

        String email = emailObj.toString();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User associated with token not found", HttpStatus.UNAUTHORIZED));

        // Revoke the old refresh token (Token Rotation)
        redisTemplate.delete(refreshTokenKey);

        // Generate new token pair
        String newAccessToken = jwtTokenProvider.generateToken(user.getEmail(), user.getSystemRole().name());
        String newRefreshToken = UUID.randomUUID().toString();

        // Store new refresh token in Redis
        redisTemplate.opsForValue().set("refresh_token:" + newRefreshToken, user.getEmail(), java.time.Duration.ofDays(7));

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .email(user.getEmail())
                .role(user.getSystemRole().name())
                .build();
    }

    public void logout(String accessToken, String refreshToken) {
        try {
            java.util.Date expiration = jwtTokenProvider.getExpirationFromToken(accessToken);
            long ttl = expiration.getTime() - System.currentTimeMillis();
            
            if (ttl > 0) {
                redisTemplate.opsForValue().set("blacklist:" + accessToken, "logout", java.time.Duration.ofMillis(ttl));
            }
        } catch (Exception e) {
            // Token might be already expired or invalid, still proceed to delete refresh token
        }

        if (refreshToken != null) {
            redisTemplate.delete("refresh_token:" + refreshToken);
        }
    }
}
