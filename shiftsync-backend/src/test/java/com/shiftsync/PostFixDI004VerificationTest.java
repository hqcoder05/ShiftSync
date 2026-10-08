package com.shiftsync;

import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.websocket.RealtimeEventPublisher;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import java.util.UUID;
import com.shiftsync.notification.entity.NotificationType;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("test")
public class PostFixDI004VerificationTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private RealtimeEventPublisher realtimeEventPublisher;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    public void testDI004_TransactionRollback() throws InterruptedException {
        User user = User.builder()
                .email("testdi004_rollback" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Test User")
                .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                .build();
        final User finalUser = userRepository.save(user);

        // TEST 1 - ROLLBACK
        TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());
        notificationService.sendNotification(finalUser.getId(), NotificationType.SHIFT_REMINDER, "Rollback", "Rollback", null);
        
        // Simulating error that forces rollback
        transactionManager.rollback(status);

        // Wait to ensure async callback (which shouldn't fire) is given time
        Thread.sleep(1000);

        // Verify WebSocket side effect count = 0
        verify(realtimeEventPublisher, times(0)).publishNotification(any(), any());
    }

    @Test
    public void testDI004_SuccessfulCommit() throws InterruptedException {
        User user = User.builder()
                .email("testdi004_commit" + UUID.randomUUID() + "@test.com")
                .passwordHash("hash")
                .fullName("Test User")
                .systemRole(com.shiftsync.shared.security.SystemRole.STAFF)
                .build();
        final User finalUser = userRepository.save(user);

        // TEST 2 - COMMIT
        TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());
        notificationService.sendNotification(finalUser.getId(), NotificationType.SHIFT_REMINDER, "Commit", "Commit", null);
        
        // Simulating successful commit
        transactionManager.commit(status);

        // Wait to ensure async callback fires
        Thread.sleep(1000);

        // Verify WebSocket side effect count = 1
        verify(realtimeEventPublisher, times(1)).publishNotification(any(), any());
    }
}
