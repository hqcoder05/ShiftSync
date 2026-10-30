package com.shiftsync.notification;

import com.shiftsync.config.WebSocketConfig;
import com.shiftsync.shared.security.*;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Checks destination authorization in the actual interceptor. */
class WebSocketAuditTest {
    private ChannelInterceptor interceptor() {
        return interceptor(mock(StoreAccessService.class));
    }
    private ChannelInterceptor interceptor(StoreAccessService storeAccess) {
        var registration=new ChannelRegistration();
        new WebSocketConfig(mock(JwtTokenProvider.class),mock(CustomUserDetailsService.class),mock(org.springframework.data.redis.core.RedisTemplate.class),storeAccess)
                .configureClientInboundChannel(registration);
        var interceptors=(List<?>)ReflectionTestUtils.getField(registration,"interceptors");
        return (ChannelInterceptor)interceptors.get(0);
    }

    @Test void authenticatedUserCannotSubscribeToUnrelatedUserNotifications() {
        var headers=StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        var user=com.shiftsync.auth.entity.User.builder().id(UUID.randomUUID()).email("user@test.invalid").systemRole(SystemRole.STAFF).build();
        headers.setUser(new UsernamePasswordAuthenticationToken(new CustomUserDetails(user),null,List.of()));
        headers.setDestination("/topic/notifications/"+UUID.randomUUID());
        headers.setLeaveMutable(true);
        var message=MessageBuilder.createMessage(new byte[0],headers.getMessageHeaders());
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> interceptor().preSend(message,mock(MessageChannel.class)));
    }

    @Test void userCanSubscribeToOwnNotificationsAndOnlyAccessibleStores() {
        var user=com.shiftsync.auth.entity.User.builder().id(UUID.randomUUID()).email("user@test.invalid").systemRole(SystemRole.STAFF).build();
        var auth=new UsernamePasswordAuthenticationToken(new CustomUserDetails(user),null,List.of());
        var store=UUID.randomUUID(); var foreign=UUID.randomUUID();
        var access=mock(StoreAccessService.class);
        when(access.canAccessStore(auth,store)).thenReturn(true);
        var channel=interceptor(access);
        for (String destination : List.of("/topic/notifications/"+user.getId(), "/topic/store/"+store+"/shifts", "/topic/system")) {
            var headers=StompHeaderAccessor.create(StompCommand.SUBSCRIBE);headers.setUser(auth);headers.setDestination(destination);headers.setLeaveMutable(true);
            var message=MessageBuilder.createMessage(new byte[0],headers.getMessageHeaders());
            assertSame(message,channel.preSend(message,mock(MessageChannel.class)));
        }
        for (String destination : List.of("/topic/store/"+foreign+"/shifts", "/topic/notifications", "/topic/shifts", "/topic/store/invalid/shifts")) {
            var headers=StompHeaderAccessor.create(StompCommand.SUBSCRIBE);headers.setUser(auth);headers.setDestination(destination);headers.setLeaveMutable(true);
            var message=MessageBuilder.createMessage(new byte[0],headers.getMessageHeaders());
            assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> channel.preSend(message,mock(MessageChannel.class)));
        }
    }

    @Test void unauthenticatedSendToBrokerTopicIsRejectedByInterceptor() {
        var headers=StompHeaderAccessor.create(StompCommand.SEND);
        headers.setDestination("/topic/notifications");
        headers.setLeaveMutable(true);
        var message=MessageBuilder.createMessage("forged event",headers.getMessageHeaders());
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> interceptor().preSend(message,mock(MessageChannel.class)));
    }
}
