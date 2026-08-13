package com.shiftsync.notification.dto;

import lombok.Data;
import java.util.Map;

@Data
public class TestNotificationRequest {
    private String title;
    private String body;
    private Map<String, String> data;
}
