package com.shiftsync.layout.dto;
import com.shiftsync.layout.entity.Equipment.Status;
import jakarta.validation.constraints.*;
public record EquipmentRequest(
 @NotBlank @Size(max=150) String name,
 @NotBlank @Size(max=50) String code,
 @NotBlank @Size(max=80) String type,
 @NotNull Status status,
 @Size(max=1000) String notes) {}
