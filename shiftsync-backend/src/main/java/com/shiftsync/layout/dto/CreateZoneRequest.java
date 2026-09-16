package com.shiftsync.layout.dto;

import com.shiftsync.layout.enums.SpatialType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateZoneRequest {
    @NotBlank(message = "Zone name is required")
    private String name;
    private String code;
    private SpatialType zoneType;
    private UUID parentZoneId;
    private String color;
    private String description;

    @NotNull(message = "X coordinate is required")
    private Double x;

    @NotNull(message = "Y coordinate is required")
    private Double y;

    @NotNull(message = "Z coordinate is required")
    private Double z;

    private Double widthDim;
    private Double lengthDim;
    private Double heightDim;

    @NotNull(message = "Capacity is required")
    private Integer capacity;
}
