package com.shiftsync.employment.repository;

import com.shiftsync.employment.entity.ContractType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContractTypeRepository extends JpaRepository<ContractType, UUID> {
    List<ContractType> findByStoreId(UUID storeId);
    Optional<ContractType> findByIdAndStoreId(UUID id, UUID storeId);
    boolean existsByNameAndStoreId(String name, UUID storeId);
}
