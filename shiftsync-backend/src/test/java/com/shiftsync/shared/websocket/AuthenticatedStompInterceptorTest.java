package com.shiftsync.shared.websocket;

import com.shiftsync.auth.entity.User;
import com.shiftsync.shared.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthenticatedStompInterceptorTest {
    JwtTokenProvider tokens = mock(JwtTokenProvider.class);
    CustomUserDetailsService users = mock(CustomUserDetailsService.class);
    StoreAccessService stores = mock(StoreAccessService.class);
    AuthenticatedStompInterceptor interceptor = new AuthenticatedStompInterceptor(tokens, users, stores);
    UUID id = UUID.randomUUID();
    CustomUserDetails user = new CustomUserDetails(User.builder().id(id).email("qa@example.invalid").systemRole(SystemRole.STAFF).build());
    Message<byte[]> frame(StompCommand command, String destination, boolean authenticated) {
        var h = StompHeaderAccessor.create(command);
        if (destination != null) h.setDestination(destination);
        if (authenticated) h.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        h.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], h.getMessageHeaders());
    }
    @Test void missingOrInvalidTokenCannotConnect() {
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.CONNECT, null, false), null));
        var h = StompHeaderAccessor.create(StompCommand.CONNECT);
        h.setNativeHeader("Authorization", "Bearer invalid"); h.setLeaveMutable(true);
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(MessageBuilder.createMessage(new byte[0], h.getMessageHeaders()), null));
    }
    @Test void onlyOwnNotificationsAreVisible() {
        assertNotNull(interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/notifications/"+id, true), null));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/notifications/"+UUID.randomUUID(), true), null));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/notifications", true), null));
    }
    @Test void storeMembershipCheckedAndGlobalStoreEventsBlockedForStaff() {
        UUID store = UUID.randomUUID();
        when(stores.canAccessStore(any(), eq(store))).thenReturn(true);
        assertNotNull(interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/store/"+store+"/shifts", true), null));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/store/"+UUID.randomUUID()+"/shifts", true), null));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/shifts", true), null));
    }
    @Test void anonymousSubscribersAndClientPublishersRejected() {
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/system", false), null));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.SEND, "/topic/system", true), null));
    }
}
