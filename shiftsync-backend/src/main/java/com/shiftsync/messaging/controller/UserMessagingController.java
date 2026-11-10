package com.shiftsync.messaging.controller;

import com.shiftsync.messaging.dto.MessagingDTOs.ReadReceipt;
import com.shiftsync.messaging.service.MessagingService;
import com.shiftsync.shared.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserMessagingController {
    private final MessagingService service;

    @GetMapping("/api/users/me/messaging/unread-count")
    public ReadReceipt unreadCount(@AuthenticationPrincipal CustomUserDetails user) {
        return service.unreadCount(user.getId());
    }
}
