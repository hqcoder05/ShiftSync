package com.shiftsync.layout.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreZoneDto {
    private UUID id;
    private UUID storeId;
    private String name;
    private Double x;
    private Double y;
    private Double z;
    private Integer capacity;
}
