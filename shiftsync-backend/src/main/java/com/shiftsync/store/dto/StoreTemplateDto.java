package com.shiftsync.store.dto;

import com.shiftsync.store.enums.StoreCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreTemplateDto {
    private UUID id;
    private String name;
    private StoreCategory category;
    private String format;
    private String description;
    private String templateData;
    private OffsetDateTime createdAt;
}
