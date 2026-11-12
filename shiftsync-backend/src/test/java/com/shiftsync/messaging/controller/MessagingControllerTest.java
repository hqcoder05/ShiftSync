package com.shiftsync.messaging.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MessagingControllerTest {
    @Test void messagingEventIsSentOnlyAfterCommit() {
        var db = mock(EntityManager.class);
        var query = mock(jakarta.persistence.Query.class);
        var events = mock(com.shiftsync.notification.service.SseEmitterService.class);
        UUID thread = UUID.randomUUID(), first = UUID.randomUUID(), second = UUID.randomUUID();
        when(db.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(java.util.Collections.singletonList(new Object[]{first,second}));
        var controller = new MessagingController(mock(UserRepository.class), mock(EmploymentRepository.class), db);
        org.springframework.test.util.ReflectionTestUtils.setField(controller,"events",events);
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        try {
            org.springframework.test.util.ReflectionTestUtils.invokeMethod(controller,"notifyThread",thread);
            verifyNoInteractions(events);
            org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCommit());
            verify(events).pushEvent(eq(first),eq("messaging"),any());
            verify(events).pushEvent(eq(second),eq("messaging"),any());
        } finally { org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization(); }
        clearInvocations(events);
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        try {
            org.springframework.test.util.ReflectionTestUtils.invokeMethod(controller,"notifyThread",thread);
            org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(1));
            verifyNoInteractions(events);
        } finally { org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization(); }
    }
    @Test void staffCannotPublishAnAnnouncement() {
        var users = mock(UserRepository.class); var employments = mock(EmploymentRepository.class);
        var db = mock(EntityManager.class); var auth = mock(Authentication.class);
        UUID userId = UUID.randomUUID(), storeId = UUID.randomUUID();
        when(auth.getName()).thenReturn("staff@example.test");
        when(users.findByEmail("staff@example.test")).thenReturn(Optional.of(User.builder().id(userId).systemRole(SystemRole.STAFF).build()));
        when(employments.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        var error = assertThrows(BusinessException.class, () -> new MessagingController(users, employments, db)
                .publish(storeId, new MessagingController.AnnouncementInput("Tin", "Nội dung"), auth));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(db);
    }

    @Test void cannotMessageRecipientOutsideStore() {
        var users = mock(UserRepository.class); var employments = mock(EmploymentRepository.class);
        var db = mock(EntityManager.class); var auth = mock(Authentication.class);
        UUID userId = UUID.randomUUID(), storeId = UUID.randomUUID(), recipientId = UUID.randomUUID();
        when(auth.getName()).thenReturn("staff@example.test");
        when(users.findByEmail("staff@example.test")).thenReturn(Optional.of(User.builder().id(userId).systemRole(SystemRole.STAFF).build()));
        when(employments.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        var error = assertThrows(BusinessException.class, () -> new MessagingController(users, employments, db)
                .createThread(storeId, new MessagingController.CreateThread(recipientId), auth));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(db);
    }
}
