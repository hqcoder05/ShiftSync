package com.shiftsync.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QrScanRequestDTO {
    @NotBlank(message = "QR Token is required")
    private String qrToken;

    @NotNull(message = "Latitude is required for geofencing")
    private Double latitude;

    @NotNull(message = "Longitude is required for geofencing")
    private Double longitude;
}
