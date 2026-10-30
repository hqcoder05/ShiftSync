package com.shiftsync.config;

import com.shiftsync.shared.security.CustomUserDetailsService;
import com.shiftsync.shared.security.JwtTokenProvider;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.StoreAccessService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final StoreAccessService storeAccessService;

    @Value("${app.websocket.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
    private String[] allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket endpoint (supports /ws and /ws/websocket)
        registry.addEndpoint("/ws", "/ws/websocket")
                .setAllowedOriginPatterns(allowedOrigins);

        // SockJS endpoint for browser fallback
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable simple broker for /topic (broadcast) and /queue (user-specific)
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages destined for @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific queue destinations
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
                        throw new AccessDeniedException("WebSocket authentication is required");
                    }
                    String token = authHeader.substring(7);
                    try {
                        if (!jwtTokenProvider.validateToken(token) || jwtTokenProvider.isQrAttendanceToken(token)
                                || Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token))) {
                            throw new AccessDeniedException("WebSocket token is invalid or expired");
                        }
                        UserDetails userDetails = customUserDetailsService.loadUserById(jwtTokenProvider.getUserIdFromToken(token));
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        accessor.setUser(auth);
                        log.info("WebSocket connection authenticated for user: {}", userDetails.getUsername());
                    } catch (AccessDeniedException e) {
                        throw e;
                    } catch (Exception e) {
                        log.warn("Failed to authenticate WebSocket token: {}", e.getMessage());
                        throw new AccessDeniedException("WebSocket authentication failed");
                    }
                }
                if (accessor != null && StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    authorizeSubscription(accessor);
                }
                if (accessor != null && StompCommand.SEND.equals(accessor.getCommand())) {
                    throw new AccessDeniedException("Client messages are not supported");
                }
                return message;
            }
        });
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof Authentication auth)
                || !(auth.getPrincipal() instanceof CustomUserDetails user)) {
            throw new AccessDeniedException("WebSocket subscription requires authentication");
        }
        String destination = accessor.getDestination();
        if ("/topic/system".equals(destination)
                || ("/topic/notifications/" + user.getId()).equals(destination)) {
            return;
        }
        if (destination != null) {
            String[] parts = destination.split("/", -1);
            if (parts.length == 5 && "topic".equals(parts[1]) && "store".equals(parts[2])
                    && java.util.Set.of("shifts", "attendance", "requests", "marketplace").contains(parts[4])) {
                try {
                    if (storeAccessService.canAccessStore(auth, UUID.fromString(parts[3]))) return;
                } catch (IllegalArgumentException ignored) {
                    // Malformed identifiers are denied below.
                }
            }
        }
        throw new AccessDeniedException("WebSocket destination is not permitted");
    }
}
