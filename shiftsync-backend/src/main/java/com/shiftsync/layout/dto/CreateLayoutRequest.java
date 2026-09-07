package com.shiftsync.layout.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CreateLayoutRequest {
    @NotNull
    @Positive
    private Double length;

    @NotNull
    @Positive
    private Double width;

    @NotNull
    @Positive
    private Double height;
}
