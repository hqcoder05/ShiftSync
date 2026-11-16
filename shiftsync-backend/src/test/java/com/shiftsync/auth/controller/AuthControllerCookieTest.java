package com.shiftsync.auth.controller;

import com.shiftsync.auth.dto.AuthResponse;
import com.shiftsync.auth.dto.LoginRequest;
import com.shiftsync.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthControllerCookieTest {
    @Test void webLoginMovesRefreshTokenToHttpOnlyCookie() {
        AuthService service = mock(AuthService.class);
        AuthController controller = new AuthController(service);
        AuthResponse serviceResponse = AuthResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .email("web@shiftsync.local")
                .role("ADMIN")
                .build();
        when(service.login(any())).thenReturn(serviceResponse);

        LoginRequest request = new LoginRequest();
        request.setEmail("web@shiftsync.local");
        request.setPassword("password123!");
        ResponseEntity<AuthResponse> response = controller.login(request, "web");

        assertEquals(200, response.getStatusCode().value());
        assertEquals("access-token", response.getBody().getAccessToken());
        assertNull(response.getBody().getRefreshToken());
        String cookie = response.getHeaders().getFirst("Set-Cookie");
        assertTrue(cookie.contains("shiftsync_refresh=refresh-token"));
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("SameSite=Lax"));
    }
}
