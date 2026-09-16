package com.shiftsync.notification.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class SseEmitterServiceTest {

    private SseEmitterService service;

    @BeforeEach
    public void setUp() {
        service = new SseEmitterService();
    }

    @Test
    public void testSubscribe_RegistersEmitter() {
        UUID userId = UUID.randomUUID();
        SseEmitter emitter = service.subscribe(userId);

        assertNotNull(emitter);
        assertEquals(1, service.getActiveEmitterCount(userId));
        assertEquals(1, service.getTotalActiveUsers());
    }

    @Test
    public void testSubscribe_MultipleTabsForSameUser() {
        UUID userId = UUID.randomUUID();
        SseEmitter emitter1 = service.subscribe(userId);
        SseEmitter emitter2 = service.subscribe(userId);

        assertNotNull(emitter1);
        assertNotNull(emitter2);
        assertEquals(2, service.getActiveEmitterCount(userId));
        assertEquals(1, service.getTotalActiveUsers());
    }

    @Test
    public void testPushToUser_WhenNoEmitters_DoesNotThrow() {
        UUID userId = UUID.randomUUID();
        assertDoesNotThrow(() -> service.pushToUser(userId, Map.of("message", "hello")));
    }

    @Test
    public void testPushToUser_SendsSuccessfully() {
        UUID user1 = UUID.randomUUID();
        UUID user2 = UUID.randomUUID();

        service.subscribe(user1);
        service.subscribe(user2);

        assertDoesNotThrow(() -> service.pushToUser(user1, Map.of("title", "Test Title")));
        assertEquals(1, service.getActiveEmitterCount(user1));
        assertEquals(1, service.getActiveEmitterCount(user2));
    }

    @Test
    public void testRemoveEmitter_CleansUpMap() {
        UUID userId = UUID.randomUUID();
        SseEmitter emitter = service.subscribe(userId);

        assertEquals(1, service.getActiveEmitterCount(userId));

        service.removeEmitter(userId, emitter);

        assertEquals(0, service.getActiveEmitterCount(userId));
        assertEquals(0, service.getTotalActiveUsers());
    }

    @Test
    public void testHeartbeat_RunsWithoutErrors() {
        UUID user1 = UUID.randomUUID();
        UUID user2 = UUID.randomUUID();

        service.subscribe(user1);
        service.subscribe(user2);

        assertDoesNotThrow(() -> service.sendHeartbeat());
        assertEquals(1, service.getActiveEmitterCount(user1));
        assertEquals(1, service.getActiveEmitterCount(user2));
    }

    @Test
    public void testPushToUser_DeadEmitterIsRemoved() {
        UUID userId = UUID.randomUUID();
        SseEmitter emitter = service.subscribe(userId);
        assertEquals(1, service.getActiveEmitterCount(userId));

        // Complete the emitter to simulate a closed connection
        emitter.complete();

        // Pushing to the completed emitter should catch IllegalStateException/IOException and remove it
        service.pushToUser(userId, Map.of("data", "test"));

        assertEquals(0, service.getActiveEmitterCount(userId));
    }
}