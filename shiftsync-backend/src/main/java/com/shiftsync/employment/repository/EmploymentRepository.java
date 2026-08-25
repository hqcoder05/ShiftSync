package com.shiftsync.employment.repository;

import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface EmploymentRepository extends JpaRepository<Employment, UUID> {

    List<Employment> findByUserIdAndStatus(UUID staffId, EmploymentStatus status);

    List<Employment> findByUserIdAndStoreIdAndStatus(UUID userId, UUID storeId, EmploymentStatus status);

    Page<Employment> findByStoreIdAndStatus(UUID storeId, EmploymentStatus status, Pageable pageable);

    List<Employment> findByStoreIdAndStatus(UUID storeId, EmploymentStatus status);

    long countByStoreIdAndStatus(UUID storeId, EmploymentStatus status);

    boolean existsByUserIdAndStoreIdAndStatus(UUID staffId, UUID storeId, EmploymentStatus status);

    @Query("SELECT COUNT(e) > 0 FROM Employment e " +
           "WHERE e.user.id = :staffId AND e.store.id = :storeId " +
           "AND e.status = :status")
    boolean isStaffInStore(@Param("staffId") UUID staffId, @Param("storeId") UUID storeId, @Param("status") EmploymentStatus status);
}
