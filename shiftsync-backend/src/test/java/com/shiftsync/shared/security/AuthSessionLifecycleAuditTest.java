package com.shiftsync.shared.security;

import com.shiftsync.auth.dto.*;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.auth.service.*;
import com.shiftsync.audit.service.AuditLogService;
import org.junit.jupiter.api.*;
import org.springframework.data.redis.core.*;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.time.Duration;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Real password updates, JWT, refresh/logout and REST filter; persistence/Redis simulated. */
@SuppressWarnings({"unchecked","rawtypes"})
class AuthSessionLifecycleAuditTest {
    final JwtTokenProvider tokens=new JwtTokenProvider("audit-only-signing-secret-012345678901234567890123456789",3600000);
    final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(4);
    final User user=User.builder().id(UUID.randomUUID()).fullName("Audit user").email("session@audit.invalid")
            .systemRole(SystemRole.STAFF).passwordHash(encoder.encode("oldPassword123")).build();
    final UserRepository users=mock(UserRepository.class);
    final RedisTemplate<String,Object> redis=mock(RedisTemplate.class);
    final ValueOperations<String,Object> values=mock(ValueOperations.class);
    final SetOperations<String,Object> sets=mock(SetOperations.class);
    final Map<String,Object> entries=new HashMap<>();
    final Map<String,Set<Object>> indices=new HashMap<>();
    final AuthenticationManager manager=mock(AuthenticationManager.class);
    AuthService auth;

    @BeforeEach void setup() {
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(users.save(any())).thenAnswer(call->call.getArgument(0));
        when(redis.opsForValue()).thenReturn(values);when(redis.opsForSet()).thenReturn(sets);
        doAnswer(call->{entries.put(call.getArgument(0),call.getArgument(1));return null;})
                .when(values).set(anyString(),any(),any(Duration.class));
        when(values.getAndDelete(anyString())).thenAnswer(call->entries.remove(call.getArgument(0)));
        when(redis.hasKey(anyString())).thenAnswer(call->entries.containsKey(call.getArgument(0)));
        when(sets.add(anyString(),any())).thenAnswer(call->{
            indices.computeIfAbsent(call.getArgument(0),key->new HashSet<>()).add(call.getArgument(1));return 1L;});
        when(sets.remove(anyString(),any())).thenAnswer(call->{
            var index=indices.get(call.getArgument(0));return index!=null&&index.remove(call.getArgument(1))?1L:0L;});
        var principal=new CustomUserDetails(user);
        when(manager.authenticate(any())).thenReturn(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        auth=new AuthService(users,encoder,tokens,redis,manager);
    }
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    AuthResponse login() {
        var request=new LoginRequest();request.setEmail(user.getEmail());request.setPassword("oldPassword123");
        return auth.login(request);
    }
    boolean authenticates(String token) throws Exception {
        SecurityContextHolder.clearContext();
        var request=new MockHttpServletRequest("GET","/api/users/me");request.setServletPath("/api/users/me");
        request.addHeader("Authorization","Bearer "+token);
        new JwtAuthFilter(tokens,new CustomUserDetailsService(users),redis)
                .doFilterInternal(request,new MockHttpServletResponse(),mock(jakarta.servlet.FilterChain.class));
        return SecurityContextHolder.getContext().getAuthentication()!=null;
    }

    @Test void changingPasswordLeavesExistingRefreshAndAccessTokensUsable() throws Exception {
        var session=login();
        var update=UserUpdateRequest.builder().fullName(user.getFullName()).email(user.getEmail()).password("newPassword123").build();
        new UserService(users,encoder,mock(AuditLogService.class)).updateUser(user.getId(),update,new CustomUserDetails(user));
        assertTrue(encoder.matches("newPassword123",user.getPasswordHash()));
        assertFalse(encoder.matches("oldPassword123",user.getPasswordHash()));
        assertTrue(authenticates(session.getAccessToken()));
        var refresh=new RefreshRequest();refresh.setRefreshToken(session.getRefreshToken());
        var renewed=auth.refresh(refresh);
        assertTrue(tokens.validateToken(renewed.getAccessToken()));
        assertEquals(user.getEmail(),renewed.getEmail());
        assertTrue(entries.containsKey("refresh_token:"+renewed.getRefreshToken()));
    }

    @Test void sameSecondLoginsCanShareAccessTokenSoLogoutRevokesBothSessions() throws Exception {
        AuthResponse first=null,second=null;
        // Sample bounded consecutive real issuances; JWT NumericDate has second resolution.
        for(int attempt=0;attempt<20;attempt++) {
            var a=login();var b=login();
            if(a.getAccessToken().equals(b.getAccessToken())){first=a;second=b;break;}
        }
        assertNotNull(first,"Expected a same-second issuance pair in 20 consecutive attempts");
        assertNotEquals(first.getRefreshToken(),second.getRefreshToken());
        assertTrue(authenticates(second.getAccessToken()));
        auth.logout(first.getAccessToken(),first.getRefreshToken());
        assertFalse(entries.containsKey("refresh_token:"+first.getRefreshToken()));
        assertTrue(entries.containsKey("refresh_token:"+second.getRefreshToken()));
        assertFalse(authenticates(second.getAccessToken()));
    }
}
