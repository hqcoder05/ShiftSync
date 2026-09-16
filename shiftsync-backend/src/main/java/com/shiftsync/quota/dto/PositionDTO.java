package com.shiftsync.quota.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionDTO {
    private UUID id;
    private String name;
    private String code;
    private String description;
    private long hourlyRate;
    private String color;
    private String icon;
    private int defaultMin;
    private int defaultTarget;
    private int defaultMax;
    private String shiftScope; // "ALL" or "PEAK_ONLY"
}
