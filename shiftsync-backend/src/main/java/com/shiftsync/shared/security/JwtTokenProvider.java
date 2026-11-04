package com.shiftsync.shared.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long jwtExpirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String jwtSecret,
            @Value("${app.jwt.expiration-ms:86400000}") long jwtExpirationMs) {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.jwtExpirationMs = jwtExpirationMs;
    }

    public String generateToken(UUID userId, String email, String role) {
        return generateToken(userId, email, role, 0);
    }

    public String generateToken(UUID userId, String email, String role, long credentialVersion) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(email)
                .id(UUID.randomUUID().toString())
                .claim("uid", userId.toString())
                .claim("role", role)
                .claim("credentialVersion", credentialVersion)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public long getCredentialVersion(String token) {
        Number value = extractAllClaims(token).get("credentialVersion", Number.class);
        if (value == null) throw new JwtException("Token has no credential version");
        return value.longValue();
    }

    public UUID getUserIdFromToken(String token) {
        String id = extractAllClaims(token).get("uid", String.class);
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new JwtException("Token has no valid account identity", e);
        }
    }

    public String getEmailFromToken(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public Date getExpirationFromToken(String token) {
        return extractAllClaims(token).getExpiration();
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String generateQrToken(String shiftId, long customExpirationMs) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + customExpirationMs);

        return Jwts.builder()
                .subject(shiftId)
                .claim("type", "qr_attendance")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getShiftIdFromQrToken(String token) {
        Claims claims = extractAllClaims(token);
        if (!"qr_attendance".equals(claims.get("type", String.class))) {
            throw new JwtException("Invalid token type");
        }
        return claims.getSubject();
    }

    public boolean isQrAttendanceToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return "qr_attendance".equals(claims.get("type", String.class));
        } catch (Exception e) {
            return false;
        }
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
