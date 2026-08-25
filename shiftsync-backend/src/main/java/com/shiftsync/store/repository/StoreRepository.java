package com.shiftsync.store.repository;

import com.shiftsync.store.entity.Store;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface StoreRepository extends JpaRepository<Store, UUID> {
    @Query(value = "SELECT EXISTS (SELECT 1 FROM employment WHERE store_id = :storeId AND status = 'ACTIVE')", nativeQuery = true)
    boolean hasActiveEmployees(@Param("storeId") UUID storeId);

    @Query(value = "SELECT EXISTS (" +
            "SELECT 1 FROM shift WHERE store_id = :storeId AND status = 'PUBLISHED' " +
            "AND shift_date >= CURRENT_DATE" +
            ")", nativeQuery = true)
    boolean hasFuturePublishedShifts(@Param("storeId") UUID storeId);

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
