package com.shiftsync.layout.dto;

import com.shiftsync.layout.enums.SpatialType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateZoneRequest {
    private String name;
    private String code;
    private SpatialType zoneType;
    private UUID parentZoneId;
    private String color;
    private String description;
    private Double x;
    private Double y;
    private Double z;
    private Double widthDim;
    private Double lengthDim;
    private Double heightDim;
    private Integer capacity;
}
