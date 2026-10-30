package com.shiftsync.shared.websocket;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.Map;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class RealtimeEventPublisherTest {
    private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    private final RealtimeEventPublisher publisher = new RealtimeEventPublisher(messaging);

    @AfterEach void cleanup() { TransactionSynchronizationManager.clear(); }

    @Test void publishesOnlyAfterCommit() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        UUID store = UUID.randomUUID();
        publisher.publishStoreEvent(store, "attendance", Map.of("action", "CHECK_IN"));
        verifyNoInteractions(messaging);
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCommit());
        verify(messaging).convertAndSend(eq("/topic/store/" + store + "/attendance"), any(Object.class));
        verify(messaging, never()).convertAndSend(eq("/topic/attendance"), any(Object.class));
        verifyNoMoreInteractions(messaging);
    }

    @Test void rollbackDoesNotBroadcast() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        publisher.publishStoreEvent(UUID.randomUUID(), "shifts", "SHIFT_CANCELLED", Map.of());
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(1));
        verifyNoInteractions(messaging);
    }
}
