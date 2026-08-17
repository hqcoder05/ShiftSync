package com.shiftsync.store.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Data Transfer Object representing Store information")
public class StoreDTO {

    @Schema(description = "Store unique identifier (UUID)", example = "a702b528-b0fb-486d-8da4-ef7fb2d8a610")
    private UUID id;

    @Schema(description = "Name of the store branch", example = "Coffee Shop A")
    private String name;

    @Schema(description = "Physical address of the store branch", example = "123 Main St")
    private String address;

    @Schema(description = "Geographic latitude coordinate", example = "10.762622")
    private BigDecimal latitude;

    @Schema(description = "Geographic longitude coordinate", example = "106.660172")
    private BigDecimal longitude;

    @Schema(description = "Store branch daily opening time", example = "08:00:00")
    private LocalTime openTime;

    @Schema(description = "Store branch daily closing time", example = "22:00:00")
    private LocalTime closeTime;

    @Schema(description = "Store creation date-time", example = "2026-08-04T10:00:00+07:00")
    private OffsetDateTime createdAt;
}
