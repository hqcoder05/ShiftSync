package com.shiftsync.notification.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class RegisterTokenRequestTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    public void testDeserializeWithFcmToken() throws Exception {
        String json = "{\"fcmToken\":\"fcm_sample_token_123\",\"deviceType\":\"android\"}";
        RegisterTokenRequest req = objectMapper.readValue(json, RegisterTokenRequest.class);
        assertEquals("fcm_sample_token_123", req.getFcmToken());
        assertEquals("android", req.getDeviceType());
    }

    @Test
    public void testDeserializeWithTokenAlias() throws Exception {
        String json = "{\"token\":\"generic_token_456\",\"deviceType\":\"web\"}";
        RegisterTokenRequest req = objectMapper.readValue(json, RegisterTokenRequest.class);
        assertEquals("generic_token_456", req.getFcmToken());
        assertEquals("web", req.getDeviceType());
    }
}