package com.shiftsync.shift.repository;

import com.shiftsync.shift.entity.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, UUID> {
    List<ShiftTemplate> findByStoreId(UUID storeId);
    
    Optional<ShiftTemplate> findByIdAndStoreId(UUID id, UUID storeId);
    
    boolean existsByStoreIdAndName(UUID storeId, String name);
    
    boolean existsByStoreIdAndNameAndIdNot(UUID storeId, String name, UUID id);
}
