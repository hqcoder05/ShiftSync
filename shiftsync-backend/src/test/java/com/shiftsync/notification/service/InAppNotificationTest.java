package com.shiftsync.notification.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.notification.dto.InAppNotificationDTO;
import com.shiftsync.notification.entity.Notification;
import com.shiftsync.notification.repository.NotificationPreferenceRepository;
import com.shiftsync.notification.repository.NotificationRepository;
import com.shiftsync.notification.repository.UserDeviceTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class InAppNotificationTest {

    @Mock
    private UserDeviceTokenRepository userDeviceTokenRepository;
    @Mock
    private NotificationPreferenceRepository preferenceRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SseEmitterService sseEmitterService;

    @InjectMocks
    private NotificationService notificationService;

    private User testUser;
    private UUID userId;

    @BeforeEach
    public void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .fullName("Test Employee")
                .email("employee@test.com")
                .build();
    }

    @Test
    public void testCreateInAppNotification() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            n.setId(UUID.randomUUID());
            n.setCreatedAt(OffsetDateTime.now());
            return n;
        });

        InAppNotificationDTO dto = notificationService.createInAppNotification(userId, "SHIFT_ASSIGNED", "New Shift", "You have been assigned to Morning Shift");

        assertNotNull(dto);
        assertEquals("SHIFT_ASSIGNED", dto.getType());
        assertEquals("New Shift", dto.getTitle());
        assertEquals("You have been assigned to Morning Shift", dto.getMessage());
        assertFalse(dto.isRead());
    }

    @Test
    public void testGetUserNotificationsAndUnreadCount() {
        Notification n1 = Notification.builder()
                .id(UUID.randomUUID())
                .staff(testUser)
                .type("SHIFT_ASSIGNED")
                .title("New Shift")
                .isRead(false)
                .build();

        when(notificationRepository.findByStaffIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(n1));
        when(notificationRepository.countByStaffIdAndIsReadFalse(userId)).thenReturn(1L);

        List<InAppNotificationDTO> list = notificationService.getUserNotifications(userId);
        long unread = notificationService.getUnreadCount(userId);

        assertEquals(1, list.size());
        assertEquals("New Shift", list.get(0).getTitle());
        assertEquals(1L, unread);
    }

    @Test
    public void testMarkAsRead_Success() {
        UUID notifId = UUID.randomUUID();
        Notification n = Notification.builder()
                .id(notifId)
                .staff(testUser)
                .type("SHIFT_ASSIGNED")
                .title("New Shift")
                .isRead(false)
                .build();

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InAppNotificationDTO result = notificationService.markAsRead(userId, notifId);

        assertTrue(result.isRead());
    }

    @Test
    public void testMarkAsRead_OtherUser_ThrowsAccessDenied() {
        UUID notifId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        Notification n = Notification.builder()
                .id(notifId)
                .staff(testUser)
                .type("SHIFT_ASSIGNED")
                .title("New Shift")
                .isRead(false)
                .build();

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));

        assertThrows(AccessDeniedException.class, () -> {
            notificationService.markAsRead(otherUserId, notifId);
        });
    }

    @Test
    public void testMarkAllAsRead() {
        notificationService.markAllAsRead(userId);
        verify(notificationRepository, times(1)).markAllAsRead(userId);
    }
}