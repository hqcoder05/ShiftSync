package com.shiftsync.store.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for updating a store branch")
public class StoreUpdateRequest {

    @NotBlank(message = "Store name is required")
    @Schema(description = "Name of the store branch", example = "Coffee Shop A Updated")
    private String name;

    @Schema(description = "Physical address of the store branch", example = "123 Main St Updated")
    private String address;

    @Schema(description = "Geographic latitude coordinate", example = "10.762622")
    private BigDecimal latitude;

    @Schema(description = "Geographic longitude coordinate", example = "106.660172")
    private BigDecimal longitude;

    @Schema(description = "Store branch daily opening time", example = "08:00:00")
    private LocalTime openTime;

    @Schema(description = "Store branch daily closing time", example = "22:00:00")
    private LocalTime closeTime;
}
