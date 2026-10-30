package com.shiftsync.shared.security;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.auth.service.AuthService;
import com.shiftsync.auth.dto.RefreshRequest;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.data.redis.core.*;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Signed JWT + real filter/user lookup/refresh logic; repository and Redis are mocked. */
class TokenIdentityAuditTest {
    final JwtTokenProvider tokens=new JwtTokenProvider("audit-only-signing-secret-012345678901234567890123456789",3600000);
    @BeforeEach @AfterEach void clear(){SecurityContextHolder.clearContext();}

    @Test void oldStaffAccessTokenCannotAuthenticateAsNewAdminOwnerOfEmail() throws Exception {
        UUID oldId=UUID.randomUUID();
        String oldToken=tokens.generateToken(oldId,"reused@audit.invalid","STAFF");
        var replacement=User.builder().id(UUID.randomUUID()).email("reused@audit.invalid").systemRole(SystemRole.ADMIN).build();
        var users=mock(UserRepository.class);
        when(users.findById(oldId)).thenReturn(Optional.empty());
        var filter=new JwtAuthFilter(tokens,new CustomUserDetailsService(users),mock(RedisTemplate.class));
        var request=new MockHttpServletRequest("GET","/api/users");request.addHeader("Authorization","Bearer "+oldToken);
        filter.doFilterInternal(request,new MockHttpServletResponse(),mock(jakarta.servlet.FilterChain.class));
        var auth=SecurityContextHolder.getContext().getAuthentication();
        assertNull(auth);
        assertEquals("STAFF",tokens.getRoleFromToken(oldToken));
    }

    @Test void oldRefreshTokenCannotMintAdminTokenAfterEmailReassignment() {
        var users=mock(UserRepository.class);var redis=mock(RedisTemplate.class);
        var values=mock(ValueOperations.class);var sets=mock(SetOperations.class);
        when(redis.opsForValue()).thenReturn(values);when(redis.opsForSet()).thenReturn(sets);
        when(values.getAndDelete("refresh_token:old-staff-session")).thenReturn("reused@audit.invalid");
        var replacement=User.builder().id(UUID.randomUUID()).email("reused@audit.invalid").systemRole(SystemRole.ADMIN).build();
        var service=new AuthService(users,new BCryptPasswordEncoder(),tokens,redis,mock(AuthenticationManager.class));
        var input=new RefreshRequest();input.setRefreshToken("old-staff-session");
        assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> service.refresh(input));
    }

    @Test void loggedOutTokenRejectedByRestStillAuthenticatesWebSocket() throws Exception {
        var user=User.builder().id(UUID.randomUUID()).email("logout@audit.invalid").systemRole(SystemRole.STAFF).build();
        String token=tokens.generateToken(user.getId(),user.getEmail(),"STAFF");
        var users=mock(UserRepository.class);when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        var redis=mock(RedisTemplate.class);var values=mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        new AuthService(users,new BCryptPasswordEncoder(),tokens,redis,mock(AuthenticationManager.class)).logout(token,null);
        verify(values).set(eq("blacklist:"+token),eq("logout"),any(java.time.Duration.class));
        when(redis.hasKey("blacklist:"+token)).thenReturn(true);
        var details=new CustomUserDetailsService(users);
        var request=new MockHttpServletRequest("GET","/api/users");request.addHeader("Authorization","Bearer "+token);
        new JwtAuthFilter(tokens,details,redis).doFilterInternal(request,new MockHttpServletResponse(),mock(jakarta.servlet.FilterChain.class));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        var registration=new org.springframework.messaging.simp.config.ChannelRegistration();
        new com.shiftsync.config.WebSocketConfig(tokens,details,redis,mock(StoreAccessService.class)).configureClientInboundChannel(registration);
        var interceptor=(org.springframework.messaging.support.ChannelInterceptor)((List<?>)org.springframework.test.util.ReflectionTestUtils.getField(registration,"interceptors")).get(0);
        var headers=org.springframework.messaging.simp.stomp.StompHeaderAccessor.create(org.springframework.messaging.simp.stomp.StompCommand.CONNECT);
        headers.addNativeHeader("Authorization","Bearer "+token);headers.setLeaveMutable(true);
        var message=org.springframework.messaging.support.MessageBuilder.createMessage(new byte[0],headers.getMessageHeaders());
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> interceptor.preSend(message,mock(org.springframework.messaging.MessageChannel.class)));
        assertNull(headers.getUser());
    }
}
