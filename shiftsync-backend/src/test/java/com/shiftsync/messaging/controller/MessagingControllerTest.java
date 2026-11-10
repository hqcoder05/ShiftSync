package com.shiftsync.messaging.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.messaging.dto.MessagingDTOs.*;
import com.shiftsync.messaging.service.MessagingService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.exception.GlobalExceptionHandler;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.SystemRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class MessagingControllerTest {
    @Mock MessagingService service;
    MockMvc mvc;
    final UUID storeId = UUID.randomUUID(), userId = UUID.randomUUID(), recipientId = UUID.randomUUID();
    final UUID threadId = UUID.randomUUID(), messageId = UUID.randomUUID(), clientId = UUID.randomUUID();
    final String base = "/api/stores/" + storeId + "/messaging";

    @BeforeEach void setup() {
        CustomUserDetails principal = new CustomUserDetails(User.builder().id(userId).systemRole(SystemRole.STAFF).build());
        mvc = MockMvcBuilders.standaloneSetup(new MessagingController(service), new UserMessagingController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter p) { return p.getParameterType() == CustomUserDetails.class; }
                    public Object resolveArgument(MethodParameter p, ModelAndViewContainer m, NativeWebRequest r, WebDataBinderFactory b) { return principal; }
                }).build();
    }

    @Test void contactsAndAggregateCountBindAuthenticatedUserRatherThanRequestQuery() throws Exception {
        when(service.contacts(storeId, userId)).thenReturn(List.of(new ContactDTO(recipientId, "Manager", "avatar-1", "MANAGER")));
        when(service.unreadCount(userId)).thenReturn(new ReadReceipt(3));
        mvc.perform(get(base + "/contacts").param("userId", recipientId.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(recipientId.toString()));
        mvc.perform(get("/api/users/me/messaging/unread-count").param("userId", recipientId.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(3));
        verify(service).contacts(storeId, userId); verify(service).unreadCount(userId);
    }

    @Test void startThreadAcceptsRecipientAndReturnsParticipantShape() throws Exception {
        when(service.startThread(storeId, userId, recipientId)).thenReturn(new ThreadDTO(threadId, storeId,
                new ContactDTO(recipientId, "Manager", "avatar-1", "MANAGER"), null, null, 0));
        mvc.perform(post(base + "/threads").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":\"" + recipientId + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(threadId.toString()))
                .andExpect(jsonPath("$.participant.role").value("MANAGER"));
        verify(service).startThread(storeId, userId, recipientId);
    }

    @Test void historyBindsUuidCursorAndLimitAndReturnsSequence() throws Exception {
        MessageDTO message = new MessageDTO(messageId, threadId, userId, "Staff", "avatar-2", "Hello",
                OffsetDateTime.parse("2026-10-22T10:00:00Z"), clientId, 17);
        when(service.messages(storeId, userId, threadId, messageId, 20)).thenReturn(new MessagePage(List.of(message), messageId, true));
        when(service.messages(storeId, userId, threadId, null, 50)).thenReturn(new MessagePage(List.of(), null, false));
        mvc.perform(get(base + "/threads/" + threadId + "/messages").param("before", messageId.toString()).param("limit", "20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.messages[0].sequence").value(17))
                .andExpect(jsonPath("$.nextBefore").value(messageId.toString())).andExpect(jsonPath("$.hasMore").value(true));
        mvc.perform(get(base + "/threads/" + threadId + "/messages")).andExpect(status().isOk());
        verify(service).messages(storeId, userId, threadId, null, 50);
    }

    @Test void sendingBindsAuthenticatedSenderAndIdempotencyKey() throws Exception {
        SendMessageRequest request = new SendMessageRequest("Hello", clientId);
        when(service.send(storeId, userId, threadId, request)).thenReturn(new MessageDTO(messageId, threadId, userId,
                "Staff", null, "Hello", OffsetDateTime.now(), clientId, 1));
        mvc.perform(post(base + "/threads/" + threadId + "/messages").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hello\",\"clientMessageId\":\"" + clientId + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.senderId").value(userId.toString()))
                .andExpect(jsonPath("$.clientMessageId").value(clientId.toString()));
        verify(service).send(storeId, userId, threadId, request);
    }

    @Test void readSupportsFetchedMessageCursorAndLegacyEmptyBody() throws Exception {
        when(service.markRead(storeId, userId, threadId, messageId)).thenReturn(new ReadReceipt(1));
        when(service.markRead(storeId, userId, threadId, null)).thenReturn(new ReadReceipt(0));
        mvc.perform(post(base + "/threads/" + threadId + "/read").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lastReadMessageId\":\"" + messageId + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(1));
        mvc.perform(post(base + "/threads/" + threadId + "/read"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test void invalidMessagePayloadsAreRejectedBeforeService() throws Exception {
        String path = base + "/threads/" + threadId + "/messages";
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"   \",\"clientMessageId\":\"" + clientId + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Hello\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"" + "x".repeat(4001) + "\",\"clientMessageId\":\"" + clientId + "\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test void invalidThreadAndAnnouncementPayloadsFailValidation() throws Exception {
        mvc.perform(post(base + "/threads").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base + "/announcements").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\" \",\"content\":\"Hello\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base + "/announcements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + "x".repeat(161) + "\",\"content\":\"Hello\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base + "/announcements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Title\",\"content\":\"" + "x".repeat(10001) + "\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test void publishAcceptsLongBodyAndBindsAuthorFromPrincipal() throws Exception {
        String body = "x".repeat(10000);
        when(service.publish(storeId, userId, new CreateAnnouncementRequest("Title", body)))
                .thenReturn(new AnnouncementDTO(messageId, storeId, "Title", body, userId, "Manager", null, OffsetDateTime.now()));
        mvc.perform(post(base + "/announcements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Title\",\"content\":\"" + body + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.authorId").value(userId.toString()));
    }

    @Test void authorizationFailurePreservesForbiddenStatusThroughGlobalAdvice() throws Exception {
        when(service.contacts(storeId, userId)).thenThrow(new BusinessException("Active employment required", HttpStatus.FORBIDDEN));
        mvc.perform(get(base + "/contacts")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test void invalidUuidCursorAndPathDoNotReachService() throws Exception {
        mvc.perform(get(base + "/threads/" + threadId + "/messages").param("before", "invalid"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/stores/invalid/messaging/contacts")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
