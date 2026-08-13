package com.shiftsync.store.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
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

    @NotBlank(message = "Store address is required")
    @Schema(description = "Physical address of the store branch", example = "123 Main St Updated")
    private String address;

    @NotNull(message = "Latitude is required")
    @Min(value = -90, message = "Latitude must be between -90 and 90")
    @Max(value = 90, message = "Latitude must be between -90 and 90")
    @Schema(description = "Geographic latitude coordinate", example = "10.762622")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @Min(value = -180, message = "Longitude must be between -180 and 180")
    @Max(value = 180, message = "Longitude must be between -180 and 180")
    @Schema(description = "Geographic longitude coordinate", example = "106.660172")
    private BigDecimal longitude;

    @NotNull(message = "Opening time is required")
    @Schema(description = "Store branch daily opening time", example = "08:00:00")
    private LocalTime openTime;

    @NotNull(message = "Closing time is required")
    @Schema(description = "Store branch daily closing time", example = "22:00:00")
    private LocalTime closeTime;
}
