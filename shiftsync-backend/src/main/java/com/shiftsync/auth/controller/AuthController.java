package com.shiftsync.auth.controller;

import com.shiftsync.auth.dto.AuthResponse;
import com.shiftsync.auth.dto.LoginRequest;
import com.shiftsync.auth.dto.RefreshRequest;
import com.shiftsync.auth.dto.RegisterRequest;
import com.shiftsync.auth.dto.UserDTO;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.mapper.UserMapper;
import com.shiftsync.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user registration, login, and token refresh")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user profile", description = "Creates a new user profile with encoded password and default role.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "User successfully registered"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
        @ApiResponse(responseCode = "409", description = "Email already exists in the system")
    })
    public ResponseEntity<UserDTO> register(@Valid @RequestBody RegisterRequest request) {
        User registeredUser = authService.register(request);
        UserDTO userDTO = UserMapper.toDTO(registeredUser);
        return new ResponseEntity<>(userDTO, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticates credentials and issues a JWT Access Token and an Opaque Refresh Token stored in Redis.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully authenticated"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload"),
        @ApiResponse(responseCode = "401", description = "Invalid email or password")
    })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh security token", description = "Revokes the old Refresh Token (Token Rotation) and issues a new pair of Access & Refresh Tokens.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token successfully refreshed"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload"),
        @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
    })
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Blacklists the current access token and deletes the refresh token from Redis.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Successfully logged out"),
        @ApiResponse(responseCode = "400", description = "Invalid request payload")
    })
    public ResponseEntity<Void> logout(
            @jakarta.validation.Valid @RequestBody com.shiftsync.auth.dto.LogoutRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        
        String authHeader = httpRequest.getHeader("Authorization");
        String accessToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }
        
        authService.logout(accessToken, request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }
}
