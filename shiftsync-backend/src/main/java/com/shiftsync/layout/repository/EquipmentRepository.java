package com.shiftsync.layout.repository;
import com.shiftsync.layout.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface EquipmentRepository extends JpaRepository<Equipment, UUID> {
 List<Equipment> findByWorkstationIdOrderByCodeAsc(UUID workstationId);
 boolean existsByWorkstationIdAndCodeAndIdNot(UUID workstationId, String code, UUID id);
}
