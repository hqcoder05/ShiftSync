package com.shiftsync.layout.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CreateZoneRequest {
    @NotBlank
    private String name;

    @NotNull
    private Double x;

    @NotNull
    private Double y;

    @NotNull
    private Double z;

    @NotNull
    @Positive
    private Integer capacity;
}
