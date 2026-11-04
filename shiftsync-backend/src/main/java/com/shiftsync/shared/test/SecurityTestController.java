package com.shiftsync.shared.test;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test/security")
@Profile("dev")
@Hidden
public class SecurityTestController {

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

}
