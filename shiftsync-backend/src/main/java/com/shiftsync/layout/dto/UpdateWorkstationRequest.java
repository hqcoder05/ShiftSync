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
public class UpdateWorkstationRequest {
    private UUID zoneId;
    private String name;
    private String code;
    private String workstationType;
    private Double x;
    private Double y;
    private Double z;
    private Integer capacity;
    private Boolean isActive;
}
