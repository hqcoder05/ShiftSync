package com.shiftsync.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.IOException;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private CustomUserDetailsService customUserDetailsService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthFilter jwtAuthFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }


    @Test
    @DisplayName("Header Authorization van hoat dong tren moi endpoint")
    void testHeaderAuthWorksEverywhere() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/shifts");
        request.addHeader("Authorization", "Bearer valid-header-jwt");
        MockHttpServletResponse response = new MockHttpServletResponse();

        UserDetails userDetails = new User("admin@test.com", "pass", Collections.emptyList());

        when(jwtTokenProvider.validateToken("valid-header-jwt")).thenReturn(true);
        when(jwtTokenProvider.isQrAttendanceToken("valid-header-jwt")).thenReturn(false);
        when(redisTemplate.hasKey("blacklist:valid-header-jwt")).thenReturn(false);
        when(jwtTokenProvider.getEmailFromToken("valid-header-jwt")).thenReturn("admin@test.com");
        when(customUserDetailsService.loadUserByUsername("admin@test.com")).thenReturn(userDetails);

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("admin@test.com", SecurityContextHolder.getContext().getAuthentication().getName());
        verify(filterChain).doFilter(request, response);
    }
}
