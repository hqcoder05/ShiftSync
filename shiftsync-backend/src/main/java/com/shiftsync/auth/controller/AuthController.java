package com.shiftsync.auth.controller;

import com.shiftsync.auth.dto.AuthResponse;
import com.shiftsync.auth.dto.LoginRequest;
import com.shiftsync.auth.dto.RefreshRequest;
import com.shiftsync.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user registration, login, and token refresh")
public class AuthController {

    private static final String WEB_CLIENT_HEADER = "X-ShiftSync-Client";
    private static final String WEB_CLIENT_VALUE = "web";
    private static final String REFRESH_COOKIE = "shiftsync_refresh";

    private final AuthService authService;

    @Value("${auth.refresh-cookie.secure:false}")
    private boolean refreshCookieSecure;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticates credentials and issues a JWT Access Token and an Opaque Refresh Token stored in Redis.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully authenticated"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload"),
        @ApiResponse(responseCode = "401", description = "Email hoac mat khau khong dung")
    })
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            @org.springframework.web.bind.annotation.RequestHeader(value = WEB_CLIENT_HEADER, required = false) String client) {
        AuthResponse response = authService.login(request);
        return webClientResponse(response, client);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh security token", description = "Revokes the old Refresh Token (Token Rotation) and issues a new pair of Access & Refresh Tokens.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token successfully refreshed"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload"),
        @ApiResponse(responseCode = "401", description = "Phien dang nhap da het han hoac khong hop le")
    })
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshRequest request,
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshCookie,
            @org.springframework.web.bind.annotation.RequestHeader(value = WEB_CLIENT_HEADER, required = false) String client) {
        String refreshToken = isWebClient(client) ? refreshCookie : request == null ? null : request.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new com.shiftsync.shared.exception.BusinessException("Phien dang nhap da het han hoac khong hop le", org.springframework.http.HttpStatus.UNAUTHORIZED);
        }
        RefreshRequest refreshRequest = new RefreshRequest();
        refreshRequest.setRefreshToken(refreshToken);
        return webClientResponse(authService.refresh(refreshRequest), client);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Blacklists the current access token and deletes the refresh token from Redis.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Successfully logged out"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload")
    })
    public ResponseEntity<Void> logout(
            @RequestBody(required = false) com.shiftsync.auth.dto.LogoutRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest,
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshCookie,
            @org.springframework.web.bind.annotation.RequestHeader(value = WEB_CLIENT_HEADER, required = false) String client) {
        
        String authHeader = httpRequest.getHeader("Authorization");
        String accessToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }
        
        String refreshToken = isWebClient(client) ? refreshCookie : request == null ? null : request.getRefreshToken();
        authService.logout(accessToken, refreshToken);
        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent();
        if (isWebClient(client)) response.header("Set-Cookie", refreshCookie(null, 0).toString());
        return response.build();
    }

    private ResponseEntity<AuthResponse> webClientResponse(AuthResponse response, String client) {
        if (!isWebClient(client)) return ResponseEntity.ok(response);
        String refreshToken = response.getRefreshToken();
        response.setRefreshToken(null);
        return ResponseEntity.ok()
                .header("Set-Cookie", refreshCookie(refreshToken, java.time.Duration.ofDays(7).toSeconds()).toString())
                .body(response);
    }

    private boolean isWebClient(String client) {
        return WEB_CLIENT_VALUE.equalsIgnoreCase(client);
    }

    private ResponseCookie refreshCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(REFRESH_COOKIE, value == null ? "" : value)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(maxAgeSeconds)
                .build();
    }
}
