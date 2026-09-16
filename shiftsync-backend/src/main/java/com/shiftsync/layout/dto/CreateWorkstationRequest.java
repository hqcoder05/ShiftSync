package com.shiftsync.layout.dto;

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
public class CreateWorkstationRequest {
    private UUID zoneId;

    @NotBlank(message = "Workstation name is required")
    private String name;
    private String code;
    private String workstationType;

    @NotNull(message = "X coordinate is required")
    private Double x;

    @NotNull(message = "Y coordinate is required")
    private Double y;

    @NotNull(message = "Z coordinate is required")
    private Double z;

    private Integer capacity;
    private Boolean isActive;
}
