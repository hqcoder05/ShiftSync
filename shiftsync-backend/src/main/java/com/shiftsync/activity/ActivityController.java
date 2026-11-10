package com.shiftsync.activity;

import com.shiftsync.shared.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/users/me/activity")
public class ActivityController {
    private final ActivityService service;
    @GetMapping @PreAuthorize("isAuthenticated()")
    public ActivityPage mine(@AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) UUID storeId, @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String before) {
        return service.mine(user.getId(), storeId, limit, before);
    }
}
