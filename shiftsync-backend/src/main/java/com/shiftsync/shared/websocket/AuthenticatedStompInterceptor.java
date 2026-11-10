package com.shiftsync.shared.websocket;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.CustomUserDetailsService;
import com.shiftsync.shared.security.JwtTokenProvider;
import com.shiftsync.shared.security.StoreAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/** Authenticate the socket and authorize each subscription, independently of the browser UI. */
@Component
@RequiredArgsConstructor
public class AuthenticatedStompInterceptor implements ChannelInterceptor {
    private final JwtTokenProvider tokens;
    private final CustomUserDetailsService users;
    private final StoreAccessService stores;
    private static final Set<String> DOMAINS = Set.of("shifts", "attendance", "requests", "marketplace");

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor headers = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (headers == null || headers.getCommand() == null) return message;
        if (headers.getCommand() == StompCommand.CONNECT) {
            String bearer = headers.getFirstNativeHeader("Authorization");
            if (bearer == null || !bearer.startsWith("Bearer ")) throw denied();
            String token = bearer.substring(7);
            if (!tokens.validateToken(token)) throw denied();
            var user = users.loadUserByUsername(tokens.getEmailFromToken(token));
            if (!user.isEnabled() || !user.isAccountNonLocked()) throw denied();
            headers.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        } else if (headers.getCommand() == StompCommand.SUBSCRIBE) {
            if (!(headers.getUser() instanceof Authentication auth)
                    || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof CustomUserDetails user)) throw denied();
            String destination = headers.getDestination();
            if (("/topic/notifications/" + user.getId()).equals(destination)) return message;
            // System events contain no store data. Global data topics are reserved for administrators.
            if ("/topic/system".equals(destination)) return message;
            if (destination != null && destination.startsWith("/topic/store/")) {
                String[] parts = destination.split("/");
                try {
                    if (parts.length == 5 && DOMAINS.contains(parts[4])
                            && stores.canAccessStore(auth, UUID.fromString(parts[3]))) return message;
                } catch (IllegalArgumentException ignored) { }
            }
            if (destination != null && destination.startsWith("/topic/")
                    && DOMAINS.contains(destination.substring(7))
                    && user.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) return message;
            throw denied();
        } else if (headers.getCommand() == StompCommand.SEND) {
            // No client-published application endpoints exist; clients must use the authorized REST APIs.
            throw denied();
        }
        return message;
    }

    private AccessDeniedException denied() {
        return new AccessDeniedException("WebSocket destination is not authorized");
    }
}
