package com.shiftsync.messaging.controller;

import com.shiftsync.messaging.dto.MessagingDTOs.*;
import com.shiftsync.messaging.service.MessagingService;
import com.shiftsync.shared.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/messaging")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class MessagingController {
    private final MessagingService service;

    @GetMapping("/contacts")
    public List<ContactDTO> contacts(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user) {
        return service.contacts(storeId, user.getId());
    }

    @GetMapping("/threads")
    public List<ThreadDTO> threads(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user) {
        return service.threads(storeId, user.getId());
    }

    @PostMapping("/threads")
    public ThreadDTO startThread(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user,
                                 @Valid @RequestBody StartThreadRequest request) {
        return service.startThread(storeId, user.getId(), request.recipientId());
    }

    @GetMapping("/threads/{threadId}/messages")
    public MessagePage messages(@PathVariable UUID storeId, @PathVariable UUID threadId,
                                @AuthenticationPrincipal CustomUserDetails user,
                                @RequestParam(required = false) UUID before,
                                @RequestParam(defaultValue = "50") int limit) {
        return service.messages(storeId, user.getId(), threadId, before, limit);
    }

    @PostMapping("/threads/{threadId}/messages")
    public MessageDTO send(@PathVariable UUID storeId, @PathVariable UUID threadId,
                           @AuthenticationPrincipal CustomUserDetails user,
                           @Valid @RequestBody SendMessageRequest request) {
        return service.send(storeId, user.getId(), threadId, request);
    }

    @PostMapping("/threads/{threadId}/read")
    public ReadReceipt markRead(@PathVariable UUID storeId, @PathVariable UUID threadId,
                                @AuthenticationPrincipal CustomUserDetails user,
                                @RequestBody(required = false) MarkReadRequest request) {
        return service.markRead(storeId, user.getId(), threadId, request == null ? null : request.lastReadMessageId());
    }

    @GetMapping("/announcements")
    public List<AnnouncementDTO> announcements(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user) {
        return service.announcements(storeId, user.getId());
    }

    @PostMapping("/announcements")
    public AnnouncementDTO publish(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user,
                                    @Valid @RequestBody CreateAnnouncementRequest request) {
        return service.publish(storeId, user.getId(), request);
    }
}
