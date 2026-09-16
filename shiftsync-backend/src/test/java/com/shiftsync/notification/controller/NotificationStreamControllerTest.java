package com.shiftsync.notification.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.notification.repository.UserDeviceTokenRepository;
import com.shiftsync.notification.service.NotificationPreferenceService;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.notification.service.SseEmitterService;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.SystemRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class NotificationStreamControllerTest {

    @Mock
    private UserDeviceTokenRepository userDeviceTokenRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private NotificationPreferenceService preferenceService;
    @Mock
    private SseEmitterService sseEmitterService;

    @InjectMocks
    private NotificationController controller;

    private MockMvc mockMvc;
    private CustomUserDetails userDetails;
    private UUID userId;

    @BeforeEach
    public void setUp() {
        userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("test@example.com")
                .systemRole(SystemRole.STAFF)
                .build();
        userDetails = new CustomUserDetails(user);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new org.springframework.web.method.support.HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
                        return parameter.getParameterType().equals(CustomUserDetails.class);
                    }

                    @Override
                    public Object resolveArgument(org.springframework.core.MethodParameter parameter,
                                                  org.springframework.web.method.support.ModelAndViewContainer mavContainer,
                                                  org.springframework.web.context.request.NativeWebRequest webRequest,
                                                  org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                        return userDetails;
                    }
                })
                .build();
    }

    @Test
    public void testStreamNotifications_ReturnsTextEventStream() throws Exception {
        SseEmitter emitter = new SseEmitter();
        when(sseEmitterService.subscribe(eq(userId))).thenReturn(emitter);

        mockMvc.perform(get("/api/users/me/notifications/stream")
                        .accept(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM));
    }
}