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
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT EXISTS (
              SELECT 1 FROM payroll_effective_revision r
              WHERE r.entity_type='employment' AND r.values_json->>'contractTypeId'=CAST(:contractId AS text)
              UNION ALL
              SELECT 1 FROM payroll_input_history h
              WHERE h.entity_type='employment' AND
                (h.old_values->>'contract_type_id'=CAST(:contractId AS text)
                 OR h.new_values->>'contract_type_id'=CAST(:contractId AS text))
            )
            """, nativeQuery = true)
    boolean hasHistoricalEmploymentReference(@org.springframework.data.repository.query.Param("contractId") UUID contractId);
}
