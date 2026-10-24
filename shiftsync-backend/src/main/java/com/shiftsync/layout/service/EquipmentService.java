package com.shiftsync.layout.service;
import com.shiftsync.layout.dto.*;
import com.shiftsync.layout.entity.*;
import com.shiftsync.layout.repository.*;
import com.shiftsync.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor @Transactional
public class EquipmentService {
 private final WorkstationRepository workstations;
 private final EquipmentRepository equipment;
 private Workstation requireWorkstation(UUID storeId, UUID workstationId) {
  Workstation ws = workstations.findById(workstationId).orElseThrow(() -> new BusinessException("Workstation not found", HttpStatus.NOT_FOUND));
  if (!ws.getStore().getId().equals(storeId)) throw new BusinessException("Workstation belongs to another store", HttpStatus.FORBIDDEN);
  return ws;
 }
 @Transactional(readOnly=true)
 public List<EquipmentDto> list(UUID storeId, UUID workstationId) {
  requireWorkstation(storeId, workstationId);
  return equipment.findByWorkstationIdOrderByCodeAsc(workstationId).stream().map(EquipmentDto::from).toList();
 }
 public EquipmentDto save(UUID storeId, UUID workstationId, UUID id, EquipmentRequest request) {
  Workstation ws = requireWorkstation(storeId, workstationId);
  Equipment e = id == null ? new Equipment() : equipment.findById(id).orElseThrow(() -> new BusinessException("Equipment not found", HttpStatus.NOT_FOUND));
  if (id != null && !e.getWorkstation().getId().equals(workstationId)) throw new BusinessException("Equipment belongs to another workstation", HttpStatus.FORBIDDEN);
  UUID exclude = id == null ? new UUID(0, 0) : id;
  if (equipment.existsByWorkstationIdAndCodeAndIdNot(workstationId, request.code().trim(), exclude)) throw new BusinessException("Equipment code already exists", HttpStatus.CONFLICT);
  e.setWorkstation(ws); e.setName(request.name().trim()); e.setCode(request.code().trim());
  e.setType(request.type().trim()); e.setStatus(request.status()); e.setNotes(request.notes());
  return EquipmentDto.from(equipment.saveAndFlush(e));
 }
}
