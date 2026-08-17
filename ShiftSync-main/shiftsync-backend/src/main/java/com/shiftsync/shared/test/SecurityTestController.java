package com.shiftsync.shared.test;

import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test/security")
@Profile("dev")
@Hidden
public class SecurityTestController {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SecurityTestController(JwtTokenProvider jwtTokenProvider, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/public")
    public Map<String, String> publicEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "This is a public endpoint. Anyone can access it.");
        return response;
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('STAFF')")
    public Map<String, String> staffEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Success! You have accessed the STAFF-only endpoint.");
        return response;
    }

    @GetMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public Map<String, String> managerEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Success! You have accessed the MANAGER-only endpoint.");
        return response;
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> adminEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Success! You have accessed the ADMIN-only endpoint.");
        return response;
    }

    @GetMapping("/generate-token")
    public Map<String, String> generateToken(
            @RequestParam String email,
            @RequestParam String role) {

        SystemRole systemRole;
        try {
            systemRole = SystemRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role. Must be ADMIN, MANAGER, or STAFF.");
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .fullName("Test " + role)
                    .email(email)
                    .passwordHash(passwordEncoder.encode("password"))
                    .systemRole(systemRole)
                    .build();
            return userRepository.save(newUser);
        });

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getSystemRole().name());

        Map<String, String> response = new HashMap<>();
        response.put("email", email);
        response.put("role", role);
        response.put("token", token);
        response.put("auth_header", "Bearer " + token);
        return response;
    }
}
