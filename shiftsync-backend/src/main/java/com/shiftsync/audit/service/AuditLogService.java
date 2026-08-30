package com.shiftsync.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.shiftsync.audit.entity.AuditLog;
import com.shiftsync.audit.repository.AuditLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Async
    public void log(UUID actorId, String action, String entityType, UUID entityId, Object beforeData, Object afterData) {
        try {
            JsonNode beforeNode = beforeData != null ? objectMapper.valueToTree(beforeData) : null;
            JsonNode afterNode = afterData != null ? objectMapper.valueToTree(afterData) : null;

            AuditLog auditLog = AuditLog.builder()
                    .actorStaffId(actorId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .beforeData(beforeNode)
                    .afterData(afterNode)
                    .build();

            auditLogRepository.save(auditLog);
            log.debug("Saved audit log: {} on {} (ID: {})", action, entityType, entityId);
        } catch (Exception e) {
            log.error("Failed to save audit log for action: {} on entity: {}. Error: {}", action, entityType, e.getMessage(), e);
        }
    }
}
