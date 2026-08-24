package com.shiftsync.payroll.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test-auth")
public class TestAuthController {

    @GetMapping
    public String testAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "No auth";
        return auth.getName() + " " + auth.getAuthorities().toString();
    }
}
