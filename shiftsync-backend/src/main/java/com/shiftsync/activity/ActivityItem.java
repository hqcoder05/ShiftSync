package com.shiftsync.activity;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record ActivityItem(String id, String type, String title, String description,
        @JsonFormat(shape = JsonFormat.Shape.STRING) OffsetDateTime occurredAt,
        UUID storeId, String storeName, UUID entityId, String targetScreen, Map<String, Object> metadata) { }
