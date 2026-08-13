package com.shiftsync.store.repository;

import com.shiftsync.store.entity.Store;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StoreRepository extends JpaRepository<Store, UUID> {
    @Query(value = "SELECT EXISTS (" +
                   "SELECT 1 FROM employment WHERE store_id = :storeId AND status = 'ACTIVE' " +
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

    @Query("SELECT s FROM Store s WHERE " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.address) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Store> searchStores(@Param("search") String search, Pageable pageable);

    @Query("SELECT e.store FROM Employment e WHERE e.user.id = :staffId AND e.status = :status AND " +
           "(:search IS NULL OR LOWER(e.store.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.store.address) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Store> findStoresByStaffId(@Param("staffId") UUID staffId, 
                                    @Param("status") com.shiftsync.employment.enums.EmploymentStatus status, 
                                    @Param("search") String search, 
                                    Pageable pageable);
}
