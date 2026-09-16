package com.shiftsync.layout.dto;

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
public class WorkstationDto {
    private UUID id;
    private UUID storeId;
    private UUID zoneId;
    private String zoneName;
    private String name;
    private String code;
    private String workstationType;
    private Double x;
    private Double y;
    private Double z;
    private Integer capacity;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
