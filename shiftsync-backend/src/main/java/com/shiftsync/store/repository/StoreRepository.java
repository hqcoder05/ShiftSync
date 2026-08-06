package com.shiftsync.store.repository;

import com.shiftsync.store.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StoreRepository extends JpaRepository<Store, UUID> {
    @Query(value = "SELECT EXISTS (" +
                   "SELECT 1 FROM employment WHERE store_id = :storeId " +
                   "UNION ALL " +
                   "SELECT 1 FROM shift WHERE store_id = :storeId " +
                   "UNION ALL " +
                   "SELECT 1 FROM payroll_period WHERE store_id = :storeId " +
                   "UNION ALL " +
                   "SELECT 1 FROM skill WHERE store_id = :storeId " +
                   "UNION ALL " +
                   "SELECT 1 FROM shift_template WHERE store_id = :storeId " +
                   "UNION ALL " +
                   "SELECT 1 FROM store_configuration WHERE store_id = :storeId " +
                   "UNION ALL " +
                   "SELECT 1 FROM scheduler_configuration WHERE store_id = :storeId" +
                   ")", nativeQuery = true)
    boolean hasRelatedRecords(@Param("storeId") UUID storeId);
}
