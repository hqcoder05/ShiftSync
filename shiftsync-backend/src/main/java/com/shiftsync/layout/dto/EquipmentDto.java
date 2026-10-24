package com.shiftsync.layout.dto;
import com.shiftsync.layout.entity.Equipment;
import java.util.UUID;
public record EquipmentDto(UUID id, UUID workstationId, String name, String code,
 String type, Equipment.Status status, String notes) {
 public static EquipmentDto from(Equipment e) {
  return new EquipmentDto(e.getId(), e.getWorkstation().getId(), e.getName(), e.getCode(), e.getType(), e.getStatus(), e.getNotes());
 }
}
