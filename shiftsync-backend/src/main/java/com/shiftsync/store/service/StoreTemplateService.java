package com.shiftsync.store.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.layout.entity.StoreLayout;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.entity.Workstation;
import com.shiftsync.layout.enums.SpatialType;
import com.shiftsync.layout.repository.StoreLayoutRepository;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.layout.repository.WorkstationRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.dto.StoreTemplateDto;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.entity.StoreTemplate;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.store.repository.StoreTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StoreTemplateService {

    private final StoreTemplateRepository storeTemplateRepository;
    private final StoreRepository storeRepository;
    private final StoreLayoutRepository storeLayoutRepository;
    private final StoreZoneRepository storeZoneRepository;
    private final WorkstationRepository workstationRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<StoreTemplateDto> getAllTemplates() {
        return storeTemplateRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StoreTemplateDto getTemplateById(UUID templateId) {
        StoreTemplate template = storeTemplateRepository.findById(templateId)
                .orElseThrow(() -> new BusinessException("Store template not found", HttpStatus.NOT_FOUND));
        return toDto(template);
    }

    @Transactional
    public void applyTemplateToStore(UUID storeId, UUID templateId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));
        StoreTemplate template = storeTemplateRepository.findById(templateId)
                .orElseThrow(() -> new BusinessException("Store template not found", HttpStatus.NOT_FOUND));

        try {
            JsonNode root = objectMapper.readTree(template.getTemplateData());

            // 1. Update Store Category & Format
            store.setCategory(template.getCategory());
            store.setFormat(template.getFormat());
            storeRepository.save(store);

            // 2. Set or Update Layout Dimensions
            JsonNode layoutNode = root.get("layout");
            if (layoutNode != null) {
                StoreLayout layout = storeLayoutRepository.findByStoreId(storeId).orElse(new StoreLayout());
                layout.setStore(store);
                layout.setLength(layoutNode.has("length") ? layoutNode.get("length").asDouble() : 24.0);
                layout.setWidth(layoutNode.has("width") ? layoutNode.get("width").asDouble() : 16.0);
                layout.setHeight(layoutNode.has("height") ? layoutNode.get("height").asDouble() : 5.0);
                storeLayoutRepository.save(layout);
            }

            // 3. Clear existing template-bound workstations & zones if desired, or append
            // We append non-duplicate zones by name
            Map<String, StoreZone> createdZonesMap = new HashMap<>();
            JsonNode zonesNode = root.get("zones");
            if (zonesNode != null && zonesNode.isArray()) {
                for (JsonNode zn : zonesNode) {
                    String name = zn.get("name").asText();
                    String code = zn.has("code") ? zn.get("code").asText() : null;
                    SpatialType type = SpatialType.ZONE;
                    if (zn.has("zoneType")) {
                        try {
                            type = SpatialType.valueOf(zn.get("zoneType").asText());
                        } catch (Exception ignored) {}
                    }
                    double x = zn.has("x") ? zn.get("x").asDouble() : 0.0;
                    double y = zn.has("y") ? zn.get("y").asDouble() : 0.0;
                    double z = zn.has("z") ? zn.get("z").asDouble() : 0.0;
                    int capacity = zn.has("capacity") ? zn.get("capacity").asInt() : 4;
                    String color = zn.has("color") ? zn.get("color").asText() : null;

                    StoreZone zone = StoreZone.builder()
                            .store(store)
                            .name(name)
                            .code(code)
                            .zoneType(type)
                            .x(x)
                            .y(y)
                            .z(z)
                            .capacity(capacity)
                            .color(color)
                            .widthDim(3.0)
                            .lengthDim(4.0)
                            .heightDim(2.8)
                            .build();

                    zone = storeZoneRepository.save(zone);
                    createdZonesMap.put(name, zone);
                }
            }

            // 4. Create Workstations
            JsonNode wsNode = root.get("workstations");
            if (wsNode != null && wsNode.isArray()) {
                for (JsonNode wn : wsNode) {
                    String name = wn.get("name").asText();
                    String code = wn.has("code") ? wn.get("code").asText() : null;
                    String wsType = wn.has("workstationType") ? wn.get("workstationType").asText() : "GENERIC_COUNTER";
                    String zoneName = wn.has("zoneName") ? wn.get("zoneName").asText() : null;
                    StoreZone zone = zoneName != null ? createdZonesMap.get(zoneName) : null;
                    double x = wn.has("x") ? wn.get("x").asDouble() : 0.0;
                    double y = wn.has("y") ? wn.get("y").asDouble() : 0.0;
                    double z = wn.has("z") ? wn.get("z").asDouble() : 0.0;
                    int capacity = wn.has("capacity") ? wn.get("capacity").asInt() : 1;

                    Workstation ws = Workstation.builder()
                            .store(store)
                            .zone(zone)
                            .name(name)
                            .code(code)
                            .workstationType(wsType)
                            .x(x)
                            .y(y)
                            .z(z)
                            .capacity(capacity)
                            .isActive(true)
                            .build();

                    workstationRepository.save(ws);
                }
            }

            log.info("Applied template {} ({}) to store {}", template.getName(), template.getFormat(), storeId);
        } catch (Exception e) {
            log.error("Failed to parse and apply store template", e);
            throw new BusinessException("Failed to apply template: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private StoreTemplateDto toDto(StoreTemplate t) {
        return StoreTemplateDto.builder()
                .id(t.getId())
                .name(t.getName())
                .category(t.getCategory())
                .format(t.getFormat())
                .description(t.getDescription())
                .templateData(t.getTemplateData())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
